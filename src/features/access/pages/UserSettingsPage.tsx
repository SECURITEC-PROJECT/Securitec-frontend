import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, Switch } from '../../../components/ui'
import { fetchRoles, fetchUsers, updateUser } from '../../../services/access'
import { fetchSites } from '../../sites/services/sites'
import { fetchUserProfile, saveUserProfile } from '../../../services/userProfile'
import type { UserProfile } from '../../../services/userProfile'
import { GridCell } from '../../../components/workspace'
import { SettingsCard } from '../../projectSettings/SettingsCard'
import type { CardChrome } from '../../projectSettings/SettingsCard'
import { SettingsBoard } from '../../projectSettings/SettingsBoard'
import { useCardLayout } from '../../projectSettings/useCardLayout'
import { useCurrentUser, usePermissions } from '../../auth'
import { PermissionsPanel } from '../components/PermissionsPanel'
import { UserDocumentsCard } from '../components/UserDocumentsCard'
import { UserPhotoCard } from '../components/UserPhotoCard'
import type { AccessUser, RoleSummary, UserInput } from '../types'
import styles from './UserSettingsPage.module.css'

type Option = { value: string; label: string }

/** Paramètres d'un utilisateur : profil, rôle, site, état du compte et accès aux permissions, en cartes déplaçables. */
export function UserSettingsPage() {
  const { userId = '' } = useParams()
  const navigate = useNavigate()
  const me = useCurrentUser()
  const { can } = usePermissions()
  const [user, setUser] = useState<AccessUser | null | undefined>()
  const [roles, setRoles] = useState<RoleSummary[]>([])
  const [sites, setSites] = useState<Option[]>([])
  const [profile, setProfile] = useState<UserProfile>()
  const [error, setError] = useState('')
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const layout = useCardLayout(
    `user-${me.id}`,
    [['photo', 'profile', 'role', 'site'], ['contact', 'account'], ['documents']],
    ['photo', 'profile', 'contact', 'documents', 'role', 'site', 'account'],
  )

  useEffect(() => {
    let cancelled = false
    fetchUsers()
      .then((users) => !cancelled && setUser(users.find((candidate) => candidate.id === userId) ?? null))
      .catch((failure: Error) => {
        if (cancelled) return
        setError(failure.message)
        setUser(null)
      })
    fetchUserProfile(userId)
      .then((loaded) => !cancelled && setProfile(loaded))
      .catch((failure: Error) => !cancelled && setError(failure.message))
    // Les listes de rôles et de sites alimentent les listes déroulantes ; sans droit de lecture, elles restent vides.
    fetchRoles()
      .then((loaded) => !cancelled && setRoles(loaded))
      .catch(() => undefined)
    fetchSites()
      .then((loaded) => !cancelled && setSites(loaded.map((site) => ({ value: site.id, label: site.name }))))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [userId])

  if (user === undefined) return <p className={styles.status}>Chargement...</p>
  if (user === null) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || 'Utilisateur introuvable.'}</p>
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>
    )
  }

  const editable = can('users.update')
  const isSelf = user.id === me.id

  /** Enregistre un changement du compte : le Backend exige l'ensemble des champs, on renvoie donc les valeurs actuelles. */
  const save = async (patch: Partial<UserInput>) => {
    setError('')
    try {
      const input: UserInput = {
        name: user.name,
        identifier: user.identifier,
        matricule: user.matricule,
        roleAccessId: user.roleAccessId ?? '',
        siteId: user.siteId,
        pin: '',
        active: user.active,
        ...patch,
      }
      setUser(await updateUser(user.id, input))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
      throw failure
    }
  }

  /** Enregistre un champ de la fiche (prénom, coordonnées) : le Backend remplace la fiche entière. */
  const saveProfile = async (patch: Partial<UserProfile>) => {
    if (!profile) return
    setError('')
    try {
      setProfile(await saveUserProfile(user.id, { ...profile, ...patch }))
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
      throw failure
    }
  }

  const profileText = (key: keyof UserProfile, label: string) => (
    <GridCell
      field={{ key, label, type: 'text' }}
      value={profile?.[key] ?? ''}
      display={profile?.[key] ?? ''}
      options={[]}
      editable={editable && Boolean(profile)}
      showLabel
      onCommit={(value) => saveProfile({ [key]: String(value).trim() })}
    />
  )

  const text = (key: 'name' | 'identifier' | 'matricule', label: string) => (
    <GridCell
      field={{ key, label, type: 'text', required: true }}
      value={user[key]}
      display={user[key]}
      options={[]}
      editable={editable}
      showLabel
      onCommit={(value) => save({ [key]: String(value).trim() })}
    />
  )

  const roleOptions = roles.map((role) => ({ value: role.id, label: role.nom }))
  const siteLabel = user.siteName ?? (user.profile === 1 ? 'Tous les sites' : '—')

  const cards: Record<string, (chrome: CardChrome) => React.ReactNode> = {
    photo: (chrome) => <UserPhotoCard userId={user.id} editable={editable} {...chrome} />,
    profile: (chrome) => (
      <SettingsCard id="profile" title="Profil" icon="account" color="var(--color-muted)" {...chrome}>
        <div className={styles.fields}>
          {text('name', 'Nom')}
          {profileText('firstName', 'Prénom')}
          {text('identifier', 'Identifiant')}
          {text('matricule', 'Matricule')}
          <PinRow editable={editable} onSave={(pin) => save({ pin })} />
        </div>
      </SettingsCard>
    ),
    contact: (chrome) => (
      <SettingsCard id="contact" title="Coordonnées" icon="mail" color="#7939b8" {...chrome}>
        <div className={styles.fields}>
          {profileText('email', 'Email')}
          {profileText('phone', 'Téléphone')}
          {profileText('street', 'Rue')}
          {profileText('street2', 'Rue 2')}
          {profileText('postalCode', 'CP')}
          {profileText('city', 'Ville')}
          {profileText('country', 'Pays')}
        </div>
      </SettingsCard>
    ),
    documents: (chrome) => <UserDocumentsCard userId={user.id} editable={editable} {...chrome} />,
    role: (chrome) => (
      <SettingsCard id="role" title="Rôle affecté" icon="users" color="#1f78c1" {...chrome}>
        {roleOptions.length > 0 ? (
          <GridCell
            field={{ key: 'roleAccessId', label: 'Rôle', type: 'select', required: true }}
            value={user.roleAccessId ?? ''}
            display={user.roleAccessName ?? '—'}
            options={roleOptions}
            editable={editable}
            onCommit={(value) => save({ roleAccessId: String(value) })}
          />
        ) : (
          <p className={styles.value}>{user.roleAccessName ?? '—'}</p>
        )}
        <p className={styles.hint}>Changer de rôle repart des droits du nouveau rôle : les ajustements individuels sont effacés.</p>
      </SettingsCard>
    ),
    site: (chrome) => (
      <SettingsCard id="site" title="Site affecté" icon="post" color="#f5a623" {...chrome}>
        {sites.length > 0 && user.profile !== 1 ? (
          <GridCell
            field={{ key: 'siteId', label: 'Site', type: 'select', required: true }}
            value={user.siteId ?? ''}
            display={siteLabel}
            options={sites}
            editable={editable}
            onCommit={(value) => save({ siteId: String(value) || null })}
          />
        ) : (
          <p className={styles.value}>{siteLabel}</p>
        )}
      </SettingsCard>
    ),
    account: (chrome) => (
      <SettingsCard id="account" title="Compte" icon="shield" color="#2e9e6a" {...chrome}>
        <div className={styles.switchRow}>
          <span>{user.active ? 'Compte actif' : 'Compte désactivé'}</span>
          <Switch
            label="Compte actif"
            state={user.active ? 'on' : 'off'}
            disabled={!can('users.delete') || isSelf}
            onChange={() => {
              if (user.active && !window.confirm(`Désactiver le compte de ${user.name} ? Il ne pourra plus se connecter.`)) return
              void save({ active: !user.active }).catch(() => undefined)
            }}
          />
        </div>
        {isSelf && <p className={styles.hint}>Vous ne pouvez pas désactiver votre propre compte.</p>}
      </SettingsCard>
    ),
  }

  return (
    <SettingsBoard
      title={user.name}
      subtitle="Paramètres de l’utilisateur : photo, profil, coordonnées, documents, rôle et compte. Les cartes ne bougent que si vous les déplacez."
      layout={layout}
      toolbar={
        <>
          <button type="button" className={styles.tool} onClick={() => setPermissionsOpen(true)} title="Permissions" aria-label="Permissions">
            <Icon name="key" size={22} color="#d32f2f" />
          </button>
          <button type="button" className={styles.tool} onClick={() => navigate(-1)} title="Retour" aria-label="Retour">
            <Icon name="prev" size={22} color="#7939b8" />
          </button>
        </>
      }
      renderCard={(id, chrome) => cards[id]?.(chrome)}
    >
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <PermissionsPanel user={user} open={permissionsOpen} onClose={() => setPermissionsOpen(false)} />
    </SettingsBoard>
  )
}

/** Ligne « Code PIN » : on saisit un nouveau PIN à 6 chiffres ; l'ancien n'est jamais affiché. */
function PinRow({ editable, onSave }: { editable: boolean; onSave: (pin: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async () => {
    if (!/^\d{6}$/.test(pin)) return setError('Le PIN doit contenir exactement 6 chiffres.')
    try {
      await onSave(pin)
      setEditing(false)
      setPin('')
      setError('')
      setNotice('PIN modifié.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Modification impossible.')
    }
  }

  if (!editing) {
    return (
      <div className={styles.pin}>
        <span className={styles.pinLabel}>Code PIN</span>
        <span>••••••</span>
        {editable && (
          <button type="button" className={styles.link} onClick={() => { setEditing(true); setNotice('') }}>
            Réinitialiser
          </button>
        )}
        {notice && <span className={styles.notice}>{notice}</span>}
      </div>
    )
  }

  return (
    <div className={styles.pin}>
      <span className={styles.pinLabel}>Code PIN</span>
      <input
        className={styles.pinInput}
        type="password"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        autoComplete="new-password"
        value={pin}
        placeholder="6 chiffres"
        onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void submit()
          if (event.key === 'Escape') setEditing(false)
        }}
      />
      <button type="button" className={styles.link} onClick={() => void submit()}>
        Enregistrer
      </button>
      <button type="button" className={styles.link} onClick={() => setEditing(false)}>
        Annuler
      </button>
      {error && <span className={styles.errorInline}>{error}</span>}
    </div>
  )
}
