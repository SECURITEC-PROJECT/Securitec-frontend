import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentSite } from '../../components/layout/SiteLayout/useCurrentSite'
import { fetchPosts } from '../../services/directories'
import { createUser, fetchRoles, fetchUsers, updateUser } from '../../services/access'
import { UserFormModal } from '../access/components/UserFormModal'
import type { UserTarget } from '../access/components/UserFormModal'
import type { RoleSummary, UserInput } from '../access/types'
import { useCurrentUser, usePermissions } from '../auth'
import { SITE_TYPES } from '../sites/constants'
import { fetchSites } from '../sites/services/sites'
import type { Site } from '../sites'
import { AddPostModal } from './AddPostModal'
import { SettingsBoard } from './SettingsBoard'
import { SiteLogoEditor } from './SiteLogoEditor'
import { SettingsCard } from './SettingsCard'
import type { CardChrome, CardItem } from './SettingsCard'
import { useCardLayout } from './useCardLayout'
import styles from './ProjectSettingsPage.module.css'

/** Page « Paramètres de projet » : profil, utilisateurs et rôles du site, en cartes déplaçables. */
export function ProjectSettingsPage() {
  const site = useCurrentSite()
  const me = useCurrentUser()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const [target, setTarget] = useState<UserTarget | null>(null)
  const [usersVersion, setUsersVersion] = useState(0)
  const [postsVersion, setPostsVersion] = useState(0)
  const [addingPost, setAddingPost] = useState(false)
  const [roles, setRoles] = useState<RoleSummary[]>([])
  const [sites, setSites] = useState<Site[]>([])

  const canManageUsers = can('users.view')
  useEffect(() => {
    if (!canManageUsers) return
    let cancelled = false
    Promise.all([fetchRoles(), fetchSites()])
      .then(([loadedRoles, loadedSites]) => {
        if (cancelled) return
        setRoles(loadedRoles)
        setSites(loadedSites)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [canManageUsers])

  const handleSaveUser = async (id: string | null, input: UserInput) => {
    if (id) await updateUser(id, input)
    else await createUser(input)
    setTarget(null)
    setUsersVersion((value) => value + 1)
  }

  const goToPosts = () => navigate('/sites/' + site.id + '/postes')

  const definitions: { id: string; visible: boolean; render: (chrome: CardChrome) => ReactNode }[] = [
    {
      id: 'profile',
      visible: true,
      render: (chrome) => (
        <SettingsCard id="profile" title="Profil du site" icon="post" color="#7939b8" {...chrome}>
          <SiteLogoEditor siteId={site.id} editable={can('administration.update')} />
          <dl className={styles.profile}>
            <dt>Nom</dt>
            <dd>{site.name}</dd>
            <dt>Type</dt>
            <dd>{SITE_TYPES[site.type].label}</dd>
            <dt>Adresse</dt>
            <dd>{site.address || '—'}</dd>
          </dl>
        </SettingsCard>
      ),
    },
    {
      id: 'users',
      visible: canManageUsers,
      render: (chrome) => (
        <SettingsCard
          key={usersVersion}
          id="users"
          title="Utilisateurs"
          icon="users"
          color="#7939b8"
          onAdd={can('users.create') && roles.length > 0 ? () => setTarget({ mode: 'new' }) : undefined}
          onManage={() => navigate('/admin/users')}
          load={async () =>
            (await fetchUsers())
              .filter((user) => user.active && (user.siteId === site.id || user.profile === 1))
              .map((user): CardItem => ({
                id: user.id,
                label: user.name,
                sub: user.roleAccessName ?? '—',
                onClick: () => navigate(`/sites/${site.id}/parametres/utilisateurs/${user.id}`),
              }))
          }
          {...chrome}
        />
      ),
    },
    {
      id: 'roles',
      visible: can('roles.view'),
      render: (chrome) => (
        <SettingsCard
          id="roles"
          title="Rôles et permissions"
          icon="shield"
          color="#d32f2f"
          onAdd={can('roles.create') ? () => navigate('/admin/users') : undefined}
          onManage={() => navigate('/admin/users')}
          load={async () => (await fetchRoles()).map((role): CardItem => ({ id: role.id, label: role.nom, sub: `${role.userCount} utilisateur(s)`, onClick: () => navigate('/admin/users') }))}
          {...chrome}
        />
      ),
    },
    {
      id: 'posts',
      visible: can('administration.view'),
      render: (chrome) => (
        <SettingsCard
          key={postsVersion}
          id="posts"
          title="Postes de garde"
          icon="post"
          color="#f5a623"
          onAdd={can('administration.create') ? () => setAddingPost(true) : undefined}
          onManage={goToPosts}
          load={async () =>
            (await fetchPosts())
              .filter((post) => post.siteId === site.id)
              .map((post): CardItem => ({ id: post.id, label: post.nom, sub: [`Jour : ${post.dayCount} · Nuit : ${post.nightCount}`, post.actif ? '' : 'Inactif'].filter(Boolean).join(' · '), onClick: () => navigate('/sites/' + site.id + '/postes/' + post.id) }))
          }
          {...chrome}
        />
      ),
    },
  ]

  const visible = definitions.filter((definition) => definition.visible)
  const layout = useCardLayout(`site-${me.id}`, [['profile', 'users', 'roles'], ['posts'], []], visible.map((definition) => definition.id))

  return (
    <SettingsBoard
      title={site.name}
      subtitle="Paramètres du site : gérez ses utilisateurs, ses rôles et ses postes de garde. Déplacez les cartes avec la poignée ; elles ne bougent que si vous les déplacez."
      layout={layout}
      renderCard={(id, chrome) => visible.find((definition) => definition.id === id)?.render(chrome)}
    >
      <AddPostModal open={addingPost} site={site} onClose={() => setAddingPost(false)} onCreated={() => setPostsVersion((value) => value + 1)} />
      <UserFormModal target={target} roles={roles} sites={sites} currentSiteId={site.id} onSave={handleSaveUser} onClose={() => setTarget(null)} />
    </SettingsBoard>
  )
}
