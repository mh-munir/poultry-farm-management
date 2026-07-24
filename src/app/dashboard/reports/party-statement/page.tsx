import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function PartyStatementReportPage() {
  await requireUser();

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Party Statement</h1>
            <p className="mt-2 text-sm text-muted-foreground">Present outstanding balances and transaction history for each party.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports">Back to Reports</Link>
          </Button>
        </div>

        <div className="mt-6 rounded-lg border bg-muted/50 p-6 text-center">
          <p className="text-muted-foreground">Party Statement report is being built. Check back soon!</p>
        </div>
      </div>
    </main>
  );
}
