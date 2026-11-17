export type SiteType = 'USINE' | 'AGENCE'

export interface Site {
  id: string
  /** Abréviation affichée sur la carte du site. */
  code: string
  name: string
  type: SiteType
  address: string
  createdAt: string
}

export interface NewSite {
  name: string
  type: SiteType
  address: string
}
