import { prisma } from '@/server/db'

export type Branding = {
  name?: string
  logo?: string
  favicon?: string | null
}

export async function getBranding(): Promise<Branding | null> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: 'branding' } })
    if (!setting?.value) {
      console.log('[branding-debug] getBranding -> no setting value')
      return null
    }

    const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
    if (!parsed || typeof parsed !== 'object') {
      console.log('[branding-debug] getBranding -> invalid parsed branding', { parsed })
      return null
    }

    const branding = {
      name: parsed?.name ?? undefined,
      logo: parsed?.logo ?? undefined,
      favicon: parsed?.favicon ?? undefined
    }

    console.log('[branding-debug] getBranding -> resolved branding', branding)
    return branding
  } catch (error) {
    console.log('[branding-debug] getBranding -> error', error)
    return null
  }
}
