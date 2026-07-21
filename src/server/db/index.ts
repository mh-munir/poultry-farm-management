import { PrismaClient } from '@prisma/client';
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

export async function dbQuery<T>(query: Promise<T>, timeoutMs = 30000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Database request timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([query, timeout]) as Promise<T>;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
