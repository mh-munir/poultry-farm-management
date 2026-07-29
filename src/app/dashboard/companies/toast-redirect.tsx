'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CompanyToast } from '../parties/company-toast';

type Props = {
  initialSuccess?: string;
  initialError?: string;
};

export default function ToastRedirect({ initialSuccess, initialError }: Props) {
  const [message, setMessage] = useState<string | undefined>(initialSuccess ?? initialError);
  const [variantSuccess, setVariantSuccess] = useState<boolean>(!!initialSuccess);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!message) return;

    if (searchParams.get('success') || searchParams.get('error')) {
      const route = (pathname || window.location.pathname) as Route;
      router.replace(route);
    }
  }, [message, pathname, router, searchParams]);

  if (!message) return null;

  return <CompanyToast success={variantSuccess ? message : undefined} error={variantSuccess ? undefined : message} />;
}
