import { Prisma, PrismaClient } from '@prisma/client';
import { env } from '@/lib/env';
import { QueryProfiler } from '@/lib/profiler';

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
  fallback?: T,
  profiler?: QueryProfiler
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
    const duration = Date.now() - start;
    const rows = getRowCount(result);
    try {
      const padding = '.'.repeat(Math.max(1, 32 - name.length));
      console.debug(`[dbQuery] ${name} ${padding} ${duration}ms`);
      console.debug(`  Model: ${model}`);
      console.debug(`  Operation: ${operation}`);
      console.debug(`  Rows: ${rows}`);
    } catch {}
    if (profiler) {
      profiler.record(name, model, operation, rows, duration);
    }
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    try {
      console.debug(`[dbQuery] ${name} failed after ${duration}ms - ${error instanceof Error ? error.message : String(error)}`);
    } catch {}
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

function getRowCount(result: unknown): number {
  if (result === null || result === undefined) return 0;
  if (Array.isArray(result)) return result.length;
  if (typeof result === 'number') return result;
  return 1;
}
