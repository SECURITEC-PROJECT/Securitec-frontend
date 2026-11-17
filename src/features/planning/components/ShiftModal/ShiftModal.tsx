import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Icon, Modal } from '../../../../components/ui'
import { siteColor } from '../../colors'
import type { PlanningOptions, Shift, ShiftInput } from '../../types'
import styles from './ShiftModal.module.css'

/** `shift` = modification ; sinon création avec les valeurs proposées. */
export interface ShiftTarget {
  shift?: Shift
  start: Date
  end: Date
  userId?: string
  siteId?: string
  postId?: string
}

interface ShiftModalProps {
  target: ShiftTarget | null
  options: PlanningOptions
  canUpdate: boolean
  canDelete: boolean
  onSave: (id: string | null, input: ShiftInput) => Promise<void>
  onDelete: (shift: Shift) => Promise<void>
  onClose: () => void
}

/** Horaires types de l'agence : un clic remplit l'heure de début et de fin. */
const PRESETS = [
  { label: 'Matin', from: '06:00', to: '14:00' },
  { label: 'Après-midi', from: '14:00', to: '22:00' },
  { label: 'Nuit', from: '22:00', to: '06:00' },
  { label: 'Journée', from: '08:00', to: '16:00' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const dateValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const timeValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

/** Début et fin réels : si l'heure de fin n'est pas après l'heure de début, la vacation se termine le lendemain (équipe de nuit). */
function resolve(day: string, from: string, to: string) {
  const start = new Date(`${day}T${from}`)
  const end = new Date(`${day}T${to}`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (end <= start) end.setDate(end.getDate() + 1)
  return { start, end }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

export function ShiftModal({ target, options, ...rest }: ShiftModalProps) {
  // Le formulaire repart de zéro à chaque ouverture (la clé change avec la cible).
  return (
    <Modal title={target?.shift ? 'Vacation' : 'Nouvelle vacation'} open={target !== null} onClose={rest.onClose} width={560}>
      {target && <ShiftForm key={target.shift?.id ?? target.start.toISOString()} target={target} options={options} {...rest} />}
    </Modal>
  )
}

function ShiftForm({ target, options, canUpdate, canDelete, onSave, onDelete, onClose }: ShiftModalProps & { target: ShiftTarget }) {
  const { shift } = target
  const first = shift ? new Date(shift.startsAt) : target.start
  const last = shift ? new Date(shift.endsAt) : target.end
  const [userId, setUserId] = useState(shift?.userId ?? target.userId ?? '')
  const [siteId, setSiteId] = useState(shift?.siteId ?? target.siteId ?? options.users.find((user) => user.id === target.userId)?.siteId ?? options.sites[0]?.id ?? '')
  const [postId, setPostId] = useState(shift?.postId ?? target.postId ?? '')
  const [day, setDay] = useState(dateValue(first))
  const [from, setFrom] = useState(timeValue(first))
  const [to, setTo] = useState(timeValue(last))
  const [note, setNote] = useState(shift?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const readOnly = Boolean(shift) && !canUpdate
  const siteIds = options.sites.map((site) => site.id)
  const posts = options.posts.filter((post) => post.siteId === siteId)
  const person = options.users.find((user) => user.id === userId)
  const span = resolve(day, from, to)
  const minutes = span ? Math.round((span.end.getTime() - span.start.getTime()) / 60000) : 0
  const nextDay = span ? span.end.getDate() !== span.start.getDate() : false

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Opération impossible.')
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!userId || !siteId) return setError('Choisissez une personne et un site.')
    if (!span) return setError('Indiquez le jour et les horaires.')
    void run(() => onSave(shift?.id ?? null, { userId, siteId, postId: postId || null, startsAt: span.start.toISOString(), endsAt: span.end.toISOString(), note }))
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <section className={styles.person}>
        <span className={styles.avatar} aria-hidden="true">
          {person ? initials(person.name) : <Icon name="account" size={22} color="var(--color-muted)" />}
        </span>
        <label className={styles.grow}>
          <span>Personne</span>
          <select value={userId} onChange={(event) => setUserId(event.target.value)} disabled={readOnly} required>
            <option value="">Choisir une personne…</option>
            {options.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.matricule})
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.block}>
        <h3>Quand</h3>
        {!readOnly && (
          <div className={styles.presets}>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={from === preset.from && to === preset.to ? styles.presetOn : ''}
                onClick={() => {
                  setFrom(preset.from)
                  setTo(preset.to)
                }}
              >
                {preset.label}
                <small>
                  {preset.from} – {preset.to}
                </small>
              </button>
            ))}
          </div>
        )}
        <div className={styles.when}>
          <label>
            <span>Jour</span>
            <input type="date" value={day} onChange={(event) => setDay(event.target.value)} disabled={readOnly} required />
          </label>
          <label>
            <span>De</span>
            <input type="time" value={from} onChange={(event) => setFrom(event.target.value)} disabled={readOnly} required />
          </label>
          <label>
            <span>À</span>
            <input type="time" value={to} onChange={(event) => setTo(event.target.value)} disabled={readOnly} required />
          </label>
        </div>
        {span && (
          <p className={`${styles.summary} ${minutes > 24 * 60 ? styles.over : ''}`}>
            <Icon name="clock" size={15} />
            {Math.floor(minutes / 60)} h{minutes % 60 ? ` ${pad(minutes % 60)}` : ''}
            {nextDay && ` · se termine le ${span.end.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
          </p>
        )}
      </section>

      <section className={styles.block}>
        <h3>
          Où {shift && siteId !== shift.siteId && <em className={styles.change}>changement de site</em>}
        </h3>
        <div className={styles.where}>
          <label>
            <span>Site</span>
            <span className={styles.siteField}>
              <i style={{ background: siteColor(siteIds, siteId) }} />
              <select
                value={siteId}
                onChange={(event) => {
                  setSiteId(event.target.value)
                  setPostId('')
                }}
                disabled={readOnly}
                required
              >
                {options.sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label>
            <span>Poste de garde</span>
            <select value={postId} onChange={(event) => setPostId(event.target.value)} disabled={readOnly || posts.length === 0}>
              <option value="">{posts.length === 0 ? 'Aucun poste sur ce site' : 'Aucun poste précis'}</option>
              {posts.map((post) => (
                <option key={post.id} value={post.id}>
                  {post.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <label className={styles.block}>
        <h3>Note</h3>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} disabled={readOnly} placeholder="Remplacement, consigne particulière…" />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <footer className={styles.actions}>
        {shift && canDelete && (
          <button type="button" className={styles.delete} disabled={busy} onClick={() => window.confirm('Supprimer cette vacation ?') && void run(() => onDelete(shift))}>
            <Icon name="trash" size={16} color="var(--color-danger)" /> Supprimer
          </button>
        )}
        <span className={styles.grow} />
        <Button type="button" variant="outline" onClick={onClose} className={styles.btn}>
          {readOnly ? 'Fermer' : 'Annuler'}
        </Button>
        {!readOnly && (
          <Button type="submit" disabled={busy} className={styles.btn}>
            {shift ? 'Enregistrer' : 'Ajouter au planning'}
          </Button>
        )}
      </footer>
    </form>
  )
}
