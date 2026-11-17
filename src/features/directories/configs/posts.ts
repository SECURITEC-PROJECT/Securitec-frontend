import { createPost, fetchPosts, updatePost } from '../../../services/directories'
import type { DirectoryConfig } from '../types'

export const postsConfig: DirectoryConfig = {
  key: 'posts',
  module: 'administration',
  title: 'Postes de garde',
  subtitle: 'Liste des postes de garde du site : cliquez sur un poste pour ouvrir ses paramètres. On les crée depuis les paramètres du projet.',
  newLabel: 'Nouveau poste',
  createElsewhere: true,
  rowPath: (siteId, row) => `/sites/${siteId}/postes/${row.id}`,
  searchPlaceholder: 'Poste ou site…',
  emptyText: 'Aucun poste.',
  fields: [
    { key: 'nom', label: 'Nom du poste', type: 'text', required: true },
    { key: 'siteId', label: 'Site', type: 'select', options: 'sites', required: true, defaultFromSite: true, lockedOnEdit: true },
  ],
  columns: [
    { key: 'nom', label: 'Poste' },
    { key: 'siteName', label: 'Site', field: 'siteId' },
    { key: 'dayCount', label: 'En poste le jour' },
    { key: 'nightCount', label: 'En poste la nuit' },
  ],
  // L'API renvoie les postes de tous les sites accessibles ; la page affiche ceux du site ouvert.
  load: async (siteId) =>
    (await fetchPosts())
      .filter((post) => post.siteId === siteId)
      .map((post) => ({ id: post.id, active: post.actif, values: { nom: post.nom, siteId: post.siteId, siteName: post.siteName, dayCount: String(post.dayCount), nightCount: String(post.nightCount) } })),
  create: (_siteId, values) => createPost(values.siteId, values.nom.trim()),
  update: (_siteId, row, values) => updatePost(row.id, values.nom.trim(), row.active),
  setActive: (_siteId, row, active) => updatePost(row.id, row.values.nom, active),
}
