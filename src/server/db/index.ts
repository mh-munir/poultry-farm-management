import { Prisma, PrismaClient } from '@prisma/client';
import { env } from '@/lib/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function normalizeDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;

    params.set('connect_timeout', '10');
    params.set('statement_timeout', '30000');
    params.set('pool_timeout', '30000');
    if (!params.has('connection_limit')) {
      params.set('connection_limit', '5');
    }
    params.set('statement_cache_size', '0');
    params.set('pgbouncer', 'true');

    parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return url;
  }
}

const databaseUrl = normalizeDatabaseUrl(env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['error'] : []
  });

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

export async function dbQuery<T>(query: Promise<T>, timeoutMs = 30000, fallback?: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Database request timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([query, timeout]) as T;
  } catch (error) {
    if (fallback !== undefined && isDatabaseUnavailableError(error)) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[db] Falling back because the database is unavailable: ${error instanceof Error ? error.message : String(error)}`);
      }
      return fallback;
    }
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
