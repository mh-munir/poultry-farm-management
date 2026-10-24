import { Prisma } from '@prisma/client';

const INVOICE_PREFIX = 'IBDPFM';

export async function getInvoiceNumber(client: Pick<Prisma.TransactionClient, 'transaction'>): Promise<string> {
  const invoices = await client.transaction.findMany({
    where: { invoiceNumber: { startsWith: INVOICE_PREFIX } },
    select: { invoiceNumber: true }
  });
  const highestSequence = invoices.reduce((highest, transaction) => {
    const match = new RegExp(`^${INVOICE_PREFIX}(\\d+)$`).exec(transaction.invoiceNumber);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `${INVOICE_PREFIX}${String(highestSequence + 1).padStart(2, '0')}`;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
