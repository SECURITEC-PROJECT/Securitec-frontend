import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../../components/layout/PageHeader'
import { useCurrentSite } from '../../../components/layout/SiteLayout/useCurrentSite'
import { Button, Icon } from '../../../components/ui'
import { usePermissions } from '../../auth'
import { createMinutes, deleteMinutes, fetchMinutesList } from '../services/minutes'
import type { MinutesSummary } from '../types'
import styles from './MinutesPages.module.css'

/** Liste des comptes rendus du site : on en crée un nouveau ou on ouvre un existant pour le concevoir. */
export function MinutesListPage() {
  const site = useCurrentSite()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [list, setList] = useState<MinutesSummary[]>()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchMinutesList(site.id)
      .then((loaded) => !cancelled && setList(loaded))
      .catch((failure: Error) => {
        if (cancelled) return
        setError(failure.message)
        setList([])
      })
    return () => {
      cancelled = true
    }
  }, [site.id])

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setError('')
    try {
      const created = await createMinutes(site.id, name.trim())
      navigate(`/sites/${site.id}/comptes-rendus/${created.id}`)
    } catch (failure) {
      setError((failure as Error).message)
    }
  }

  async function remove(item: MinutesSummary) {
    if (!window.confirm(`Supprimer le compte rendu « ${item.name} » ?`)) return
    try {
      await deleteMinutes(item.id)
      setList((current) => current?.filter((entry) => entry.id !== item.id))
    } catch (failure) {
      setError((failure as Error).message)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Comptes rendus" subtitle={`Concevez les comptes rendus de ${site.name} : texte libre et tableaux tirés des feuilles de saisie, placés comme vous le souhaitez.`} />
      {can('minutes.create') && (
        <form className={styles.createForm} onSubmit={create}>
          <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nom du nouveau compte rendu" maxLength={160} />
          <Button type="submit" disabled={!name.trim()}>
            <Icon name="add" size={18} /> Créer
          </Button>
        </form>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {list === undefined && <p className={styles.status}>Chargement...</p>}
      {list?.length === 0 && !error && <p className={styles.status}>Aucun compte rendu pour ce site.</p>}
      <div className={styles.grid}>
        {list?.map((item) => (
          <div key={item.id} className={styles.card}>
            <Link to={`/sites/${site.id}/comptes-rendus/${item.id}`} className={styles.cardLink}>
              <Icon name="report" size={22} color="#2f7fd8" />
              <span className={styles.cardName}>{item.name}</span>
              <small>Modifié le {new Date(item.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small>
            </Link>
            {can('minutes.delete') && (
              <button type="button" className={styles.cardDelete} title="Supprimer" onClick={() => remove(item)}>
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
