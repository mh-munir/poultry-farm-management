import Link from 'next/link';
import { BarChart3, BookOpen, FileDown, FileText, Printer, Receipt } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const reports = [
  {
    title: 'Daily',
    description: 'Review day-to-day sales, purchases, and stock movement at a glance.',
    badge: 'Daily'
  },
  {
    title: 'Monthly',
    description: 'Summarize monthly performance with trend-focused business insights.',
    badge: 'Monthly'
  },
  {
    title: 'Yearly',
    description: 'Track annual growth across revenue, expenses, and inventory turnover.',
    badge: 'Yearly'
  },
  {
    title: 'Party Statement',
    description: 'Present outstanding balances and transaction history for each party.',
    badge: 'Ledger'
  },
  {
    title: 'Ledger',
    description: 'Inspect detailed account activity for parties and cash movements.',
    badge: 'Statements'
  },
  {
    title: 'Sales',
    description: 'Monitor invoice summaries, sales trends, and customer-level performance.',
    badge: 'Sales'
  },
  {
    title: 'Purchases',
    description: 'Review supplier invoices, purchase values, and stock acquisition history.',
    badge: 'Purchases'
  },
  {
    title: 'Stock',
    description: 'Analyze inventory availability, movement, and low-stock positions.',
    badge: 'Inventory'
  },
  {
    title: 'Cash Book',
    description: 'Track cash receipts, payments, and daily cash balances.',
    badge: 'Cash'
  },
  {
    title: 'Profit & Loss',
    description: 'Measure profitability with gross margin and expense summaries.',
    badge: 'Finance'
  }
];

const exportActions = [
  { label: 'Export PDF', icon: FileDown },
  { label: 'Export Excel', icon: FileText },
  { label: 'Print Reports', icon: Printer }
];

export default async function ReportsPage() {
  const session = await requireUser();

  const userName = session.user.name ?? session.user.email ?? 'there';

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Reports</p>
            <h1 className="mt-2 text-3xl font-semibold">Reports Centre</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Welcome back, {userName}. Review operational and financial reports with export and print options built in.
            </p>
          </div>
          <div className="rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground">
            Finance & operations
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <div key={report.title} className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{report.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
              </div>
              <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {report.badge}
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Operational</span>
              <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Ready</span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/reports">Open report</Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Export & Print</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepare reports for sharing, filing, or printing in a single click.
            </p>
          </div>
          <div className="rounded-full border bg-background p-2 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {exportActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.label} asChild variant="outline">
                <Link href="/dashboard/reports">
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
