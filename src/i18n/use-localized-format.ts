'use client';

import { useLocale } from './provider';
import {
  formatLocalizedNumber,
  formatLocalizedCurrency,
  formatLocalizedQuantity,
  formatLocalizedDate,
  formatPaginationText,
  formatCountDisplay,
  formatLocalizedPercentage,
  formatLocalizedTime,
  convertToBanglaDigits,
} from '@/lib/localized-formatters';

/**
 * Hook that provides locale-aware formatting utilities.
 * 
 * Usage:
 * ```tsx
 * const { formatCurrency, formatNumber, formatDate, locale } = useLocalizedFormat();
 * 
 * return (
 *   <>
 *     <div>{formatCurrency(12500)}</div>
 *     <div>{formatNumber(1250)}</div>
 *     <div>{formatDate(new Date())}</div>
 *   </>
 * );
 * ```
 */
export function useLocalizedFormat() {
  const { locale } = useLocale();
  const currentLocale = (locale === 'bn' ? 'bn' : 'en') as 'en' | 'bn';

  return {
    locale: currentLocale,
    // Number formatting
    formatNumber: (value: number | string | null | undefined) =>
      formatLocalizedNumber(value, currentLocale),
    
    // Currency formatting
    formatCurrency: (
      value: number | string | { toString(): string } | null | undefined,
      symbol?: string
    ) => formatLocalizedCurrency(value, currentLocale, symbol),
    
    // Quantity/unit formatting
    formatQuantity: (
      value: number | string | null | undefined,
      unit?: string
    ) => formatLocalizedQuantity(value, currentLocale, unit),
    
    // Date formatting
    formatDate: (value: Date | string | null | undefined) =>
      formatLocalizedDate(value, currentLocale),
    
    // Pagination text
    formatPagination: (current: number, pageSize: number, total: number) =>
      formatPaginationText(current, pageSize, total, currentLocale),
    
    // Count display ("12 Products")
    formatCount: (count: number | string | null | undefined, label: string) =>
      formatCountDisplay(count, label, currentLocale),
    
    // Percentage formatting
    formatPercentage: (value: number | string | null | undefined) =>
      formatLocalizedPercentage(value, currentLocale),
    
    // Time formatting
    formatTime: (hours: number | string, minutes: number | string) =>
      formatLocalizedTime(hours, minutes, currentLocale),
    
    // Utility: convert to Bangla digits
    toBanglaDigits: convertToBanglaDigits,
    
    // Check if Bangla mode
    isBangla: currentLocale === 'bn',
    isEnglish: currentLocale === 'en',
  };
}
