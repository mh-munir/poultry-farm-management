import { Bird, BriefcaseBusiness, Factory, PackageCheck, PillBottle, Boxes } from 'lucide-react';

type CompaniesOverviewProps = {
  stats: {
    total: number;
    active: number;
    feed: number;
    medicine: number;
    chick: number;
    feedChick: number;
  };
};

const overviewMetrics = [
  { key: 'total', label: 'Total Companies', description: 'All companies', icon: Factory, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10' },
  { key: 'active', label: 'Active Companies', description: 'Currently active', icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' },
  { key: 'feed', label: 'Feed Companies', description: 'Feed related', icon: BriefcaseBusiness, tone: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10' },
  { key: 'medicine', label: 'Medicine Companies', description: 'Medicine related', icon: PillBottle, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' },
  { key: 'chick', label: 'Hatchling / Chick', description: 'Hatchling or chick', icon: Bird, tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10' },
  { key: 'feedChick', label: 'Feeds + Hatchling / Chick', description: 'Combined count', icon: Boxes, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10' }
] as const;

export function CompaniesOverview({ stats }: CompaniesOverviewProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border bg-card shadow-sm" aria-labelledby="companies-overview-title">
      <div className="border-b bg-muted/20 px-4 py-4 sm:px-5">
        <h2 id="companies-overview-title" className="text-lg font-semibold">Overview at a glance</h2>
        <p className="text-sm text-muted-foreground">Quick summary of all companies in your system.</p>
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
