import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../../components/layout/PageHeader'
import { Button, Icon } from '../../../components/ui'
import { usePermissions } from '../../auth'
import { MonthGrid } from '../components/MonthGrid'
import { OnDutyPanel } from '../components/OnDutyPanel'
import { ShiftModal } from '../components/ShiftModal'
import type { ShiftTarget } from '../components/ShiftModal'
import { TimeGrid } from '../components/TimeGrid'
import { siteColor } from '../colors'
import { addDays, rangeOf, shiftAnchor, sameDay, startOfDay, titleOf } from '../dates'
import { createShift, deleteShift, fetchPlanningOptions, fetchShifts, updateShift } from '../services'
import type { PlanningOptions, PlanningView, Shift, ShiftInput } from '../types'
import styles from './PlanningPage.module.css'

const EMPTY_OPTIONS: PlanningOptions = { users: [], sites: [], posts: [] }

/** Planning de toute l'agence : qui est en poste, sur quel site, à quelle date. */
export function PlanningPage() {
  const { can } = usePermissions()
  const [view, setView] = useState<PlanningView>('week')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [siteFilter, setSiteFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [options, setOptions] = useState<PlanningOptions>(EMPTY_OPTIONS)
  const [shifts, setShifts] = useState<Shift[]>([])
  // Clé de la dernière requête terminée : tant qu'elle diffère de la période affichée, on charge.
  const [loadedKey, setLoadedKey] = useState('')
  const [error, setError] = useState('')
  const [target, setTarget] = useState<ShiftTarget | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [now, setNow] = useState(() => new Date())

  // « Maintenant » avance : la ligne de l'heure et la liste des personnes en poste se mettent à jour chaque minute.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchPlanningOptions()
      .then(setOptions)
      .catch((failure: Error) => setError(failure.message))
  }, [])

  const range = useMemo(() => rangeOf(view, anchor), [view, anchor])

  const requestKey = `${range.from.toISOString()}|${siteFilter}|${userFilter}|${reloadKey}`
  const loading = loadedKey !== requestKey

  useEffect(() => {
    let cancelled = false
    fetchShifts(range.from, range.to, { siteId: siteFilter || undefined, userId: userFilter || undefined })
      .then((loaded) => {
        if (cancelled) return
        setShifts(loaded)
        setError('')
      })
      .catch((failure: Error) => !cancelled && setError(failure.message))
      .finally(() => !cancelled && setLoadedKey(requestKey))
    return () => {
      cancelled = true
    }
  }, [range, siteFilter, userFilter, requestKey])

  const siteIds = useMemo(() => options.sites.map((site) => site.id), [options.sites])
  const days = useMemo(() => Array.from({ length: view === 'day' ? 1 : 7 }, (_, index) => addDays(range.from, index)), [view, range])
  const panelDay = view === 'day' ? anchor : now >= range.from && now < range.to ? now : range.from

  const canCreate = can('planning.create')
  const reload = () => setReloadKey((key) => key + 1)

  const newShift = (start: Date): ShiftTarget => ({ start, end: new Date(start.getTime() + 8 * 3600 * 1000), userId: userFilter || undefined, siteId: siteFilter || undefined })
  const defaultStart = () => {
    const day = view === 'day' ? anchor : sameDay(anchor, now) || (now >= range.from && now < range.to) ? now : range.from
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8)
  }

  const handleSave = async (id: string | null, input: ShiftInput) => {
    if (id) await updateShift(id, input)
    else await createShift(input)
    setTarget(null)
    reload()
  }

  const handleDelete = async (shift: Shift) => {
    await deleteShift(shift.id)
    setTarget(null)
    reload()
  }

  const openDay = (day: Date) => {
    setAnchor(startOfDay(day))
    setView('day')
  }

  const open = (shift: Shift) => setTarget({ shift, start: new Date(shift.startsAt), end: new Date(shift.endsAt) })

  return (
    <div className={styles.page}>
      <PageHeader
        title="Planning"
        subtitle="Qui est en poste, sur quel site et à quelle date. Un changement de site se fait en modifiant la vacation."
        actions={
          canCreate && (
            <Button type="button" onClick={() => setTarget(newShift(defaultStart()))} disabled={options.users.length === 0}>
              Nouvelle vacation
            </Button>
          )
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <button type="button" onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} aria-label="Précédent">
            <Icon name="prev" size={20} />
          </button>
          <button type="button" className={styles.todayButton} onClick={() => setAnchor(startOfDay(new Date()))}>
            Aujourd’hui
          </button>
          <button type="button" onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} aria-label="Suivant">
            <Icon name="next" size={20} />
          </button>
          <h2>{titleOf(view, anchor)}</h2>
        </div>

        <div className={styles.filters}>
          <select value={view} onChange={(event) => setView(event.target.value as PlanningView)} aria-label="Affichage">
            <option value="day">Jour</option>
            <option value="week">Semaine</option>
            <option value="month">Mois</option>
          </select>
          <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)} aria-label="Filtrer par site">
            <option value="">Tous les sites</option>
            {options.sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} aria-label="Filtrer par personne">
            <option value="">Tout le personnel</option>
            {options.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {options.sites.length > 0 && (
        <ul className={styles.legend}>
          {options.sites.map((site) => (
            <li key={site.id}>
              <span style={{ background: siteColor(siteIds, site.id) }} /> {site.name}
            </li>
          ))}
        </ul>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.layout}>
        <div className={styles.main} aria-busy={loading}>
          {view === 'month' ? (
            <MonthGrid from={range.from} month={anchor.getMonth()} shifts={shifts} siteIds={siteIds} now={now} onOpen={open} onOpenDay={openDay} />
          ) : (
            <TimeGrid days={days} shifts={shifts} siteIds={siteIds} now={now} canCreate={canCreate} onCreate={(start) => setTarget(newShift(start))} onOpen={open} onOpenDay={openDay} />
          )}
          {loading && <p className={styles.status}>Chargement...</p>}
        </div>
        <OnDutyPanel day={panelDay} now={now} shifts={shifts} siteIds={siteIds} onOpen={open} />
      </div>

      <ShiftModal target={target} options={options} canUpdate={can('planning.update')} canDelete={can('planning.delete')} onSave={handleSave} onDelete={handleDelete} onClose={() => setTarget(null)} />
    </div>
  )
}
