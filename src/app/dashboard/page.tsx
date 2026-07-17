import Link from 'next/link';
import { Users, ClipboardList, ShoppingCart, Box, BarChart3, Settings2 } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const session = await requireUser();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">Welcome back, {session.user.name ?? session.user.email}</h1>
        <p className="mt-3 text-muted-foreground">
          Manage inventory, sales, purchases, parties, and financial ledgers from one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Party Module</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage customers, suppliers, both, opening balances, and party records in one place.
              </p>
            </div>
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/parties">Open Parties</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/product-categories">Open Categories</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Inventory & Transactions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Track stock, sales invoices, purchase invoices, and supplier/customer ledgers.
              </p>
            </div>
            <Box className="h-6 w-6 text-primary" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/stock">Stock Management</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/sales">Sales</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="/dashboard/purchases">Purchases</a>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Reports & Settings</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Access reporting suites for daily, monthly, yearly, party, cash, and profit analysis.
              </p>
            </div>
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <a href="/dashboard/reports">Open Reports</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/dashboard/settings">
                <Settings2 className="mr-2 h-4 w-4" />
                Settings
              </a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
