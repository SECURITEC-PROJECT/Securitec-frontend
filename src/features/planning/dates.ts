import type { PlanningView } from './types'

export const DAY_MS = 24 * 3600 * 1000

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes())
/** Lundi de la semaine de `date`. */
export const startOfWeek = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7))
export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Période affichée : un jour, sept jours (lundi → dimanche) ou la grille de six semaines d'un mois. */
export function rangeOf(view: PlanningView, anchor: Date): { from: Date; to: Date } {
  if (view === 'day') return { from: startOfDay(anchor), to: addDays(startOfDay(anchor), 1) }
  if (view === 'week') return { from: startOfWeek(anchor), to: addDays(startOfWeek(anchor), 7) }
  const from = startOfWeek(startOfMonth(anchor))
  return { from, to: addDays(from, 42) }
}

export function shiftAnchor(view: PlanningView, anchor: Date, direction: 1 | -1): Date {
  if (view === 'day') return addDays(anchor, direction)
  if (view === 'week') return addDays(anchor, 7 * direction)
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1)
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function titleOf(view: PlanningView, anchor: Date): string {
  if (view === 'month') return cap(anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
  if (view === 'day') return cap(anchor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  const { from, to } = rangeOf('week', anchor)
  const last = addDays(to, -1)
  const month = (date: Date) => date.toLocaleDateString('fr-FR', { month: 'long' })
  return from.getMonth() === last.getMonth()
    ? `${from.getDate()} – ${last.getDate()} ${month(last)} ${last.getFullYear()}`
    : `${from.getDate()} ${month(from)} – ${last.getDate()} ${month(last)} ${last.getFullYear()}`
}

export const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Valeur d'un champ `datetime-local` (heure locale). */
export const toLocalInput = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
