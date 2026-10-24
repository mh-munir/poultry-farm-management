import type { Decimal } from '@prisma/client/runtime/library';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { prisma } from '@/server/db';
import { getDictionary } from '@/i18n';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { convertToBanglaDigits, formatLocalizedCurrency, formatLocalizedNumber, formatLocalizedPercentage } from '@/lib/localized-formatters';

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

function formatQty(value: number | string | { toString(): string } | null | undefined, locale: 'en' | 'bn') {
  const formatted = Number(value?.toString() ?? 0).toFixed(2);
  return locale === 'bn' ? convertToBanglaDigits(formatted) : formatted;
}

function formatCurrency(value: number, locale: 'en' | 'bn') {
  const formatted = formatLocalizedCurrency(value, locale, '৳');
  return formatted.replace(/\.\d+$/, '');
}

function formatPercent(value: number, locale: 'en' | 'bn') {
  return formatLocalizedPercentage(value, locale);
}

function formatUnit(unit: string, dict: ReturnType<typeof getDictionary>) {
  const labels: Record<string, string> = {
    pcs: dict.common.pcsUnit,
    piece: dict.common.pcsUnit,
    pieces: dict.common.pcsUnit,
    bag: dict.common.bagUnit,
    kg: dict.common.kgUnit,
    gm: dict.common.gmUnit,
    bottle: dict.common.bottleUnit,
    liter: dict.common.literUnit,
    box: dict.common.boxUnit,
    pack: dict.common.packUnit
  };
  return labels[unit.toLowerCase()] ?? unit;
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
  const cookieStore = await cookies();
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const {
    warnings,
    feedStockValue,
    medicineStockValue,
    feedSalesValue,
    medicineSalesValue
  } = await getStockReportsData();

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4 sm:px-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{dict.common.stockReports}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{dict.stock.reportDescription}</p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">{dict.stock.lowStockItems}</div>
              <div className="text-primary">{formatLocalizedNumber(warnings.medicine.length + warnings.feed.length, locale)}</div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <input placeholder={dict.stock.searchProducts} className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-56" />
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-40">
                <option value="all">{dict.common.allTypes}</option>
                <option value="feed">{dict.common.feedType}</option>
                <option value="medicine">{dict.common.medicineType}</option>
              </select>
              <button className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground sm:w-auto">{dict.stock.exportCsv}</button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="rounded-xl border bg-gradient-to-br from-white/70 to-slate-50 p-4 shadow">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{dict.stock.feedPerformance}</h2>
                  <p className="text-sm text-muted-foreground">{dict.stock.feedSalesStockMetrics}</p>
                </div>
                <div className="text-left text-sm sm:shrink-0 sm:text-right">
                  <div className="font-medium">{dict.stock.feedTotalValue}</div>
                  <div className="text-primary">{formatCurrency(feedStockValue + feedSalesValue, locale)}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 xl:flex-row xl:items-end">
                <div className="relative h-48 w-48 shrink-0 rounded-full border bg-gradient-to-br from-sky-50 to-emerald-50 shadow-sm sm:h-56 sm:w-56" style={buildPieStyle(feedSalesValue, feedStockValue + feedSalesValue, '#0ea5e9', '#34d399')}>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">{dict.common.feedType}</div>
                </div>
                <div className="grid w-full min-w-0 gap-3 text-sm sm:grid-cols-2 xl:flex-1">
                  <div className="min-w-0 rounded-xl border bg-white p-3 shadow sm:p-4">
                    <div className="break-words text-xs uppercase tracking-[0.2em] text-slate-500">{dict.stock.feedSalesValue}</div>
                    <div className="mt-2 break-words text-lg font-semibold text-slate-900">{formatCurrency(feedSalesValue, locale)}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatPercent(feedStockValue + feedSalesValue ? ((feedSalesValue / (feedStockValue + feedSalesValue)) * 100) : 0, locale)}</div>
                  </div>
                  <div className="min-w-0 rounded-xl border bg-white p-3 shadow sm:p-4">
                    <div className="break-words text-xs uppercase tracking-[0.2em] text-slate-500">{dict.stock.feedStockValue}</div>
                    <div className="mt-2 break-words text-lg font-semibold text-slate-900">{formatCurrency(feedStockValue, locale)}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatPercent(feedStockValue + feedSalesValue ? ((feedStockValue / (feedStockValue + feedSalesValue)) * 100) : 0, locale)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-gradient-to-br from-white/70 to-slate-50 p-4 shadow">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{dict.stock.medicinePerformance}</h2>
                  <p className="text-sm text-muted-foreground">{dict.stock.medicineSalesStockMetrics}</p>
                </div>
                <div className="text-left text-sm sm:shrink-0 sm:text-right">
                  <div className="font-medium">{dict.stock.medicineTotalValue}</div>
                  <div className="text-primary">{formatCurrency(medicineStockValue + medicineSalesValue, locale)}</div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4 xl:flex-row xl:items-end">
                <div className="relative h-48 w-48 shrink-0 rounded-full border bg-gradient-to-br from-violet-50 to-orange-50 shadow-sm sm:h-56 sm:w-56" style={buildPieStyle(medicineSalesValue, medicineStockValue + medicineSalesValue, '#8b5cf6', '#f97316')}>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">{dict.common.medicineType}</div>
                </div>
                <div className="grid w-full min-w-0 gap-3 text-sm sm:grid-cols-2 xl:flex-1">
                  <div className="min-w-0 rounded-xl border bg-white p-3 shadow sm:p-4">
                    <div className="break-words text-xs uppercase tracking-[0.2em] text-slate-500">{dict.stock.medicineSalesValue}</div>
                    <div className="mt-2 break-words text-lg font-semibold text-slate-900">{formatCurrency(medicineSalesValue, locale)}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatPercent(medicineStockValue + medicineSalesValue ? ((medicineSalesValue / (medicineStockValue + medicineSalesValue)) * 100) : 0, locale)}</div>
                  </div>
                  <div className="min-w-0 rounded-xl border bg-white p-3 shadow sm:p-4">
                    <div className="break-words text-xs uppercase tracking-[0.2em] text-slate-500">{dict.stock.medicineStockValue}</div>
                    <div className="mt-2 break-words text-lg font-semibold text-slate-900">{formatCurrency(medicineStockValue, locale)}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatPercent(medicineStockValue + medicineSalesValue ? ((medicineStockValue / (medicineStockValue + medicineSalesValue)) * 100) : 0, locale)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="rounded-xl border bg-white/80 p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{dict.stock.medicineStockWarnings}</h2>
                  <p className="text-sm text-muted-foreground">{dict.stock.itemsAtWarningThreshold}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {dict.stock.warningItemCount.replace('{count}', formatLocalizedNumber(warnings.medicine.length, locale))}
                </span>
              </div>
              {warnings.medicine.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{dict.stock.noMedicineWarnings}</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <ResponsiveTable stickyLastColumn minWidth="680px">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-2 sm:px-3 sm:py-3 text-left font-medium">{dict.stock.name}</th>
                        <th className="px-2 py-2 sm:px-3 sm:py-3 text-left font-medium">{dict.common.quantity}</th>
                        <th className="px-2 py-2 sm:px-3 sm:py-3 text-left font-medium">{dict.stock.threshold}</th>
                        <th className="px-2 py-2 sm:px-3 sm:py-3 text-left font-medium">{dict.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {warnings.medicine.map((item) => {
                        const isOutOfStock = Number(item.stockBalance?.quantityOnHand ?? 0) === 0;
                        return (
                          <tr key={item.id} className={`hover:bg-muted/30 ${isOutOfStock ? 'bg-red-50' : ''}`}>
                            <td className="px-2 py-2 sm:px-3 sm:py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.code}</div>
                                </div>
                                {isOutOfStock && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">{dict.stock.outOfStock}</span>}
                              </div>
                            </td>
                            <td className="px-2 py-2 sm:px-3 sm:py-3 font-semibold">{formatQty(item.stockBalance?.quantityOnHand ?? 0, locale)} {formatUnit(item.unit, dict)}</td>
                            <td className="px-2 py-2 sm:px-3 sm:py-3">{formatQty(item.lowStockThreshold ?? 0, locale)}</td>
                            <td className="px-2 py-2 sm:px-3 sm:py-3">
                              <div className="flex gap-2">
                                <button className="rounded-md border px-2 py-1 text-xs">{dict.stock.addStockButton}</button>
                                <button className="rounded-md border px-2 py-1 text-xs">{dict.common.view}</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </ResponsiveTable>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-white/80 p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{dict.stock.feedStockWarnings}</h2>
                  <p className="text-sm text-muted-foreground">{dict.stock.itemsAtWarningThreshold}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {dict.stock.warningItemCount.replace('{count}', formatLocalizedNumber(warnings.feed.length, locale))}
                </span>
              </div>
              {warnings.feed.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{dict.stock.noFeedWarnings}</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <ResponsiveTable stickyLastColumn minWidth="680px">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-2 sm:px-3 sm:py-3 text-left font-medium">{dict.stock.name}</th>
                        <th className="px-2 py-2 sm:px-3 sm:py-3 text-left font-medium">{dict.common.quantity}</th>
                        <th className="px-2 py-2 sm:px-3 sm:py-3 text-left font-medium">{dict.stock.threshold}</th>
                        <th className="px-2 py-2 sm:px-3 sm:py-3 text-left font-medium">{dict.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                      {warnings.feed.map((item) => {
                        const isOutOfStock = Number(item.stockBalance?.quantityOnHand ?? 0) === 0;
                        return (
                          <tr key={item.id} className={`hover:bg-muted/30 ${isOutOfStock ? 'bg-red-50' : ''}`}>
                            <td className="px-2 py-2 sm:px-3 sm:py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.code}</div>
                                </div>
                                {isOutOfStock && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">{dict.stock.outOfStock}</span>}
                              </div>
                            </td>
                            <td className="px-2 py-2 sm:px-3 sm:py-3 font-semibold">{formatQty(item.stockBalance?.quantityOnHand ?? 0, locale)} {formatUnit(item.unit, dict)}</td>
                            <td className="px-2 py-2 sm:px-3 sm:py-3">{formatQty(item.lowStockThreshold ?? 0, locale)}</td>
                            <td className="px-2 py-2 sm:px-3 sm:py-3">
                              <div className="flex gap-2">
                                <button className="rounded-md border px-2 py-1 text-xs">{dict.stock.addStockButton}</button>
                                <button className="rounded-md border px-2 py-1 text-xs">{dict.common.view}</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </ResponsiveTable>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
