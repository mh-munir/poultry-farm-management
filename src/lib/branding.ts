import { prisma } from '@/server/db'

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

export async function getBranding(): Promise<Branding | null> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: 'branding' } })
    if (!setting?.value) {
      return null
    }

    const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const branding = {
      name: parsed?.name ?? undefined,
      logo: parsed?.logo ?? undefined,
      favicon: parsed?.favicon ?? undefined
    }

    return branding
  } catch {
    return null
  }
}

export async function getInvoiceCompanyProfile(): Promise<InvoiceCompanyProfile> {
  const [branding, profileSetting] = await Promise.all([
    getBranding(),
    (prisma as any).setting.findUnique({ where: { key: 'company_profile' } }).catch(() => null)
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
}
