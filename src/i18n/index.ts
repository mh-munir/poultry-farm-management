import { en } from './en';
import { bn } from './bn';
import { DEFAULT_LOCALE, getLocaleFromValue, type Locale } from './config';

export const translations = { en, bn } as const;

export function getDictionary(locale: Locale | string | undefined) {
  const safeLocale = getLocaleFromValue(locale);
  return translations[safeLocale];
}

export function getLocaleLabel(locale: Locale | string | undefined) {
  const safeLocale = getLocaleFromValue(locale);
  return safeLocale === 'bn' ? 'বাংলা' : 'English';
}

export function getDefaultLocale() {
  return DEFAULT_LOCALE;
}

export type TranslationDictionary = typeof en;
export { DEFAULT_LOCALE, getLocaleFromValue, type Locale };
