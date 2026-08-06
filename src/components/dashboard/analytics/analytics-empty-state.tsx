import { Compass } from "lucide-react";

type Props = {
  title: string;
  description: string;
};

export function AnalyticsEmptyState({ title, description }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        <Compass size={20} className="text-slate-500" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
