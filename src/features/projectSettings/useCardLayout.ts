import { useState } from 'react'

interface StoredLayout {
  columns: string[][]
  collapsed: string[]
}

const storageKey = (key: string) => `securitec.settings.layout.${key}`

function load(key: string): StoredLayout {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(key)) ?? 'null') as Partial<StoredLayout> | null
    const columns = Array.isArray(stored?.columns) ? stored.columns.map((column) => (Array.isArray(column) ? column.filter((id): id is string => typeof id === 'string') : [])) : []
    return { columns, collapsed: Array.isArray(stored?.collapsed) ? stored.collapsed.filter((id): id is string => typeof id === 'string') : [] }
  } catch {
    return { columns: [], collapsed: [] }
  }
}

/**
 * Disposition des cartes en colonnes. Chaque carte reste dans sa colonne par défaut : elle ne change de place
 * que si l'utilisateur la déplace (le déploiement d'une carte ne fait pas sauter les autres colonnes).
 * Le choix est mémorisé dans le navigateur ; les cartes absentes de la disposition mémorisée gardent leur place par défaut.
 */
export function useCardLayout(key: string, defaults: string[][], available: string[]) {
  const [stored, setStored] = useState(() => load(key))

  // Colonnes affichées : disposition mémorisée si elle existe, sinon celle par défaut ; seules les cartes disponibles.
  const base = stored.columns.length === defaults.length ? stored.columns : defaults
  const placed = new Set(base.flat())
  const columns = base.map((column, index) => [
    ...column.filter((id) => available.includes(id)),
    // Une carte nouvelle ou jamais placée rejoint la colonne qu'elle occupe par défaut.
    ...defaults[index].filter((id) => available.includes(id) && !placed.has(id)),
  ])

  const persist = (next: StoredLayout) => {
    setStored(next)
    localStorage.setItem(storageKey(key), JSON.stringify(next))
  }

  /** Place la carte `id` juste avant la carte `targetId` (dans la colonne de cette dernière). */
  const move = (id: string, targetId: string) => {
    if (id === targetId) return
    const next = columns.map((column) => column.filter((candidate) => candidate !== id))
    const columnIndex = next.findIndex((column) => column.includes(targetId))
    if (columnIndex === -1) return
    next[columnIndex].splice(next[columnIndex].indexOf(targetId), 0, id)
    persist({ ...stored, columns: next })
  }

  /** Dépose la carte à la fin d'une colonne (colonne vide ou zone libre sous les cartes). */
  const moveToColumn = (id: string, columnIndex: number) => {
    const next = columns.map((column) => column.filter((candidate) => candidate !== id))
    next[columnIndex].push(id)
    persist({ ...stored, columns: next })
  }

  const collapsed = new Set(stored.collapsed)
  const toggle = (id: string) => persist({ ...stored, collapsed: collapsed.has(id) ? stored.collapsed.filter((item) => item !== id) : [...stored.collapsed, id] })
  const setAllCollapsed = (value: boolean) => persist({ ...stored, collapsed: value ? available : [] })
  const reset = () => {
    localStorage.removeItem(storageKey(key))
    setStored({ columns: [], collapsed: [] })
  }
  const customized = stored.columns.length > 0 || stored.collapsed.length > 0

  return { columns, move, moveToColumn, collapsed, toggle, setAllCollapsed, reset, customized }
}
