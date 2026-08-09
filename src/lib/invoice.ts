import { Prisma } from '@prisma/client';

const MAX_RETRIES = 5;

function generateInvoiceNumber(prefix: string): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`;
  const randomPart = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${datePart}-${randomPart}`;
}

export function getInvoiceNumber(prefix: string): string {
  return generateInvoiceNumber(prefix);
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
