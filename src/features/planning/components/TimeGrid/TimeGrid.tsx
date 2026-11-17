import { useEffect, useRef } from 'react'
import { addDays, formatTime, sameDay, startOfDay } from '../../dates'
import { siteColor } from '../../colors'
import type { Shift } from '../../types'
import styles from './TimeGrid.module.css'

const HOUR_PX = 44
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

interface Block {
  shift: Shift
  top: number
  height: number
  lane: number
  lanes: number
}

/** Place les vacations d'un jour côte à côte quand elles se chevauchent (comme un agenda). */
function layoutDay(shifts: Shift[], day: Date): Block[] {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = addDays(startOfDay(day), 1).getTime()
  const items = shifts
    .map((shift) => ({ shift, start: Math.max(new Date(shift.startsAt).getTime(), dayStart), end: Math.min(new Date(shift.endsAt).getTime(), dayEnd) }))
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const blocks: Block[] = []
  let cluster: { item: (typeof items)[number]; lane: number }[] = []
  let clusterEnd = 0
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((entry) => entry.lane + 1))
    for (const { item, lane } of cluster) {
      blocks.push({
        shift: item.shift,
        top: ((item.start - dayStart) / 3600000) * HOUR_PX,
        height: Math.max(((item.end - item.start) / 3600000) * HOUR_PX, 18),
        lane,
        lanes,
      })
    }
    cluster = []
  }
  const laneEnds: number[] = []
  for (const item of items) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flush()
      laneEnds.length = 0
    }
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = item.end
    cluster.push({ item, lane })
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  flush()
  return blocks
}

interface TimeGridProps {
  days: Date[]
  shifts: Shift[]
  siteIds: string[]
  now: Date
  canCreate: boolean
  onCreate: (start: Date) => void
  onOpen: (shift: Shift) => void
  onOpenDay: (day: Date) => void
}

/** Agenda par heures : une colonne par jour, les vacations en blocs colorés par site. */
export function TimeGrid({ days, shifts, siteIds, now, canCreate, onCreate, onOpen, onOpenDay }: TimeGridProps) {
  const scroller = useRef<HTMLDivElement>(null)

  // On démarre la vue à 6 h : les premières heures de la nuit sont rarement le sujet.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = HOUR_PX * 6
  }, [])

  return (
    <div className={styles.grid}>
      <div className={styles.header} style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}>
        <span />
        {days.map((day) => (
          <button key={day.toISOString()} type="button" className={`${styles.dayHead} ${sameDay(day, now) ? styles.today : ''}`} onClick={() => onOpenDay(day)} title="Voir ce jour">
            <small>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</small>
            <strong>{day.getDate()}</strong>
          </button>
        ))}
      </div>

      <div className={styles.scroller} ref={scroller}>
        <div className={styles.body} style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))`, height: HOUR_PX * 24 }}>
          <div className={styles.hours}>
            {HOURS.map((hour) => (
              <span key={hour} style={{ top: hour * HOUR_PX }}>
                {hour > 0 && `${String(hour).padStart(2, '0')}:00`}
              </span>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`${styles.column} ${sameDay(day, now) ? styles.todayColumn : ''}`}
              style={{ backgroundSize: `100% ${HOUR_PX}px` }}
              onClick={(event) => {
                if (!canCreate || event.target !== event.currentTarget) return
                const rect = event.currentTarget.getBoundingClientRect()
                const hour = Math.min(23, Math.floor((event.clientY - rect.top) / HOUR_PX))
                onCreate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour))
              }}
            >
              {layoutDay(shifts, day).map(({ shift, top, height, lane, lanes }) => {
                const color = siteColor(siteIds, shift.siteId)
                return (
                  <button
                    key={`${shift.id}:${top}`}
                    type="button"
                    className={styles.block}
                    style={{ top, height, left: `${(lane / lanes) * 100}%`, width: `${100 / lanes}%`, borderLeftColor: color, background: `${color}22` }}
                    onClick={() => onOpen(shift)}
                    title={`${shift.userName} · ${shift.siteName}${shift.postName ? ` · ${shift.postName}` : ''}\n${formatTime(shift.startsAt)} – ${formatTime(shift.endsAt)}${shift.note ? `\n${shift.note}` : ''}`}
                  >
                    <strong>{shift.userName}</strong>
                    <span>{shift.siteName}</span>
                    {height > 40 && (
                      <small>
                        {formatTime(shift.startsAt)} – {formatTime(shift.endsAt)}
                      </small>
                    )}
                  </button>
                )
              })}
              {sameDay(day, now) && <span className={styles.nowLine} style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_PX }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
