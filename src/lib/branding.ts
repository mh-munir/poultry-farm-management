import { prisma } from '@/server/db'

export type Branding = {
  name?: string
  logo?: string
}

export async function getBranding(): Promise<Branding | null> {
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: 'branding' } })
    if (!setting?.value) return null
    return typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
  } catch {
    return null
  }
}
