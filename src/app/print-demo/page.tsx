import React from 'react';
import { PrintDemoTrigger } from '@/components/print-demo-trigger';
import { ResponsiveTable } from '@/components/ui/responsive-table';

function formatCurrency(value: number | null | undefined) {
  return `Tk ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value ?? 0))}`;
}

export default function PrintDemoPage() {
  const items = Array.from({ length: 5 }).map((_, i) => ({
    id: i + 1,
    productName: `Product ${i + 1}`,
    quantity: (i + 1) * 1,
    unit: 'pcs',
    unitPrice: 2500 + i * 100,
    lineTotal: (2500 + i * 100) * (i + 1)
  }));

  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <PrintDemoTrigger />
      <div className="invoice-print-area max-w-4xl mx-auto bg-white shadow-sm border rounded-md print:bg-white">
        <style>{`@page { size: A4; margin: 12mm; } @media print { .no-print { display:none !important; } }`}</style>

        <header className="bg-white p-6 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-100 flex items-center justify-center rounded">
                <span className="text-slate-500 font-semibold">LOGO</span>
              </div>
              <div>
                <div className="text-sm text-slate-600 font-semibold">My Farm Co.</div>
                <div className="text-xs text-slate-400">123 Poultry Road, Farmville</div>
              </div>
            </div>

            <div className="flex-1 mx-6 hidden md:block">
              <div className="h-5 bg-yellow-400 w-full rounded" />
            </div>

            <div className="text-right">
              <div className="text-4xl md:text-5xl font-extrabold tracking-wider text-slate-950">INVOICE</div>
            </div>
          </div>
        </header>

        <div className="h-3 bg-yellow-400" />

        <main className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <div className="text-xs text-slate-500">Invoice to:</div>
              <div className="font-medium text-slate-900 text-lg">Demo Customer</div>
              <div className="mt-1 text-sm text-slate-600">Demo Address, City</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Invoice #</div>
              <div className="font-medium text-slate-900">INV-000123</div>
              <div className="mt-2 text-xs text-slate-500">Date</div>
              <div className="font-medium text-slate-900">01 Aug 2026</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border">
            <ResponsiveTable minWidth="700px">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">SL.</th>
                    <th className="px-4 py-3 text-left">Item Description</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {items.map((it, idx) => (
                    <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-slate-700">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-700">{it.productName}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(it.unitPrice)}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{it.quantity}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-[1fr_320px] gap-4">
            <div>
              <div className="text-sm text-slate-600">Thank you for your business</div>
            </div>
            <div className="flex justify-end">
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-sm text-slate-600"><div>Sub Total:</div><div>{formatCurrency(subtotal)}</div></div>
                <div className="flex justify-between text-sm text-slate-600 mt-1"><div>Tax:</div><div>{formatCurrency(0)}</div></div>
                <div className="mt-3">
                  <div className="flex items-center justify-between bg-yellow-400 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">Total:</div>
                    <div className="text-xl font-extrabold text-slate-900">{formatCurrency(subtotal)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
