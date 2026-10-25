import { requireUser } from '@/lib/auth';
import {
  EMPTY_DASHBOARD_BALANCES,
  EMPTY_PROFIT_ANALYTICS,
  getDashboardBalanceSummary,
  getProfitAnalytics,
} from '@/features/dashboard/actions';
import ProfitAnalyticsClient from '@/components/dashboard/profit-analytics-client';

export default async function DashboardPage() {
  await requireUser();

  const [profitInitial, balanceResult] = await Promise.all([
    getProfitAnalytics(),
    getDashboardBalanceSummary()
      .then((balances) => ({ balances, unavailable: false }))
      .catch((error: unknown) => {
        console.error('Failed to load dashboard balances', error);
        return { balances: EMPTY_DASHBOARD_BALANCES, unavailable: true };
      }),
  ]);

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl">
      <div className="space-y-6">
        <ProfitAnalyticsClient
          initialData={profitInitial}
          initialLoadError={profitInitial.unavailable === true}
          initialBalances={balanceResult.balances}
          balanceLoadError={balanceResult.unavailable}
        />
      </div>
    </main>
  );
}
