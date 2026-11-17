import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Checkbox, Modal, Select, TextField } from '../../../../components/ui'
import type { Site } from '../../../sites'
import type { AccessUser, RoleSummary, UserInput } from '../../types'
import styles from './UserFormModal.module.css'

export type UserTarget = { mode: 'new' } | { mode: 'edit'; user: AccessUser }

interface UserFormModalProps {
  target: UserTarget | null
  roles: RoleSummary[]
  sites: Site[]
  /** Site ouvert : un nouvel utilisateur lui est rattaché d'office (le choix du site est alors verrouillé). */
  currentSiteId?: string
  onSave: (id: string | null, input: UserInput) => Promise<void>
  onClose: () => void
}

export function UserFormModal({ target, roles, sites, currentSiteId, onSave, onClose }: UserFormModalProps) {
  return (
    <Modal title={target?.mode === 'edit' ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'} open={target !== null} onClose={onClose}>
      {target && (
        <UserForm key={target.mode === 'edit' ? target.user.id : 'new'} target={target} roles={roles} sites={sites} currentSiteId={currentSiteId} onSave={onSave} />
      )}
    </Modal>
  )
}

function UserForm({ target, roles, sites, currentSiteId, onSave }: Omit<UserFormModalProps, 'onClose' | 'target'> & { target: UserTarget }) {
  const user = target.mode === 'edit' ? target.user : null
  const [form, setForm] = useState<UserInput>({
    name: user?.name ?? '',
    identifier: user?.identifier ?? '',
    matricule: user?.matricule ?? '',
    // Rôle par défaut : le moins privilégié (Agent APS), jamais l'Administrateur.
    roleAccessId: user?.roleAccessId ?? (roles.find((role) => role.code === 'agent_aps') ?? roles.find((role) => role.profilBase !== 1) ?? roles[0])?.id ?? '',
    siteId: user?.siteId ?? currentSiteId ?? null,
    pin: '',
    active: user?.active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const role = roles.find((candidate) => candidate.id === form.roleAccessId)
  const needsSite = role?.profilBase !== 1
  // Création depuis un site ouvert : le compte appartient à ce site.
  const siteLocked = !user && currentSiteId !== undefined

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(user?.id ?? null, { ...form, siteId: needsSite ? form.siteId : null })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement impossible.')
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <TextField label="Nom" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <TextField
        label="Identifiant de connexion"
        required
        autoComplete="off"
        value={form.identifier}
        onChange={(event) => setForm({ ...form, identifier: event.target.value })}
      />
      <TextField
        label="Matricule (propre à chaque utilisateur)"
        required
        autoComplete="off"
        maxLength={50}
        pattern="[A-Za-z0-9][A-Za-z0-9._/\-]*"
        title="Lettres, chiffres et . - _ / uniquement"
        value={form.matricule}
        onChange={(event) => setForm({ ...form, matricule: event.target.value })}
      />
      <p className={styles.hint}>L'identifiant et le matricule permettent tous deux de se connecter.</p>
      <Select
        label="Rôle"
        value={form.roleAccessId}
        options={roles.map((candidate) => ({ value: candidate.id, label: candidate.nom }))}
        onChange={(event) => setForm({ ...form, roleAccessId: event.target.value })}
      />
      {needsSite && (
        <Select
          label={siteLocked ? 'Site (le site ouvert)' : 'Site'}
          required
          disabled={siteLocked}
          value={form.siteId ?? ''}
          options={[{ value: '', label: 'Choisir un site…' }, ...sites.map((site) => ({ value: site.id, label: site.name }))]}
          onChange={(event) => setForm({ ...form, siteId: event.target.value || null })}
        />
      )}
      <TextField
        label={user ? 'Nouveau code PIN (laisser vide pour ne pas changer)' : 'Code PIN (6 chiffres)'}
        required={!user}
        inputMode="numeric"
        maxLength={6}
        pattern={user ? '(\\d{6})?' : '\\d{6}'}
        autoComplete="new-password"
        value={form.pin}
        onChange={(event) => setForm({ ...form, pin: event.target.value.replace(/\D/g, '') })}
      />
      {user && <Checkbox label="Compte actif" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />}
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" disabled={saving || (needsSite && !form.siteId) || !form.roleAccessId}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </form>
  )
}
