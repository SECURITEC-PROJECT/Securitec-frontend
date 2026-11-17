import { createContext, useContext } from 'react'

/** Réglages d'une liste du panneau (filtres, actions) : éléments masqués et ordre choisi. */
export interface SectionPrefs {
  hidden: string[]
  order: string[]
}

export type SidebarPrefs = Record<string, SectionPrefs>

export interface SidebarCustomization {
  /** Mode « personnaliser » : chaque élément affiche ses boutons masquer / déplacer. */
  editing: boolean
  prefs: SidebarPrefs
  toggleHidden: (section: string, id: string) => void
  /** Déplace un élément d'un cran ; `ids` est l'ordre actuellement affiché. */
  move: (section: string, ids: string[], id: string, direction: -1 | 1) => void
}

export const SidebarCustomizationContext = createContext<SidebarCustomization | null>(null)

export const useSidebarCustomization = () => useContext(SidebarCustomizationContext)

export interface Arranged<T> {
  item: T
  id: string
  hidden: boolean
}

/**
 * Applique les réglages à une liste : l'ordre choisi d'abord, les nouveaux éléments ensuite.
 * Hors mode « personnaliser », les éléments masqués disparaissent, sauf `keepId` (ex. le filtre actif).
 */
export function arrange<T>(items: T[], getId: (item: T) => string, prefs: SectionPrefs | undefined, editing: boolean, keepId?: string): Arranged<T>[] {
  const position = (id: string) => {
    const index = prefs?.order.indexOf(id) ?? -1
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  return items
    .map((item, index) => ({ item, id: getId(item), index }))
    .sort((a, b) => position(a.id) - position(b.id) || a.index - b.index)
    .map(({ item, id }) => ({ item, id, hidden: (prefs?.hidden.includes(id) ?? false) && id !== keepId }))
    .filter((entry) => editing || !entry.hidden)
}
