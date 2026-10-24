import 'server-only';
import { Prisma, PrismaClient } from '@prisma/client';
import { env } from '@/lib/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getRuntimeDatabaseUrl(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');

    // Next.js server runtimes should use Supabase's transaction pooler. The
    // session pooler on 5432 can exhaust connections and intermittently make
    // Prisma report P1001/"Can't reach database server".
    if (isSupabasePooler && (url.port === '5432' || url.port === '')) {
      url.port = '6543';
      url.searchParams.set('pgbouncer', 'true');
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function createPrismaClient() {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: getRuntimeDatabaseUrl(env.DATABASE_URL)
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error'] : []
  });

  // Pooler connection failures are transient. Apply the same bounded retry
  // policy to every Prisma operation, including direct calls from server
  // actions that do not go through dbQuery().
  client.$use((params, next) => retryQuery(() => next(params)));
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache the Prisma client for all environments to maximize reuse in serverless
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1003', 'P1017', 'P2024'].includes(error.code);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /Can't reach database server|Server has closed the connection|ECONNRESET|ETIMEDOUT|ConnectionReset|Connection refused|connect ECONN/i.test(message);
}

async function retryQuery<T>(queryFn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isDatabaseUnavailableError(error)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function dbQuery<T>(
  query: Promise<T>,
  name: string,
  model: string,
  operation: string,
  timeoutMs = 30000,
  fallback?: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Database request timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);
  });

  const start = Date.now();

  try {
    const result = (await retryQuery(() => Promise.race([query, timeout]))) as T;
    return result;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[db] Falling back because the database is unavailable: ${error instanceof Error ? error.message : String(error)}`);
      }
      return fallback as T;
    }
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
