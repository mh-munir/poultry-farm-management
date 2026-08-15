import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/i18n';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { EMPTY_PROFIT_ANALYTICS, getProfitAnalytics } from '@/features/dashboard/actions';
import ProfitAnalyticsClient from '@/components/dashboard/profit-analytics-client';

export default async function DashboardPage() {
  const session = await requireUser();
  const cookieStore = await cookies();
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);
  const userName = session?.user?.name ?? session?.user?.email ?? 'there';

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
