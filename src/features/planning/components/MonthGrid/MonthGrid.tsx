import { addDays, formatTime, sameDay } from '../../dates'
import { siteColor } from '../../colors'
import type { Shift } from '../../types'
import styles from './MonthGrid.module.css'

const MAX_CHIPS = 3
const WEEKDAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

interface MonthGridProps {
  from: Date
  month: number
  shifts: Shift[]
  siteIds: string[]
  now: Date
  onOpen: (shift: Shift) => void
  onOpenDay: (day: Date) => void
}

/** Vue mensuelle : six semaines, chaque jour liste ses premières vacations. */
export function MonthGrid({ from, month, shifts, siteIds, now, onOpen, onOpenDay }: MonthGridProps) {
  const days = Array.from({ length: 42 }, (_, index) => addDays(from, index))
  const onDay = (day: Date) => {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
    return shifts.filter((shift) => new Date(shift.startsAt).getTime() < start + 24 * 3600 * 1000 && new Date(shift.endsAt).getTime() > start)
  }

  return (
    <div className={styles.grid}>
      {WEEKDAYS.map((name) => (
        <span key={name} className={styles.weekday}>
          {name}
        </span>
      ))}
      {days.map((day) => {
        const items = onDay(day)
        return (
          <div key={day.toISOString()} className={`${styles.cell} ${day.getMonth() === month ? '' : styles.outside}`}>
            <button type="button" className={`${styles.number} ${sameDay(day, now) ? styles.today : ''}`} onClick={() => onOpenDay(day)} title="Voir ce jour">
              {day.getDate()}
            </button>
            {items.slice(0, MAX_CHIPS).map((shift) => (
              <button key={shift.id} type="button" className={styles.chip} style={{ borderLeftColor: siteColor(siteIds, shift.siteId) }} onClick={() => onOpen(shift)} title={`${shift.userName} · ${shift.siteName}`}>
                <span>{formatTime(shift.startsAt)}</span> {shift.userName}
              </button>
            ))}
            {items.length > MAX_CHIPS && (
              <button type="button" className={styles.more} onClick={() => onOpenDay(day)}>
                +{items.length - MAX_CHIPS} autre(s)
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
