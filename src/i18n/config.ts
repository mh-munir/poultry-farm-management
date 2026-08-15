export const LOCALE_COOKIE = 'locale';
export const DEFAULT_LOCALE = 'en';
export const locales = ['en', 'bn'] as const;

export type Locale = (typeof locales)[number];

export function getLocaleFromValue(value?: string | null): Locale {
  return value === 'bn' ? 'bn' : 'en';
}
