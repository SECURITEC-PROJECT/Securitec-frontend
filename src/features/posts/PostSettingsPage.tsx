import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCurrentSite } from '../../components/layout/SiteLayout/useCurrentSite'
import { Button, Icon, Switch } from '../../components/ui'
import { GridCell } from '../../components/workspace'
import { AddSheetModal } from '../sheets'
import { createShift, fetchPlanningOptions, ShiftModal } from '../planning'
import type { PlanningOptions, ShiftTarget } from '../planning'
import { fetchPostSheets } from '../sheets/services/sheets'
import { fetchAssignableUsers, fetchPosts, updatePost } from '../../services/directories'
import type { ApiPost, AssignableUser } from '../../services/directories'
import { useCurrentUser, usePermissions } from '../auth'
import { SettingsBoard } from '../projectSettings/SettingsBoard'
import { SettingsCard } from '../projectSettings/SettingsCard'
import type { CardChrome } from '../projectSettings/SettingsCard'
import { useCardLayout } from '../projectSettings/useCardLayout'
import styles from './PostSettingsPage.module.css'

const clock = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Horaires de travail d'un utilisateur sur le poste : « Aujourd'hui 06:00 – 14:00 · mar. 17 nov. 22:00 – 06:00 ». */
function describeShifts(shifts: { startsAt: string; endsAt: string }[]) {
  if (shifts.length === 0) return 'Non planifié (aucun horaire dans les 7 prochains jours)'
  const today = new Date().toDateString()
  const label = (shift: { startsAt: string; endsAt: string }) => {
    const start = new Date(shift.startsAt)
    const day = start.toDateString() === today ? 'Aujourd’hui' : start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    return `${day} ${clock(shift.startsAt)} – ${clock(shift.endsAt)}`
  }
  const shown = shifts.slice(0, 3).map(label).join(' · ')
  return shifts.length > 3 ? `${shown} · +${shifts.length - 3}` : shown
}

/** Paramètres d'un poste de garde : profil (nom, site) et état, en cartes déplaçables. */
export function PostSettingsPage() {
  const { postId = '' } = useParams()
  const navigate = useNavigate()
  const site = useCurrentSite()
  const me = useCurrentUser()
  const { can } = usePermissions()
  const [post, setPost] = useState<ApiPost | null | undefined>()
  const [users, setUsers] = useState<AssignableUser[]>([])
  const [error, setError] = useState('')
  const [addingSheet, setAddingSheet] = useState(false)
  const [planning, setPlanning] = useState<{ target: ShiftTarget; options: PlanningOptions }>()
  const layout = useCardLayout(`post-${me.id}`, [['profile', 'user'], ['sheets', 'state'], []], ['profile', 'user', 'sheets', 'state'])

  useEffect(() => {
    let cancelled = false
    fetchPosts()
      .then((posts) => !cancelled && setPost(posts.find((candidate) => candidate.id === postId && candidate.siteId === site.id) ?? null))
      .catch((failure: Error) => {
        if (cancelled) return
        setError(failure.message)
        setPost(null)
      })
    return () => {
      cancelled = true
    }
  }, [postId, site.id])

  // Les comptes du site alimentent la liste d'affectation ; sans droit de lecture, elle reste vide.
  useEffect(() => {
    let cancelled = false
    fetchAssignableUsers(site.id)
      .then((loaded) => !cancelled && setUsers(loaded))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [site.id])

  /** Relit le poste : les affectations et les horaires viennent du serveur (ils dépendent aussi du planning). */
  const reload = async () => {
    const posts = await fetchPosts()
    setPost(posts.find((candidate) => candidate.id === postId && candidate.siteId === site.id) ?? null)
  }

  const backToList = () => navigate(`/sites/${site.id}/postes`)

  if (post === undefined) return <p className={styles.status}>Chargement...</p>
  if (post === null) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || 'Poste introuvable.'}</p>
        <Button type="button" variant="secondary" onClick={backToList}>
          Retour
        </Button>
      </div>
    )
  }

  const editable = can('administration.update')

  /** Enregistre un changement : l'API exige le nom et l'état, on renvoie donc les valeurs actuelles. */
  const save = async (patch: Partial<Pick<ApiPost, 'nom' | 'actif'>> & { userIds?: string[] }) => {
    setError('')
    try {
      const next = { nom: post.nom, actif: post.actif, userIds: post.users.map((user) => user.id), ...patch }
      await updatePost(post.id, next.nom, next.actif, next.userIds)
      await reload()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
      throw failure
    }
  }

  const canPlan = can('planning.create')
  const plan = async (userId: string) => {
    try {
      const options = await fetchPlanningOptions()
      const day = new Date()
      setPlanning({ options, target: { userId, siteId: post.siteId, postId: post.id, start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8), end: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 16) } })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Planning indisponible.')
    }
  }

  const cards: Record<string, (chrome: CardChrome) => ReactNode> = {
    profile: (chrome) => (
      <SettingsCard id="profile" title="Profil du poste" icon="post" color="#f5a623" {...chrome}>
        <div className={styles.fields}>
          <GridCell
            field={{ key: 'nom', label: 'Nom', type: 'text', required: true }}
            value={post.nom}
            display={post.nom}
            options={[]}
            editable={editable}
            showLabel
            onCommit={(value) => save({ nom: String(value).trim() })}
          />
          <p className={styles.value}>
            <span className={styles.hint}>Site : </span>
            {post.siteName}
          </p>
        </div>
      </SettingsCard>
    ),
    user: (chrome) => {
      const assigned = new Set(post.users.map((user) => user.id))
      const available = users.filter((user) => !assigned.has(user.id))
      const change = (userIds: string[]) => void save({ userIds }).catch(() => undefined)
      return (
        <SettingsCard id="user" title="Utilisateurs affectés" icon="users" color="#1f78c1" {...chrome}>
          {post.users.length === 0 ? (
            <p className={styles.hint}>Aucun utilisateur affecté : personne ne peut voir les feuilles de saisie de ce poste.</p>
          ) : (
            <ul className={styles.assignees}>
              {post.users.map((user) => (
                <li key={user.id} className={styles.assignee}>
                  <Icon name="account" size={18} color="var(--color-muted)" />
                  <span className={styles.who}>
                    {user.name}
                    <small className={user.shifts.length === 0 ? styles.unplanned : undefined}>{describeShifts(user.shifts)}</small>
                  </span>
                  {canPlan && (
                    <button type="button" onClick={() => void plan(user.id)} aria-label={`Planifier ${user.name}`} title="Planifier (jour, horaires)">
                      <Icon name="clock" size={16} color="#f5a623" />
                    </button>
                  )}
                  {editable && (
                    <button type="button" onClick={() => change(post.users.filter((candidate) => candidate.id !== user.id).map((candidate) => candidate.id))} aria-label={`Retirer ${user.name}`} title="Retirer du poste">
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <select
              className={styles.addUser}
              value=""
              aria-label="Ajouter un utilisateur au poste"
              disabled={available.length === 0}
              onChange={(event) => event.target.value && change([...post.users.map((user) => user.id), event.target.value])}
            >
              <option value="">{available.length === 0 ? 'Tous les comptes du site sont affectés' : '+ Ajouter un utilisateur…'}</option>
              {available.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          )}
          <p className={styles.hint}>Être planifié sur ce poste dans le planning l’affecte automatiquement ici. Seuls les utilisateurs affectés voient et remplissent les feuilles de saisie du poste.</p>
        </SettingsCard>
      )
    },
    sheets: (chrome) => (
      <SettingsCard
        id="sheets"
        title="Feuilles de saisie"
        icon="clipboard"
        color="#2e9e6a"
        onAdd={editable ? () => setAddingSheet(true) : undefined}
        onManage={can('sheets.view') ? () => navigate(`/sites/${site.id}/feuilles`) : undefined}
        load={async () =>
          (await fetchPostSheets(post.id)).map((sheet) => ({
            id: sheet.id,
            label: sheet.name,
            sub: `${sheet.columns.length} colonne${sheet.columns.length > 1 ? 's' : ''}`,
            onClick: () => navigate(`/sites/${site.id}/postes/${post.id}/feuilles/${sheet.id}`),
          }))
        }
        {...chrome}
      />
    ),
    state: (chrome) => (
      <SettingsCard id="state" title="État" icon="shield" color="#2e9e6a" {...chrome}>
        <div className={styles.switchRow}>
          <span>{post.actif ? 'Poste actif' : 'Poste désactivé'}</span>
          <Switch
            label="Poste actif"
            state={post.actif ? 'on' : 'off'}
            disabled={!editable}
            onChange={() => {
              if (post.actif && !window.confirm(`Désactiver le poste « ${post.nom} » ?`)) return
              void save({ actif: !post.actif }).catch(() => undefined)
            }}
          />
        </div>
      </SettingsCard>
    ),
  }

  return (
    <SettingsBoard
      title={post.nom}
      subtitle={`Paramètres du poste de garde de ${site.name}. Les cartes ne bougent que si vous les déplacez.`}
      layout={layout}
      toolbar={
        <button type="button" className={styles.tool} onClick={backToList} title="Retour à la liste" aria-label="Retour à la liste">
          <Icon name="prev" size={22} color="#7939b8" />
        </button>
      }
      renderCard={(id, chrome) => cards[id]?.(chrome)}
    >
      <AddSheetModal
        open={addingSheet}
        post={{ id: post.id, name: post.nom }}
        onClose={() => setAddingSheet(false)}
        onCreated={(sheet) => navigate(`/sites/${site.id}/postes/${post.id}/feuilles/${sheet.id}`)}
      />
      <ShiftModal
        target={planning?.target ?? null}
        options={planning?.options ?? { users: [], sites: [], posts: [] }}
        canUpdate={false}
        canDelete={false}
        onSave={async (_id, input) => {
          await createShift(input)
          setPlanning(undefined)
          await reload()
        }}
        onDelete={async () => undefined}
        onClose={() => setPlanning(undefined)}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </SettingsBoard>
  )
}
