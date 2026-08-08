export function getProductTypeLabel(type: string): string {
  if (type === 'FEED') return 'Feed';
  if (type === 'MEDICINE') return 'Medicine';
  if (type === 'EGG') return 'Egg';
  if (type === 'CHICKEN') return 'Chicken';
  if (type === 'CHICK') return 'Hatchling / Chick';
  return type;
}

export function getProductTypeBadgeClass(type: string): string {
  if (type === 'FEED') return 'bg-amber-100 text-amber-800';
  if (type === 'MEDICINE') return 'bg-rose-100 text-rose-800';
  if (type === 'EGG') return 'bg-sky-100 text-sky-800';
  if (type === 'CHICKEN') return 'bg-violet-100 text-violet-800';
  if (type === 'CHICK') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-800';
}
