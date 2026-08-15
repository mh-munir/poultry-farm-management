'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_COOKIE, getLocaleFromValue, type Locale } from './config';
import { getDictionary } from './index';

const STORAGE_KEY = 'app-locale';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: ReturnType<typeof getDictionary>;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function setCookieLocale(locale: Locale) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax${secure}`;
}

export function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: string }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(() => getLocaleFromValue(initialLocale ?? DEFAULT_LOCALE));

  useEffect(() => {
    const storedLocale = localStorage.getItem(STORAGE_KEY) ?? document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
      ?.split('=')[1];

    const resolved = getLocaleFromValue(storedLocale ?? initialLocale ?? DEFAULT_LOCALE);
    setLocaleState(resolved);
    setCookieLocale(resolved);
    document.documentElement.lang = resolved === 'bn' ? 'bn' : 'en';
  }, [initialLocale]);

  useEffect(() => {
    const syncLocaleFromOtherTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      const nextLocale = getLocaleFromValue(event.newValue);
      setLocaleState(nextLocale);
      setCookieLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      router.refresh();
    };
    window.addEventListener('storage', syncLocaleFromOtherTab);
    return () => window.removeEventListener('storage', syncLocaleFromOtherTab);
  }, [router]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(STORAGE_KEY, nextLocale);
    setCookieLocale(nextLocale);
    document.documentElement.lang = nextLocale === 'bn' ? 'bn' : 'en';
    router.refresh();
  }, [router]);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, dict }), [dict, locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

export function getLocaleDisplayName(locale: Locale) {
  return locale === 'bn' ? 'বাংলা' : 'English';
}
