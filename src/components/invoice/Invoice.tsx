"use client"
import React from "react"
import { useToast } from '@/hooks/use-toast'
import { PrintButton } from "../print-button"
import { Button } from '@/components/ui/button'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import type { Branding } from '@/lib/branding'

async function loadScript(url: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = url
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load ' + url))
    document.head.appendChild(s)
  })
}

async function exportPdf(element: HTMLElement, fileName = 'invoice.pdf') {
  if (typeof window === 'undefined') throw new Error('Must run in browser')

  let html2canvasFn: any = (window as any).html2canvas
  if (!html2canvasFn) {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')
      // @ts-ignore
      html2canvasFn = (window as any).html2canvas
    } catch (err) {
      throw new Error('html2canvas is not available. Install html2canvas or enable network access to load CDN.')
    }
  }

  // jsPDF
  // @ts-ignore
  let jsPDFCtor: any = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF
  if (!jsPDFCtor) {
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
      // UMD exposes `window.jspdf.jsPDF` or `window.jsPDF`
      // @ts-ignore
      jsPDFCtor = (window as any).jspdf?.jsPDF ?? (window as any).jsPDF
    } catch (err) {
      throw new Error('jsPDF is not available. Install jspdf or enable network access to load CDN.')
    }
  }

  const canvas = await html2canvasFn(element, { scale: 2 })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDFCtor({ unit: 'pt', format: 'a4' })
  const imgProps = pdf.getImageProperties(imgData)
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(fileName)
}

type LineItem = {
  id: number
  description: string
  price: number
  qty: number
}

type InvoiceProps = {
  invoiceNumber: string
  date: string
  billedTo: string
  address?: string
  items: LineItem[]
  company?: Branding & { phone?: string; address?: string; website?: string }
}

export default function Invoice(props: InvoiceProps) {
  const { invoiceNumber, date, billedTo, address, items, company } = props
  const subTotal = items.reduce((s, it) => s + it.price * it.qty, 0)
  const tax = 0
  const total = subTotal + tax
  const [loadingPdf, setLoadingPdf] = React.useState(false)
  const { toast: showToast, success: showSuccess, error: showError, info: showInfo } = useToast()
  return (
    <div className="invoice-print-area max-w-3xl mx-auto bg-white print:bg-white">
      <div className="shadow-sm border rounded-md overflow-visible">
        <header className="bg-white p-4 sm:p-6 border-b border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden rounded border bg-white">
                {company?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo} alt={company.name ?? 'Logo'} className="h-full w-full object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded text-slate-500 font-semibold">LOGO</div>
                )}
              </div>
              <div>
                <div className="text-sm text-slate-600 font-semibold">{company?.name ?? 'Brand Name'}</div>
                <div className="text-xs text-slate-400">{(company as any)?.tagline ?? 'Tagline space here'}</div>
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

        <main className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <div className="text-xs text-slate-500">Invoice to:</div>
              <div className="font-medium text-slate-900 text-lg">{billedTo}</div>
              {address && <div className="mt-1 text-sm text-slate-600">{address}</div>}
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Invoice #</div>
              <div className="font-medium text-slate-900">{invoiceNumber}</div>
              <div className="mt-2 text-xs text-slate-500">Date</div>
              <div className="font-medium text-slate-900">{date}</div>
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
                            <td className="px-4 py-3 text-slate-700">{it.description}</td>
                            <td className="px-4 py-3 text-right text-slate-700">Tk {it.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center text-slate-700">{it.qty}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">Tk {(it.price * it.qty).toFixed(2)}</td>
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
                <div className="flex justify-between text-sm text-slate-600"><div>Sub Total:</div><div>Tk {subTotal.toFixed(2)}</div></div>
                <div className="flex justify-between text-sm text-slate-600 mt-1"><div>Tax:</div><div>Tk {tax.toFixed(2)}</div></div>
                <div className="mt-3">
                  <div className="flex items-center justify-between bg-yellow-400 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">Total:</div>
                    <div className="text-xl font-extrabold text-slate-900">Tk {total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <div className="font-semibold text-slate-800 mb-2">Terms & Conditions</div>
              <div>Payment due within 15 days. Late payments may be subject to fees.</div>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-2">Payment Info</div>
              <div>Account #: 1234 5678 9012</div>
              <div>Bank: Example Bank</div>
            </div>
          </div>
        </main>

        <footer className="p-4 sm:p-6 bg-white border-t text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>Phone: {company?.phone ?? '—'} | Address: {company?.address ?? '—'} | {company?.website ?? ''}</div>
          <div className="text-left sm:text-right">
            <div className="font-semibold text-slate-800">Authorized Sign</div>
            <div className="mt-4 h-8 w-40 sm:w-48 border-b border-slate-300" />
          </div>
        </footer>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 no-print">
        <PrintButton />
        <Button variant="outline" onClick={async () => {
          const el = document.querySelector('.invoice-print-area') as HTMLElement | null;
          if (!el) return;
          const id = showInfo('Preparing PDF...')
          try {
            setLoadingPdf(true)
            await exportPdf(el, `invoice-${invoiceNumber}.pdf`)
            showSuccess('PDF saved')
          } catch (err: any) {
            // eslint-disable-next-line no-console
            console.error('PDF export failed', err)
            showError(err?.message ?? 'Failed to export PDF')
          } finally {
            setLoadingPdf(false)
          }
        }} disabled={loadingPdf}>
          {loadingPdf ? 'Preparing PDF...' : 'Download PDF'}
        </Button>
      </div>
    </div>
  )
}
