export type SettingValue = any

export async function getSetting(key: string): Promise<SettingValue | null> {
  const res = await fetch(`/api/settings?key=${encodeURIComponent(key)}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  return data?.value ?? null
}

export async function getAllSettings(): Promise<Record<string, SettingValue>> {
  const res = await fetch('/api/settings', { cache: 'no-store' })
  if (!res.ok) return {}
  return await res.json()
}

export async function saveSetting(key: string, value: SettingValue): Promise<boolean> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  })
  return res.ok
}
