'use client';

import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

function buildReceiptMarkup(title: string, exportData: string) {
  const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character));
  const rows = exportData.split('\n').filter(Boolean).map((row) => row.split(',').map(escapeHtml));
  const content = rows.map((row, index) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');

  return `
    <html>
      <head><title>${escapeHtml(title)} Profile</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#1f2937}.sheet{border:1px solid #e5e7eb}.head{display:flex;justify-content:space-between;align-items:center;padding:24px 28px 16px}.brand{font-weight:700;font-size:18px}.title{font-size:32px;font-weight:300;letter-spacing:1px}.stripe{height:10px;background:#fbbf24}.body{padding:24px 28px}.label{font-size:11px;font-weight:700;color:#64748b}.name{margin-top:4px;font-weight:700}.table{width:100%;border-collapse:collapse;margin-top:24px;font-size:11px}.table tr:nth-child(even){background:#f8fafc}.table td{padding:9px 8px;border-bottom:1px solid #e5e7eb}.foot{border-top:2px solid #fbbf24;padding:14px 28px;font-size:10px;color:#64748b}</style></head>
      <body><div class="sheet"><header class="head"><div><div class="brand">${escapeHtml(title)}</div><div class="label">COMPANY PROFILE</div></div><div class="title">PROFILE</div></header><div class="stripe"></div><main class="body"><div class="label">PROFILE DETAILS</div><div class="name">${escapeHtml(title)}</div><table class="table"><tbody>${content}</tbody></table></main><footer class="foot">Generated from Poultry Farm Management</footer></div></body>
      </body>
    </html>
  `;
}

type CompanyProfileActionsProps = {
  companyName: string;
  exportData: string;
};

export function CompanyProfileActions({ companyName, exportData }: CompanyProfileActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    const blob = new Blob([exportData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${companyName.replace(/\s+/g, '-').toLowerCase()}-profile.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(buildReceiptMarkup(companyName, exportData));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={handleExport} disabled={isExporting} className="h-[42px]">
        <Download className="mr-2 h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>
      <Button type="button" variant="outline" onClick={handlePrint} className="h-[42px]">
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
    </>
  );
}
