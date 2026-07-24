import type { Decimal } from '@prisma/client/runtime/library';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';

type StockReportProduct = {
  id: number;
  name: string;
  code: string;
  unit: string;
  productType: 'FEED' | 'MEDICINE' | string;
  lowStockThreshold: Decimal | null;
  defaultPurchasePrice: Decimal | null;
  stockBalance: { quantityOnHand: Decimal | null } | null;
};

function formatQty(value: number | string | { toString(): string } | null | undefined) {
  return Number(value?.toString() ?? 0).toFixed(2);
}

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)}`;
}

function buildPieStyle(value: number, total: number, color: string, remainderColor: string) {
  const pct = total > 0 ? Math.round((value / total) * 10000) / 100 : 0;
  const firstStop = pct;
  return {
    background: `conic-gradient(${color} 0% ${firstStop}%, ${remainderColor} ${firstStop}% 100%)`
  };
}

async function getStockReportsData() {
  const products: StockReportProduct[] = await prisma.product.findMany({
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
      defaultPurchasePrice: true,
      stockBalance: { select: { quantityOnHand: true } }
    },
    orderBy: [{ productType: 'asc' }, { name: 'asc' }]
  });

  const feedProducts = products.filter((product) => product.productType === 'FEED');
  const medicineProducts = products.filter((product) => product.productType === 'MEDICINE');

  const feedStockValue = feedProducts.reduce<number>(
    (sum, product) => sum + Number(product.stockBalance?.quantityOnHand ?? 0) * Number(product.defaultPurchasePrice ?? 0),
    0
  );
  const medicineStockValue = medicineProducts.reduce<number>(
    (sum, product) => sum + Number(product.stockBalance?.quantityOnHand ?? 0) * Number(product.defaultPurchasePrice ?? 0),
    0
  );

  const warnings: { medicine: StockReportProduct[]; feed: StockReportProduct[] } = {
    medicine: medicineProducts.filter((product) => {
      const quantity = Number(product.stockBalance?.quantityOnHand ?? 0);
      const threshold = Number(product.lowStockThreshold ?? 0);
      // Show if out of stock (qty = 0) OR if below threshold
      return quantity === 0 || (threshold > 0 && quantity <= threshold) || (threshold <= 0 && quantity <= 0);
    }),
    feed: feedProducts.filter((product) => {
      const quantity = Number(product.stockBalance?.quantityOnHand ?? 0);
      const threshold = Number(product.lowStockThreshold ?? 0);
      // Show if out of stock (qty = 0) OR if below threshold
      return quantity === 0 || (threshold > 0 && quantity <= threshold) || (threshold <= 0 && quantity <= 0);
    })
  };

  const [feedSalesAgg, medicineSalesAgg] = await Promise.all([
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE'
        },
        product: { productType: 'FEED' }
      }
    }),
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE'
        },
        product: { productType: 'MEDICINE' }
      }
    })
  ]);

  return {
    warnings,
    feedStockValue,
    medicineStockValue,
    feedSalesValue: Number(feedSalesAgg._sum.lineTotal ?? 0),
    medicineSalesValue: Number(medicineSalesAgg._sum.lineTotal ?? 0)
  };
}

export default async function StockReportsPage() {
  await requireUser();
  const {
    warnings,
    feedStockValue,
    medicineStockValue,
    feedSalesValue,
    medicineSalesValue
  } = await getStockReportsData();

  const stockValueTotal = feedStockValue + medicineStockValue;
  const salesValueTotal = feedSalesValue + medicineSalesValue;

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Stock Reports</h1>
            <p className="mt-2 text-sm text-muted-foreground">Monitor inventory, low stock warnings, and feed/medicine value performance.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">Low Stock Items</div>
              <div className="text-primary">{warnings.medicine.length + warnings.feed.length}</div>
            </div>
            <div className="flex items-center gap-2">
              <input placeholder="Search products" className="rounded-md border bg-background px-3 py-2 text-sm" />
              <select className="rounded-md border bg-background px-3 py-2 text-sm">
                <option value="all">All types</option>
                <option value="feed">Feed</option>
                <option value="medicine">Medicine</option>
              </select>
              <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Export CSV</button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-gradient-to-br from-white/70 to-slate-50 p-4 shadow">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Feed Performance</h2>
                  <p className="text-sm text-muted-foreground">Feed sales and stock value metrics.</p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">Feed total value</div>
                  <div className="text-primary">{formatCurrency(feedStockValue + feedSalesValue)}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-end">
                <div className="relative h-56 w-56 rounded-full border bg-gradient-to-br from-sky-50 to-emerald-50 shadow-sm" style={buildPieStyle(feedSalesValue, feedStockValue + feedSalesValue, '#0ea5e9', '#34d399')}>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">Feed</div>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border bg-white p-4 shadow">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Feed Sales Value</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(feedSalesValue)}</div>
                    <div className="mt-1 text-xs text-slate-500">{feedStockValue + feedSalesValue ? ((feedSalesValue / (feedStockValue + feedSalesValue)) * 100).toFixed(1) : '0.0'}%</div>
                  </div>
                  <div className="rounded-xl border bg-white p-4 shadow">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Feed Stock Value</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(feedStockValue)}</div>
                    <div className="mt-1 text-xs text-slate-500">{feedStockValue + feedSalesValue ? ((feedStockValue / (feedStockValue + feedSalesValue)) * 100).toFixed(1) : '0.0'}%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-gradient-to-br from-white/70 to-slate-50 p-4 shadow">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Medicine Performance</h2>
                  <p className="text-sm text-muted-foreground">Medicine sales and stock value metrics.</p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">Medicine total value</div>
                  <div className="text-primary">{formatCurrency(medicineStockValue + medicineSalesValue)}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-end">
                <div className="relative h-56 w-56 rounded-full border bg-gradient-to-br from-violet-50 to-orange-50 shadow-sm" style={buildPieStyle(medicineSalesValue, medicineStockValue + medicineSalesValue, '#8b5cf6', '#f97316')}>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">Medicine</div>
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border bg-white p-4 shadow">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Medicine Sales Value</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(medicineSalesValue)}</div>
                    <div className="mt-1 text-xs text-slate-500">{medicineStockValue + medicineSalesValue ? ((medicineSalesValue / (medicineStockValue + medicineSalesValue)) * 100).toFixed(1) : '0.0'}%</div>
                  </div>
                  <div className="rounded-xl border bg-white p-4 shadow">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Medicine Stock Value</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(medicineStockValue)}</div>
                    <div className="mt-1 text-xs text-slate-500">{medicineStockValue + medicineSalesValue ? ((medicineStockValue / (medicineStockValue + medicineSalesValue)) * 100).toFixed(1) : '0.0'}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-white/80 p-4 shadow-sm">
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
                        <th className="px-3 py-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {warnings.medicine.map((item) => {
                        const isOutOfStock = Number(item.stockBalance?.quantityOnHand ?? 0) === 0;
                        return (
                          <tr key={item.id} className={`hover:bg-muted/30 ${isOutOfStock ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.code}</div>
                                </div>
                                {isOutOfStock && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">OUT</span>}
                              </div>
                            </td>
                            <td className="px-3 py-3 font-semibold">{formatQty(item.stockBalance?.quantityOnHand ?? 0)} {item.unit}</td>
                            <td className="px-3 py-3">{formatQty(item.lowStockThreshold ?? 0)}</td>
                            <td className="px-3 py-3">
                              <div className="flex gap-2">
                                <button className="rounded-md border px-2 py-1 text-xs">Add Stock</button>
                                <button className="rounded-md border px-2 py-1 text-xs">View</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-white/80 p-4 shadow-sm">
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
                        <th className="px-3 py-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {warnings.feed.map((item) => {
                        const isOutOfStock = Number(item.stockBalance?.quantityOnHand ?? 0) === 0;
                        return (
                          <tr key={item.id} className={`hover:bg-muted/30 ${isOutOfStock ? 'bg-red-50' : ''}`}>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.code}</div>
                                </div>
                                {isOutOfStock && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">OUT</span>}
                              </div>
                            </td>
                            <td className="px-3 py-3 font-semibold">{formatQty(item.stockBalance?.quantityOnHand ?? 0)} {item.unit}</td>
                            <td className="px-3 py-3">{formatQty(item.lowStockThreshold ?? 0)}</td>
                            <td className="px-3 py-3">
                              <div className="flex gap-2">
                                <button className="rounded-md border px-2 py-1 text-xs">Add Stock</button>
                                <button className="rounded-md border px-2 py-1 text-xs">View</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
