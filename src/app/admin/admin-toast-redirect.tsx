'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';

type Props = {
  initialSuccess?: string;
  initialError?: string;
};

export default function AdminToastRedirect({ initialSuccess, initialError }: Props) {
  const [message, setMessage] = useState<string | undefined>(initialSuccess ?? initialError);
  const variantSuccess = !!initialSuccess;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!message) return;

    if (searchParams.get('success') || searchParams.get('error')) {
      const currentPath = pathname || window.location.pathname;
      window.history.replaceState(null, '', currentPath);
    }
  }, [message, pathname, searchParams]);

  if (!message) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div
        className={`flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-all duration-200 ${
          variantSuccess
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-current">
          {variantSuccess ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-semibold">{variantSuccess ? 'Success' : 'Error'}</p>
          <p className="text-sm leading-5 text-current">{message}</p>
        </div>
      </div>
    </div>
  );
}
