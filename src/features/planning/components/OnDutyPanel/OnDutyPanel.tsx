import { Icon } from '../../../../components/ui'
import { formatTime, sameDay } from '../../dates'
import { siteColor } from '../../colors'
import type { Shift } from '../../types'
import styles from './OnDutyPanel.module.css'

interface OnDutyPanelProps {
  day: Date
  now: Date
  shifts: Shift[]
  siteIds: string[]
  onOpen: (shift: Shift) => void
}

/** « Qui est en poste ? » : maintenant si le jour affiché est aujourd'hui, sinon toutes les vacations de ce jour. */
export function OnDutyPanel({ day, now, shifts, siteIds, onOpen }: OnDutyPanelProps) {
  const today = sameDay(day, now)
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const end = start + 24 * 3600 * 1000
  const instant = now.getTime()

  const list = shifts.filter((shift) => {
    const from = new Date(shift.startsAt).getTime()
    const to = new Date(shift.endsAt).getTime()
    return today ? from <= instant && to > instant : from < end && to > start
  })

  const bySite = new Map<string, Shift[]>()
  for (const shift of list) bySite.set(shift.siteName, [...(bySite.get(shift.siteName) ?? []), shift])

  return (
    <aside className={styles.panel}>
      <header className={styles.head}>
        <Icon name="users" size={18} color="#1f78c1" />
        <h2>{today ? 'En poste maintenant' : `En poste le ${day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}</h2>
      </header>
      <p className={styles.count}>
        {list.length} {list.length > 1 ? 'personnes' : 'personne'}
      </p>

      {list.length === 0 && <p className={styles.empty}>Personne n’est planifié {today ? 'en ce moment' : 'ce jour-là'}.</p>}

      {[...bySite.entries()].map(([siteName, items]) => (
        <section key={siteName}>
          <h3 style={{ borderColor: siteColor(siteIds, items[0].siteId) }}>{siteName}</h3>
          <ul>
            {items.map((shift) => (
              <li key={shift.id}>
                <button type="button" onClick={() => onOpen(shift)}>
                  <strong>{shift.userName}</strong>
                  <small>
                    {formatTime(shift.startsAt)} – {formatTime(shift.endsAt)}
                    {shift.postName ? ` · ${shift.postName}` : ''}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  )
}
