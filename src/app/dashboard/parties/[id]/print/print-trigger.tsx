'use client';

import { useEffect } from 'react';

export default function PrintTrigger() {
  useEffect(() => {
    // small delay to let the page render before opening print dialog
    const t = setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        // no-op
      }
    }, 200);

    return () => clearTimeout(t);
  }, []);

  return null;
}
