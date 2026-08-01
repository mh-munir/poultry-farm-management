import { cache } from 'react';
import { unstable_cache, revalidateTag } from 'next/cache';
import { prisma } from '@/server/db'
import { CACHE_TAGS } from '@/lib/cache';

export function invalidateBrandingCache() {
  revalidateTag(CACHE_TAGS.branding);
  revalidateTag(CACHE_TAGS.companyProfile);
}

export type Branding = {
  name?: string
  logo?: string
  favicon?: string | null
}

export type InvoiceCompanyProfile = Branding & {
  address?: string
  phone?: string
  website?: string
}

const getBrandingCached = unstable_cache(async (): Promise<Branding | null> => {
  try {
    const setting = await (prisma as any).setting.findUnique({
      where: { key: 'branding' },
      select: { value: true }
    })

    if (!setting?.value) {
      return null
    }

    const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    return {
      name: parsed?.name ?? undefined,
      logo: parsed?.logo ?? undefined,
      favicon: parsed?.favicon ?? undefined
    }
  } catch {
    return null
  }
}, ['branding'], { tags: [CACHE_TAGS.branding], revalidate: 300 });

export const getBranding = cache(getBrandingCached);

const getInvoiceCompanyProfileCached = unstable_cache(async (): Promise<InvoiceCompanyProfile> => {
  const [branding, profileSetting] = await Promise.all([
    getBranding(),
    (prisma as any).setting.findUnique({
      where: { key: 'company_profile' },
      select: { value: true }
    }).catch(() => null)
  ])

  const rawProfile = profileSetting?.value
  const profile = typeof rawProfile === 'string' ? JSON.parse(rawProfile) : rawProfile

  return {
    name: profile?.name ?? branding?.name,
    logo: branding?.logo,
    favicon: branding?.favicon,
    address: profile?.address,
    phone: profile?.phone,
    website: profile?.website
  }
}, ['company-profile'], { tags: [CACHE_TAGS.branding, CACHE_TAGS.companyProfile], revalidate: 300 });

export const getInvoiceCompanyProfile = cache(getInvoiceCompanyProfileCached);
