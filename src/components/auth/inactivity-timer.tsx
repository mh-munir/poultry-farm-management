'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

export function InactivityTimer() {
  const { data: session, status } = useSession();
  const { success } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          await signOut({ redirect: false });
        } catch {
          // Ignore sign-out errors
        }
        success('Your session expired due to inactivity. Please sign in again.');
        router.push('/auth/sign-in');
      }, INACTIVITY_TIMEOUT);
    };

    const events: (keyof DocumentEventMap)[] = [
      'mousemove',
      'keydown',
      'click',
      'touchstart',
      'scroll'
    ];

    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [status, success, router]);

  return null;
}
