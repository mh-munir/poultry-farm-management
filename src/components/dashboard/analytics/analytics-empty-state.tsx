import { Compass } from "lucide-react";

type Props = {
  title: string;
  description: string;
};

export function AnalyticsEmptyState({ title, description }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm">
        <Compass size={20} className="text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
