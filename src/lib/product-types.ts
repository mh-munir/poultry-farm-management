export function getProductTypeLabel(type: string, locale: 'en' | 'bn' = 'en'): string {
  const labels = {
    en: {
      FEED: 'Feed',
      MEDICINE: 'Medicine',
      EGG: 'Egg',
      CHICKEN: 'Chicken',
      CHICK: 'Hatchling / Chick',
    },
    bn: {
      FEED: 'খাদ্য',
      MEDICINE: 'ওষুধ',
      EGG: 'ডিম',
      CHICKEN: 'মুরগি',
      CHICK: 'হ্যাচলিং / চিক',
    }
  } as const;

  return labels[locale][type as keyof (typeof labels)[typeof locale]] ?? type;
}

export function getProductTypeBadgeClass(type: string): string {
  if (type === 'FEED') return 'bg-amber-100 text-amber-800';
  if (type === 'MEDICINE') return 'bg-rose-100 text-rose-800';
  if (type === 'EGG') return 'bg-sky-100 text-sky-800';
  if (type === 'CHICKEN') return 'bg-violet-100 text-violet-800';
  if (type === 'CHICK') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-800';
}
