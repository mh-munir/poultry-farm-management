export const BDT_TIMEZONE = 'Asia/Dhaka';

function partsFor(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: BDT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return { year, month, day };
}

export function formatDateBD(value: Date | string) {
  if (value == null || value === '') return '';

  // If value is a simple date-only string 'YYYY-MM-DD', preserve that exact date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  const { year, month, day } = partsFor(date);
  return `${day}/${month}/${year}`;
}

export function formatDateTimeBD(value: Date | string) {
  if (value == null || value === '') return '';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + 'T00:00:00')
    : new Date(value);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: BDT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  // format gives 'dd/mm/yyyy, HH:MM' in en-GB; normalize to 'dd/mm/yyyy HH:MM'
  return fmt.format(date).replace(',', '');
}

export function isBangladeshToday(value: Date | string) {
  if (value == null || value === '') return false;
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + 'T00:00:00')
    : new Date(value);

  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: BDT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(date) === fmt.format(new Date());
}

export function todayDateInputValueBD() {
  const { year, month, day } = partsFor(new Date());
  return `${year}-${month}-${day}`; // YYYY-MM-DD for input[type=date]
}

export function toDateInputValueBD(value: Date | string) {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === 'string' ? new Date(value) : value;
  const { year, month, day } = partsFor(date);
  return `${year}-${month}-${day}`;
}
