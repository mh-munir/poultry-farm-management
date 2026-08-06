import { requireUser } from '@/lib/auth';
import getDashboardDataCached, { EMPTY_PROFIT_ANALYTICS, getProfitAnalytics } from '@/features/dashboard/actions';
import { ServiceUnavailableCard } from '@/components/ui/service-unavailable-card';
import ProfitAnalyticsClient from '@/components/dashboard/profit-analytics-client';

const BANGLADESH_OFFSET = 6 * 60;

function toBangladeshTime(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + BANGLADESH_OFFSET * 60000);
}

function getStartOfDay(date: Date) {
  const bd = toBangladeshTime(date);
  bd.setHours(0, 0, 0, 0);
  return bd;
}

function getEndOfDay(date: Date) {
  const start = getStartOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return end;
}

function getTodayRange() {
  const now = new Date();
  const start = getStartOfDay(now);
  const end = getEndOfDay(now);
  return { start, end };
}

export default async function DashboardPage() {
  const session = await requireUser();
  const userName = session?.user?.name ?? session?.user?.email ?? 'there';

  const { start, end } = getTodayRange();
  const sixMonthsAgo = new Date(start);
  sixMonthsAgo.setMonth(start.getMonth() - 5);

  let dbUnavailable = false;

  await (async () => {
    try {
      await getDashboardDataCached({ start, end, sixMonthsAgo });
    } catch {
      dbUnavailable = true;
    }
  })();

  // initial profit analytics for the server-rendered view (today by default)
  let profitInitial = EMPTY_PROFIT_ANALYTICS;
  let profitInitialLoadError = false;

  try {
    profitInitial = await getProfitAnalytics({ start, end });
    profitInitialLoadError = profitInitial.unavailable === true;
  } catch {
    profitInitialLoadError = true;
  }

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl">
      <div className="space-y-6">
        {dbUnavailable ? (
          <div>
            <ServiceUnavailableCard
              title="Dashboard data is temporarily unavailable"
              description="The database connection is currently unavailable, so live farm totals are not available right now. You can still browse the workspace while the service recovers."
            />
          </div>
        ) : null}

        <ProfitAnalyticsClient
          initialStart={start.toISOString()}
          initialEnd={end.toISOString()}
          initialData={profitInitial}
          initialLoadError={profitInitialLoadError}
        />
      </div>
    </main>
  );
}
