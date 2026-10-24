import { requireUser } from '@/lib/auth';
import { EMPTY_PROFIT_ANALYTICS, getProfitAnalytics } from '@/features/dashboard/actions';
import ProfitAnalyticsClient from '@/components/dashboard/profit-analytics-client';

export default async function DashboardPage() {
  await requireUser();

  let profitInitial = EMPTY_PROFIT_ANALYTICS;
  let profitInitialLoadError = false;

  try {
    profitInitial = await getProfitAnalytics();
    profitInitialLoadError = profitInitial.unavailable === true;
  } catch {
    profitInitialLoadError = true;
  }

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl">
      <div className="space-y-6">
        <ProfitAnalyticsClient
          initialData={profitInitial}
          initialLoadError={profitInitialLoadError}
        />
      </div>
    </main>
  );
}
