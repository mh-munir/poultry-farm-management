import { AlertTriangle } from 'lucide-react';
import { useLocale } from '@/i18n/provider';

interface ServiceUnavailableCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export function ServiceUnavailableCard({
  title,
  description,
  className = ''
}: ServiceUnavailableCardProps) {
  const { dict } = useLocale();
  const resolvedTitle = title ?? dict.common.serviceUnavailableTitle;
  const resolvedDescription = description ?? dict.common.serviceUnavailableDescription;

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold">{resolvedTitle}</p>
          <p className="mt-1 leading-6">{resolvedDescription}</p>
        </div>
      </div>
    </div>
  );
}
