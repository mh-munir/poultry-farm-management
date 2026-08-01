import { requireUser } from '@/lib/auth';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { prisma } from '@/server/db';
import PrintTrigger from './print-trigger';
import styles from './print-styles.module.css';

function formatCurrency(value: number) {
  return `৳ ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export default async function StockPrintPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();

  const { id: idStr } = await params;
  const id = Number(idStr);

  if (isNaN(id) || id <= 0) {
    return (
      <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-800">Invalid Stock Item</h1>
          <p className="mt-2 text-sm text-red-600">The stock item ID is not valid.</p>
        </div>
      </main>
    );
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      productType: true,
      unit: true,
      defaultPurchasePrice: true,
      defaultSellingPrice: true,
      stockBalance: {
        select: {
          quantityOnHand: true,
          averageCost: true,
          reservedQuantity: true
        }
      }
    }
  });

  if (!product) {
    return (
      <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-800">Stock Item Not Found</h1>
          <p className="mt-2 text-sm text-red-600">
            No stock item exists with ID {id}.
          </p>
        </div>
      </main>
    );
  }

  const stockBalance = product.stockBalance;

  const movements = await prisma.stockMovement.findMany({
    where: { productId: id },
    include: {
      transaction: {
        select: {
          id: true,
          transactionType: true,
          transactionDate: true,
          invoiceNumber: true,
          party: { select: { name: true } },
          company: { select: { name: true } }
        }
      }
    },
    orderBy: { id: 'desc' },
    take: 20
  });

  const salesItems = await prisma.transactionItem.findMany({
    where: {
      productId: id,
      transaction: { transactionType: 'SALE' }
    },
    include: {
      transaction: {
        include: {
          party: { select: { name: true } }
        }
      }
    },
    orderBy: { id: 'desc' },
    take: 20
  });

  const purchaseItems = await prisma.transactionItem.findMany({
    where: {
      productId: id,
      transaction: { transactionType: 'PURCHASE' }
    },
    include: {
      transaction: {
        include: {
          party: { select: { name: true } },
          company: { select: { name: true } }
        }
      }
    },
    orderBy: { id: 'desc' },
    take: 20
  });

  const totalSalesValue = salesItems.reduce(
    (sum, item) => sum + Number(item.lineTotal),
    0
  );
  const totalPurchaseValue = purchaseItems.reduce(
    (sum, item) => sum + Number(item.lineTotal),
    0
  );

  const printDate = new Date();

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className={styles.printPage}>
        <div className="no-print mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Stock Report</p>
            <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
          </div>
          <PrintTrigger />
        </div>

        <div className="bg-white p-6 shadow-sm print:shadow-none print:p-0 print:border-0 print:bg-white">
          <div className="mb-8 flex flex-col gap-6 border-b pb-6 print:border-b-0 print:pb-0 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{product.name}</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Code: {product.code} | Type: {product.productType} | Unit: {product.unit}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Printed</div>
              <div className="mt-1">{formatDate(printDate)}</div>
            </div>
          </div>

          <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Quantity On Hand</div>
              <div className="mt-2 text-2xl font-semibold">
                {Number(stockBalance?.quantityOnHand ?? 0).toFixed(2)} {product.unit}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Average Cost</div>
              <div className="mt-2 text-2xl font-semibold">
                {formatCurrency(Number(stockBalance?.averageCost ?? 0))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Stock Value</div>
              <div className="mt-2 text-2xl font-semibold">
                {formatCurrency(
                  Number(stockBalance?.quantityOnHand ?? 0) * Number(stockBalance?.averageCost ?? 0)
                )}
              </div>
            </div>
          </div>

          <div className="mb-8 reportSection">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Movements
            </h3>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No movements recorded.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <ResponsiveTable minWidth="760px">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Quantity</th>
                      <th className="px-3 py-2 text-left font-medium">Reference</th>
                      <th className="px-3 py-2 text-left font-medium">Party / Company</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="px-3 py-2">{formatDate(movement.createdAt)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              movement.movementType === 'PURCHASE'
                                ? 'text-emerald-600'
                                : 'text-blue-600'
                            }
                          >
                            {movement.movementType}
                          </span>
                        </td>
                        <td className="px-3 py-2">{Number(movement.quantity).toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs">
                          {movement.transaction?.invoiceNumber ?? '-'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {movement.transaction?.party?.name ??
                            movement.transaction?.company?.name ??
                            '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </ResponsiveTable>
              </div>
            )}
          </div>

          <div className="mb-8 reportSection">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Sales
            </h3>
            {salesItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <ResponsiveTable minWidth="720px">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Invoice</th>
                      <th className="px-3 py-2 text-left font-medium">Customer</th>
                      <th className="px-3 py-2 text-left font-medium">Qty</th>
                      <th className="px-3 py-2 text-left font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salesItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">{formatDate(item.transaction.transactionDate)}</td>
                        <td className="px-3 py-2 text-xs">{item.transaction.invoiceNumber}</td>
                        <td className="px-3 py-2 text-xs">{item.transaction.party?.name ?? '-'}</td>
                        <td className="px-3 py-2">{Number(item.quantity).toFixed(2)}</td>
                        <td className="px-3 py-2">{formatCurrency(Number(item.lineTotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </ResponsiveTable>
                <div className="border-t bg-muted/30 px-3 py-2 text-right text-sm font-semibold">
                  Total Sales: {formatCurrency(totalSalesValue)}
                </div>
              </div>
            )}
          </div>

          <div className="mb-8 reportSection">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Purchases
            </h3>
            {purchaseItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases recorded.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <ResponsiveTable minWidth="720px">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Invoice</th>
                      <th className="px-3 py-2 text-left font-medium">Supplier</th>
                      <th className="px-3 py-2 text-left font-medium">Qty</th>
                      <th className="px-3 py-2 text-left font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {purchaseItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">{formatDate(item.transaction.transactionDate)}</td>
                        <td className="px-3 py-2 text-xs">{item.transaction.invoiceNumber}</td>
                        <td className="px-3 py-2 text-xs">
                          {item.transaction.party?.name ?? item.transaction.company?.name ?? '-'}
                        </td>
                        <td className="px-3 py-2">{Number(item.quantity).toFixed(2)}</td>
                        <td className="px-3 py-2">{formatCurrency(Number(item.lineTotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </ResponsiveTable>
                <div className="border-t bg-muted/30 px-3 py-2 text-right text-sm font-semibold">
                  Total Purchases: {formatCurrency(totalPurchaseValue)}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
            <p>Generated by Poultry Farm Management System</p>
            <p>Printed: {formatDate(printDate)}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
