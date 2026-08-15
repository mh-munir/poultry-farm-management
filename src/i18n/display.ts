import { type Locale } from './config';

const banglaTerms: Array<[RegExp, string]> = [
  [/hatchling\s*\/\s*chick/gi, 'বাচ্চা মুরগি'],
  [/chicken/gi, 'মুরগি'],
  [/egg/gi, 'ডিম'],
  [/medicine/gi, 'ওষুধ'],
  [/feeds?/gi, 'খাদ্য'],
  [/pieces?/gi, 'পিস'],
  [/pcs?/gi, 'পিস'],
  [/bags?/gi, 'বস্তা'],
  [/kilograms?|kgs?/gi, 'কেজি'],
  [/grams?|gms?/gi, 'গ্রাম'],
];

/** Translates display-only product terms and units; database values remain unchanged. */
export function localizeProductText(value: string | null | undefined, locale: Locale): string {
  if (!value || locale !== 'bn') return value ?? '';
  return banglaTerms.reduce((text, [pattern, translation]) => text.replace(pattern, translation), value);
}
