import { Bird, BriefcaseBusiness, Factory, PackageCheck, PillBottle, Boxes } from 'lucide-react';
import type { getDictionary } from '@/i18n';

type CompaniesOverviewProps = {
  stats: {
    total: number;
    active: number;
    feed: number;
    medicine: number;
    chick: number;
    feedChick: number;
  };
  dict: ReturnType<typeof getDictionary>;
};

export function CompaniesOverview({ stats, dict }: CompaniesOverviewProps) {

  const overviewMetrics = [
    { key: 'total', label: dict.dashboard.totalCompanies, description: dict.dashboard.allCompanies, icon: Factory, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10' },
    { key: 'active', label: dict.dashboard.activeCompanies, description: dict.dashboard.currentlyActive, icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' },
    { key: 'feed', label: dict.dashboard.feedCompanies, description: dict.dashboard.feedRelated, icon: BriefcaseBusiness, tone: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10' },
    { key: 'medicine', label: dict.dashboard.medicineCompanies, description: dict.dashboard.medicineRelated, icon: PillBottle, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' },
    { key: 'chick', label: dict.dashboard.hatchlingChick, description: dict.dashboard.hatchlingOrChick, icon: Bird, tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10' },
    { key: 'feedChick', label: dict.dashboard.feedChickCompanies, description: dict.dashboard.combinedCount, icon: Boxes, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10' }
  ] as const;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border bg-card shadow-sm" aria-labelledby="companies-overview-title">
      <div className="border-b bg-muted/20 px-4 py-4 sm:px-5">
        <h2 id="companies-overview-title" className="text-lg font-semibold">{dict.dashboard.overviewAtAGlance}</h2>
        <p className="text-sm text-muted-foreground">{dict.dashboard.quickSummary}</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
        {overviewMetrics.map(({ key, label, description, icon: Icon, tone }) => (
          <div key={key} className="min-w-0 px-4 py-5 sm:px-5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{stats[key]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
