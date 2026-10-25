'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { BriefcaseBusiness, ChartNoAxesColumnIncreasing, ReceiptText, Users } from 'lucide-react';
import { useLocale } from '@/i18n/provider';
import { formatLocalizedNumber } from '@/lib/localized-formatters';

type Period = 'all' | 'month';

type PartiesOverviewProps = {
  stats: {
    total: number;
    active: number;
    customers: number;
    suppliers: number;
  };
  period: Period;
};

const metrics = [
  { key: 'total', label: 'totalParties', detail: 'partyDirectoryDescription', icon: Users, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10' },
  { key: 'active', label: 'activeParties', detail: 'activeAccountsDescription', icon: ChartNoAxesColumnIncreasing, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
  { key: 'customers', label: 'customers', detail: 'customerAccountsDescription', icon: ReceiptText, tone: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10' },
  { key: 'suppliers', label: 'partySuppliers', detail: 'supplierAccountsDescription', icon: BriefcaseBusiness, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' }
] as const;

export function PartiesOverview({ stats, period }: PartiesOverviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dict, locale } = useLocale();

  const changePeriod = (nextPeriod: Period) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPeriod === 'all') params.delete('overviewPeriod');
    else params.set('overviewPeriod', nextPeriod);
    params.delete('page');
    router.replace(`/dashboard/parties${params.size ? `?${params.toString()}` : ''}` as never);
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border bg-card shadow-sm" aria-labelledby="parties-overview-title">
      <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 id="parties-overview-title" className="text-lg font-semibold">{dict.common.overviewAtAGlance}</h2>
          <p className="text-sm text-muted-foreground">{dict.common.partyDirectoryDescription}</p>
        </div>
        <div className="inline-flex w-fit rounded-lg border bg-background p-1" aria-label={dict.common.overviewPeriod}>
          {([['all', dict.common.allTime], ['month', dict.common.thisMonth]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => changePeriod(value)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${period === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {metrics.map(({ key, label, detail, icon: Icon, tone }) => (
          <div key={key} className="min-w-0 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{dict.common[label]}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{formatLocalizedNumber(stats[key], locale)}</p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{dict.common[detail]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
