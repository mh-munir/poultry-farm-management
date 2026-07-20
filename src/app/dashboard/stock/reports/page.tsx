import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';

function formatQty(value: number | string | { toString(): string } | null | undefined) {
  return Number(value?.toString() ?? 0).toFixed(2);
}

async function getStockWarnings() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [{ productType: 'MEDICINE' }, { productType: 'FEED' }]
    },
    select: {
      id: true,
      name: true,
      code: true,
      unit: true,
      productType: true,
      lowStockThreshold: true,
      stockBalance: { select: { quantityOnHand: true } }
    },
    orderBy: [{ productType: 'asc' }, { name: 'asc' }]
  });

  return {
    medicine: products.filter((product) => product.productType === 'MEDICINE').filter((product) => {
      const quantity = Number(product.stockBalance?.quantityOnHand ?? 0);
      const threshold = Number(product.lowStockThreshold ?? 0);
      return threshold > 0 ? quantity <= threshold : quantity <= 0;
    }),
    feed: products.filter((product) => product.productType === 'FEED').filter((product) => {
      const quantity = Number(product.stockBalance?.quantityOnHand ?? 0);
      const threshold = Number(product.lowStockThreshold ?? 0);
      return threshold > 0 ? quantity <= threshold : quantity <= 0;
    })
  };
}

export default async function StockReportsPage() {
  await requireUser();
  const warnings = await getStockWarnings();

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Stock Reports</h1>
            <p className="mt-2 text-sm text-muted-foreground">Monitor low stock warnings for feeds and medicines.</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <div className="font-medium">Low Stock Items</div>
            <div className="text-primary">{warnings.medicine.length + warnings.feed.length}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Medicine Stock Warnings</h2>
                <p className="text-sm text-muted-foreground">Items at or below the warning threshold.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                {warnings.medicine.length} item(s)
              </span>
            </div>
            {warnings.medicine.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No medicine stock warnings right now.</div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium">Name</th>
                      <th className="px-3 py-3 text-left font-medium">Qty</th>
                      <th className="px-3 py-3 text-left font-medium">Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {warnings.medicine.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.code}</div>
                        </td>
                        <td className="px-3 py-3">{formatQty(item.stockBalance?.quantityOnHand ?? 0)} {item.unit}</td>
                        <td className="px-3 py-3">{formatQty(item.lowStockThreshold ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Feed Stock Warnings</h2>
                <p className="text-sm text-muted-foreground">Items at or below the warning threshold.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                {warnings.feed.length} item(s)
              </span>
            </div>
            {warnings.feed.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No feed stock warnings right now.</div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium">Name</th>
                      <th className="px-3 py-3 text-left font-medium">Qty</th>
                      <th className="px-3 py-3 text-left font-medium">Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {warnings.feed.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.code}</div>
                        </td>
                        <td className="px-3 py-3">{formatQty(item.stockBalance?.quantityOnHand ?? 0)} {item.unit}</td>
                        <td className="px-3 py-3">{formatQty(item.lowStockThreshold ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
