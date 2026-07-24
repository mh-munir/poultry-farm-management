import { AlertTriangle } from 'lucide-react';

interface ServiceUnavailableCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export function ServiceUnavailableCard({
  title = 'Service temporarily unavailable',
  description = 'We are unable to reach the database right now. Please try again in a moment.',
  className = ''
}: ServiceUnavailableCardProps) {
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 leading-6">{description}</p>
        </div>
      </div>
    </div>
  );
}
