import { revalidatePath, revalidateTag } from 'next/cache';

export const CACHE_TAGS = {
  branding: 'branding',
  settings: 'settings',
  companyProfile: 'company-profile',
  parties: 'parties',
  companies: 'companies',
  products: 'products',
  categories: 'product-categories',
  stock: 'stock',
  transactions: 'transactions',
  reports: 'reports',
  dashboard: 'dashboard'
} as const;

export function revalidateTags(tags: Array<(typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]>) {
  for (const tag of tags) {
    revalidateTag(tag);
  }
}

export function revalidateSalesData(partyId?: number) {
  revalidateTags([CACHE_TAGS.transactions, CACHE_TAGS.stock, CACHE_TAGS.reports, CACHE_TAGS.dashboard]);
  revalidatePath('/dashboard/sales');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/reports');
  if (partyId) {
    revalidatePath(`/dashboard/parties/${partyId}`);
  }
}

export function revalidatePurchaseData(args: { partyId?: number | null; companyId?: number | null; path?: string } = {}) {
  revalidateTags([
    CACHE_TAGS.transactions,
    CACHE_TAGS.stock,
    CACHE_TAGS.products,
    CACHE_TAGS.reports,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.companies,
    CACHE_TAGS.parties
  ]);
  revalidatePath(args.path ?? '/dashboard/purchases');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/stock');
  revalidatePath('/dashboard/reports');
  if (args.partyId) {
    revalidatePath('/dashboard/parties');
    revalidatePath(`/dashboard/parties/${args.partyId}`);
  }
  if (args.companyId) {
    revalidatePath('/dashboard/companies');
    revalidatePath(`/dashboard/companies/${args.companyId}`);
  }
}

export function revalidatePartyData(partyId?: number) {
  revalidateTags([CACHE_TAGS.parties, CACHE_TAGS.transactions, CACHE_TAGS.reports, CACHE_TAGS.dashboard]);
  revalidatePath('/dashboard/parties');
  revalidatePath('/dashboard/sales');
  revalidatePath('/dashboard/purchases');
  revalidatePath('/dashboard');
  if (partyId) {
    revalidatePath(`/dashboard/parties/${partyId}`);
  }
}

export function revalidateCompanyData(companyId?: number) {
  revalidateTags([CACHE_TAGS.companies, CACHE_TAGS.products, CACHE_TAGS.reports, CACHE_TAGS.dashboard]);
  revalidatePath('/dashboard/companies');
  revalidatePath('/dashboard/purchases');
  revalidatePath('/dashboard/stock');
  revalidatePath('/dashboard');
  if (companyId) {
    revalidatePath(`/dashboard/companies/${companyId}`);
  }
}

export function revalidateStockData() {
  revalidateTags([CACHE_TAGS.stock, CACHE_TAGS.products, CACHE_TAGS.reports, CACHE_TAGS.dashboard]);
  revalidatePath('/dashboard/stock');
  revalidatePath('/dashboard/stock/feed');
  revalidatePath('/dashboard/stock/Medicine');
  revalidatePath('/dashboard/reports/stock');
  revalidatePath('/dashboard');
}

export function revalidateSettingsData() {
  revalidateTags([CACHE_TAGS.settings, CACHE_TAGS.branding, CACHE_TAGS.companyProfile]);
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/settings/logo');
  revalidatePath('/dashboard/settings/company');
}
