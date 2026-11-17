import type { BadgeTone } from '../../components/ui'
import type { NewSite, SiteType } from './types'

export const SITE_TYPES: Record<SiteType, { label: string; tone: BadgeTone }> = {
  USINE: { label: 'Usine', tone: 'info' },
  AGENCE: { label: 'Agence', tone: 'primary' },
}

export const SITE_TYPE_OPTIONS = (Object.keys(SITE_TYPES) as SiteType[]).map((type) => ({
  value: type,
  label: SITE_TYPES[type].label,
}))

export const EMPTY_SITE: NewSite = { name: '', type: 'USINE', address: '' }
