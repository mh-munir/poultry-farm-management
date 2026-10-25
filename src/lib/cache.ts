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

function revalidatePaths(paths: string[]) {
  for (const path of new Set(paths)) {
    revalidatePath(path);
  }
}

export function revalidateTags(tags: Array<(typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]>) {
  for (const tag of new Set(tags)) {
    revalidateTag(tag);
  }
}

export function revalidateSalesData(partyId?: number) {
  revalidateTags([CACHE_TAGS.transactions, CACHE_TAGS.stock, CACHE_TAGS.reports, CACHE_TAGS.dashboard]);
  revalidatePaths(['/dashboard/sales', '/dashboard', '/dashboard/reports']);
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
  revalidatePaths([args.path ?? '/dashboard/purchases', '/dashboard', '/dashboard/reports']);
  if (args.partyId) {
    revalidatePaths(['/dashboard/parties', `/dashboard/parties/${args.partyId}`]);
  }
  if (args.companyId) {
    revalidatePaths(['/dashboard/companies', `/dashboard/companies/${args.companyId}`]);
  }
}

export function revalidatePartyData(partyId?: number) {
  revalidateTags([CACHE_TAGS.parties, CACHE_TAGS.transactions, CACHE_TAGS.reports, CACHE_TAGS.dashboard]);
  revalidatePaths(['/dashboard/parties', '/dashboard/sales', '/dashboard/purchases', '/dashboard']);
  if (partyId) {
    revalidatePath(`/dashboard/parties/${partyId}`);
  }
}

export function revalidateCompanyData(companyId?: number) {
  revalidateTags([CACHE_TAGS.companies, CACHE_TAGS.products, CACHE_TAGS.reports, CACHE_TAGS.dashboard]);
  revalidatePaths(['/dashboard/companies', '/dashboard/purchases', '/dashboard']);
  if (companyId) {
    revalidatePath(`/dashboard/companies/${companyId}`);
  }
}

export function revalidateStockItemData({ companyIds = [] }: { companyIds?: number[] } = {}) {
  revalidateTags([CACHE_TAGS.stock, CACHE_TAGS.products, CACHE_TAGS.reports, CACHE_TAGS.dashboard]);
  revalidatePaths([
    '/dashboard/reports/stock',
    '/dashboard/companies',
    '/dashboard',
    ...companyIds.map((id) => `/dashboard/companies/${id}`)
  ]);
}

/** Invalidate all views affected by deleting/editing one party transaction. */
export function revalidateTransactionData({
  partyId,
  companyId
}: { partyId?: number | null; companyId?: number | null } = {}) {
  revalidateTags([
    CACHE_TAGS.transactions,
    CACHE_TAGS.stock,
    CACHE_TAGS.products,
    CACHE_TAGS.reports,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.parties,
    CACHE_TAGS.companies
  ]);
  revalidatePaths([
    '/dashboard/sales',
    '/dashboard/purchases',
    '/dashboard/parties',
    '/dashboard/companies',
    '/dashboard/reports',
    '/dashboard',
    ...(partyId ? [`/dashboard/parties/${partyId}`] : []),
    ...(companyId ? [`/dashboard/companies/${companyId}`] : [])
  ]);
}

/** Invalidate inventory plus every account view touched by a stock deletion. */
export function revalidateInventoryData({
  companyIds = [],
  partyIds = []
}: { companyIds?: number[]; partyIds?: number[] } = {}) {
  revalidateTags([
    CACHE_TAGS.transactions,
    CACHE_TAGS.stock,
    CACHE_TAGS.products,
    CACHE_TAGS.reports,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.parties,
    CACHE_TAGS.companies
  ]);
  revalidatePaths([
    '/dashboard/reports/stock',
    '/dashboard/purchases',
    '/dashboard/parties',
    '/dashboard/companies',
    '/dashboard/reports',
    '/dashboard',
    ...partyIds.map((id) => `/dashboard/parties/${id}`),
    ...companyIds.map((id) => `/dashboard/companies/${id}`)
  ]);
}

export function revalidateSettingsData() {
  revalidateTags([CACHE_TAGS.settings, CACHE_TAGS.branding, CACHE_TAGS.companyProfile]);
  revalidatePaths(['/', '/dashboard', '/dashboard/settings', '/dashboard/settings/logo', '/dashboard/settings/company']);
}
