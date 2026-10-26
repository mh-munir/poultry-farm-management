import type { Prisma } from '@prisma/client';

export async function getNextProductCode(
  client: Pick<Prisma.TransactionClient, 'product'>,
  productType: string
): Promise<string> {
  const prefix = `${productType}-`;
  const products = await client.product.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true }
  });

  const highestSequence = products.reduce((highest, product) => {
    const suffix = product.code.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) {
      return highest;
    }

    return Math.max(highest, Number(suffix));
  }, 0);

  return `${prefix}${String(highestSequence + 1).padStart(3, '0')}`;
}
