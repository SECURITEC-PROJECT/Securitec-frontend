import { useEffect, useState } from 'react'
import type { DirectoryConfig, DirectoryRow, Values } from '../types'

const messageOf = (failure: unknown) => (failure instanceof Error ? failure.message : 'Opération impossible.')

/** Charge un annuaire depuis l'API et expose les actions (chaque écriture recharge la liste). */
export function useDirectory(config: DirectoryConfig, siteId: string) {
  const base = `${config.key}:${siteId}`
  const [state, setState] = useState<{ base: string; rows: DirectoryRow[]; error: string } | null>(null)
  const [version, setVersion] = useState(0)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let cancelled = false
    config
      .load(siteId)
      .then((rows) => !cancelled && setState({ base, rows, error: '' }))
      .catch((failure) => !cancelled && setState({ base, rows: [], error: messageOf(failure) }))
    return () => {
      cancelled = true
    }
  }, [config, siteId, base, version])

  const reload = () => setVersion((value) => value + 1)

  /** Lance une écriture : l'erreur est affichée dans la page. */
  const attempt = async (action: () => Promise<unknown>) => {
    setActionError('')
    try {
      await action()
      reload()
    } catch (failure) {
      setActionError(messageOf(failure))
    }
  }

  /** Enregistre depuis le formulaire : l'erreur est relancée pour s'afficher dans la fenêtre. */
  const save = async (row: DirectoryRow | undefined, values: Values) => {
    await (row ? config.update(siteId, row, values) : config.create(siteId, values))
    reload()
  }

  const stale = state?.base !== base
  return {
    rows: stale ? [] : state.rows,
    loading: stale,
    error: actionError || (stale ? '' : state.error),
    save,
    reload,
    toggleActive: (row: DirectoryRow) => attempt(() => config.setActive!(siteId, row, !row.active)),
    remove: (row: DirectoryRow) => attempt(() => config.remove!(siteId, row)),
  }
}
