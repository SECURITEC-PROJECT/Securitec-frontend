export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  createdAt: string
  read: boolean
  /** Page à ouvrir (la feuille concernée), absente si l'utilisateur ne peut pas l'ouvrir. */
  link: string | null
  reportId: string | null
  /** Vrai si l'utilisateur peut transmettre ce signalement à son propre supérieur. */
  canEscalate: boolean
  /** Signalement ouvert (« À traiter ») ou traité ; absent pour une notification sans signalement. */
  status: 'open' | 'resolved' | null
  /** Vrai si l'utilisateur peut marquer le signalement comme traité. */
  canResolve: boolean
}

export interface NotificationsData {
  unread: number
  /** Libellé du niveau supérieur (« Responsable sécurité ») si l'utilisateur peut transmettre des signalements. */
  escalateTo: string | null
  notifications: AppNotification[]
}

/** Niveau hiérarchique auquel on peut adresser un signalement. */
export interface ReportTarget {
  profile: number
  label: string
}

/** Détail d'un signalement : message, ligne concernée, chaîne de transmission. */
export interface ReportDetail {
  report: {
    id: string
    message: string
    createdAt: string
    reporter: string
    fromLabel: string
    toLabel: string
    resolved: boolean
    resolvedAt: string | null
    resolvedBy: string | null
    sheet: { id: string; name: string; postName: string }
    siteId: string
    rowId: string | null
  }
  /** Ligne signalée ; absente si elle a été supprimée depuis. */
  row: {
    id: string
    createdAt: string
    author: string | null
    fields: { label: string; type: string; value: string }[]
    fileGroups: { label: string; files: { id: string; name: string; size: number }[] }[]
  } | null
  thread: { id: string; reporter: string; fromLabel: string; toLabel: string; message: string; createdAt: string; resolved: boolean; current: boolean }[]
  canResolve: boolean
  canEscalate: boolean
}
