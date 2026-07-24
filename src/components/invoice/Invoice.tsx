"use client"
import React from "react"
import { useToast } from '@/hooks/use-toast'
import { PrintButton } from "../print-button"
import { Button } from '@/components/ui/button'

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

  // Prefer already-installed packages on node_modules (if present at runtime).
  // But avoid static imports so bundlers won't fail when packages are missing.
  // Try to use global variables if available, otherwise load from CDN.

  // html2canvas
  // @ts-ignore
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
  company?: { name?: string; phone?: string; address?: string; website?: string }
}

export default function Invoice(props: InvoiceProps) {
  const { invoiceNumber, date, billedTo, address, items, company } = props
  const subTotal = items.reduce((s, it) => s + it.price * it.qty, 0)
  const tax = 0
  const total = subTotal + tax
  const [loadingPdf, setLoadingPdf] = React.useState(false)
  const { toast: showToast, success: showSuccess, error: showError, info: showInfo } = useToast()

  return (
    <div className="invoice-print-area max-w-3xl mx-auto border p-6 bg-white print:p-0 print:border-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-transparent flex items-center justify-center rounded overflow-hidden">
            {company?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt={company.name ?? 'Logo'} className="h-full w-full object-contain" />
            ) : (
              <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded">
                <svg className="w-6 h-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v4a1 1 0 001 1h3l3 3h6" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-500">{company?.name ?? 'Brand Name'}</div>
            <div className="text-xs text-gray-400">Tagline goes here</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-semibold">INVOICE</div>
          <div className="text-sm text-gray-500">Invoice #{invoiceNumber}</div>
          <div className="text-sm text-gray-500">Date: {date}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-xs text-gray-500">Invoice to:</div>
          <div className="font-medium">{billedTo}</div>
          {address && <div className="text-sm text-gray-600">{address}</div>}
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">Payment Info</div>
          <div className="text-sm text-gray-600">Bank: 0123456789</div>
          <div className="text-sm text-gray-600">IBAN: XX00 0000 0000</div>
        </div>
      </div>

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left py-3 px-2 text-xs text-gray-600">SL.</th>
            <th className="text-left py-3 px-2 text-xs text-gray-600">Item Description</th>
            <th className="text-right py-3 px-2 text-xs text-gray-600">Price</th>
            <th className="text-center py-3 px-2 text-xs text-gray-600">Qty.</th>
            <th className="text-right py-3 px-2 text-xs text-gray-600">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="py-3 px-2 text-sm text-gray-700">{idx + 1}</td>
              <td className="py-3 px-2 text-sm text-gray-700">{it.description}</td>
              <td className="py-3 px-2 text-sm text-gray-700 text-right">${it.price.toFixed(2)}</td>
              <td className="py-3 px-2 text-sm text-gray-700 text-center">{it.qty}</td>
              <td className="py-3 px-2 text-sm text-gray-700 text-right">${(it.price * it.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-72">
          <div className="flex justify-between text-sm text-gray-600"><div>Sub Total:</div><div>${subTotal.toFixed(2)}</div></div>
          <div className="flex justify-between text-sm text-gray-600"><div>Tax:</div><div>${tax.toFixed(2)}</div></div>
          <div className="flex justify-between text-lg font-semibold mt-2"><div>Total:</div><div>${total.toFixed(2)}</div></div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-500">Thank you for your business</div>
        <div className="flex items-center gap-3">
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
    </div>
  )
}
