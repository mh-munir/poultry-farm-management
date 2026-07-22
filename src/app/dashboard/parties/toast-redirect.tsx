'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PartyToast } from './party-toast';

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

    // Remove query params while keeping user on the same page
    // Use replace so it's a soft navigation without adding history
    // Ensure we replace only when a success/error param exists
    if (searchParams.get('success') || searchParams.get('error')) {
      // replace with pathname (no search)
      const route = (pathname || window.location.pathname) as Route;
      router.replace(route);
    }
  }, [message, pathname, router, searchParams]);

  if (!message) return null;

  return <PartyToast success={variantSuccess ? message : undefined} error={variantSuccess ? undefined : message} />;
}
