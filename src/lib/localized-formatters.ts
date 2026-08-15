/**
 * Centralized locale-aware formatting utilities.
 * 
 * All user-facing numbers, currencies, and dates must use these formatters.
 * They handle both English and Bangla modes appropriately.
 * 
 * Technical identifiers (IDs, email, phone, etc.) should NOT use these.
 */

import { formatDateBD } from './dates';

/**
 * Converts English digits to Bangla numerals (০-৯)
 * Used only when locale is Bangla.
 */
export function convertToBanglaDigits(numberString: string): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return numberString.replace(/\d/g, (digit) => banglaDigits[parseInt(digit, 10)]);
}

/**
 * Format a number as a localized user-facing value.
 * 
 * English: 1250 → 1,250
 * Bangla:  1250 → ১,২৫০
 * 
 * Do NOT use for IDs, technical values, or database identifiers.
 */
export function formatLocalizedNumber(
  value: number | string | null | undefined,
  locale: 'en' | 'bn' = 'en'
): string {
  if (value == null || value === '') return '—';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  // Format with thousands separator using English locale initially
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);

  // Convert to Bangla digits if Bangla locale
  return locale === 'bn' ? convertToBanglaDigits(formatted) : formatted;
}

/**
 * Format currency with locale awareness.
 * 
 * English: ৳ 125,000.00
 * Bangla:  ৳ ১,२५,०००.००
 * 
 * The Taka symbol (৳) remains the same in both modes.
 */
export function formatLocalizedCurrency(
  value: number | string | { toString(): string } | null | undefined,
  locale: 'en' | 'bn' = 'en',
  symbol: string = '৳'
): string {
  if (value == null || value === '') return `${symbol} —`;

  let num: number;
  if (typeof value === 'string') {
    num = parseFloat(value);
  } else if (typeof value === 'object' && value.toString) {
    num = parseFloat(value.toString());
  } else {
    num = value as number;
  }

  if (isNaN(num)) return `${symbol} —`;

  // Format with 2 decimal places
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);

  // Convert to Bangla digits if Bangla locale
  const localizedFormatted = locale === 'bn' ? convertToBanglaDigits(formatted) : formatted;
  return `${symbol} ${localizedFormatted}`;
}

/**
 * Format quantity/count values with locale awareness.
 * 
 * English: 125 pieces
 * Bangla:  १२५ পিস
 */
export function formatLocalizedQuantity(
  value: number | string | null | undefined,
  locale: 'en' | 'bn' = 'en',
  unit: string = ''
): string {
  if (value == null || value === '') return '—';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  // Format the number
  const formatted = Math.floor(num).toString();
  const localizedNum = locale === 'bn' ? convertToBanglaDigits(formatted) : formatted;

  // Return with unit if provided
  return unit ? `${localizedNum} ${unit}` : localizedNum;
}

/**
 * Format date with Bangla digits if in Bangla mode.
 * 
 * English: 13/08/2026
 * Bangla:  १३/०८/२०२६
 */
export function formatLocalizedDate(
  value: Date | string | null | undefined,
  locale: 'en' | 'bn' = 'en'
): string {
  if (value == null || value === '') return '—';

  // Use the existing BD date formatter
  const formatted = formatDateBD(value);

  // Convert to Bangla digits if Bangla locale
  return locale === 'bn' ? convertToBanglaDigits(formatted) : formatted;
}

/**
 * Format a count summary like "Showing 1-10 of 50"
 * 
 * English: Showing 1-10 of 50
 * Bangla:  १–१० এর मধ्यে दिखানो हो रहा है
 * 
 * This should use dictionary keys for localization.
 */
export function formatPaginationText(
  current: number,
  pageSize: number,
  total: number,
  locale: 'en' | 'bn' = 'en'
): string {
  const from = Math.max(1, (current - 1) * pageSize + 1);
  const to = Math.min(total, current * pageSize);

  const fromStr = formatLocalizedNumber(from, locale);
  const toStr = formatLocalizedNumber(to, locale);
  const totalStr = formatLocalizedNumber(total, locale);

  if (locale === 'bn') {
    return `${totalStr}টির মধ্যে ${fromStr}–${toStr}টি দেখানো হচ্ছে`;
  }

  return `Showing ${fromStr}-${toStr} of ${totalStr}`;
}

/**
 * Format a simple count display like "12 Products"
 * This should ideally use dictionary keys for full localization,
 * but this is a fallback format.
 */
export function formatCountDisplay(
  count: number | string | null | undefined,
  label: string,
  locale: 'en' | 'bn' = 'en'
): string {
  if (count == null) return `— ${label}`;

  const countNum = typeof count === 'string' ? parseInt(count, 10) : count;
  if (isNaN(countNum)) return `— ${label}`;

  const formattedCount = formatLocalizedNumber(countNum, locale);

  return `${formattedCount} ${label}`;
}

/**
 * Format ratio/percentage with locale awareness.
 * 
 * English: 45%
 * Bangla:  ४५%
 */
export function formatLocalizedPercentage(
  value: number | string | null | undefined,
  locale: 'en' | 'bn' = 'en'
): string {
  if (value == null || value === '') return '—%';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—%';

  const formatted = num.toFixed(1);
  const localizedFormatted = locale === 'bn' ? convertToBanglaDigits(formatted) : formatted;

  return `${localizedFormatted}%`;
}

/**
 * Format time duration (HH:MM format) with locale awareness.
 */
export function formatLocalizedTime(
  hours: number | string,
  minutes: number | string,
  locale: 'en' | 'bn' = 'en'
): string {
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const formatted = `${h}:${m}`;

  return locale === 'bn' ? convertToBanglaDigits(formatted) : formatted;
}
