'use client';

import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

function buildReceiptMarkup(title: string, exportData: string) {
  const rows = exportData.split('\n').map((row) => row.split(','));
  const content = rows
    .map((row) => row.join(' | '))
    .join('<br />');

  return `
    <html>
      <head><title>${title} Receipt</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
        <h2 style="margin-bottom: 12px;">${title} Receipt</h2>
        <div style="border: 1px solid #d1d5db; padding: 16px; border-radius: 8px; background: #fff;">
          <div style="white-space: pre-wrap; line-height: 1.6;">${content}</div>
        </div>
      </body>
    </html>
  `;
}

type PartyProfileActionsProps = {
  partyName: string;
  exportData: string;
};

export function PartyProfileActions({ partyName, exportData }: PartyProfileActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    const blob = new Blob([exportData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${partyName.replace(/\s+/g, '-').toLowerCase()}-profile.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(buildReceiptMarkup(partyName, exportData));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={handleExport} disabled={isExporting}>
        <Download className="mr-2 h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>
      <Button type="button" variant="outline" onClick={handlePrint}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
    </>
  );
}
