import { api, ApiError } from '../../../lib/api'
import type { NewSite, Site, SiteType } from '../types'

interface ApiSite {
  id: string
  name: string
  type: SiteType
  address: string
  createdAt: string
}

/** Abréviation de 3 lettres tirée du nom (« Client A · Usine » → « CLI »). */
const siteCode = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'SIT'

const toSite = (site: ApiSite): Site => ({ ...site, code: siteCode(site.name) })

export async function fetchSites() {
  const { sites } = await api<{ sites: ApiSite[] }>('/sites')
  return sites.map(toSite)
}

/** Renvoie le site, ou undefined s'il n'existe pas (ou plus). */
export async function fetchSite(id: string) {
  try {
    const { site } = await api<{ site: ApiSite }>(`/sites/${encodeURIComponent(id)}`)
    return toSite(site)
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 404) return undefined
    throw failure
  }
}

export async function createSite(input: NewSite) {
  const { site } = await api<{ site: ApiSite }>('/sites', { method: 'POST', body: input })
  return toSite(site)
}
