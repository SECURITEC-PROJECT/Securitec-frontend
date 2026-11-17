import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Select, TextField } from '../../../../components/ui'
import { EMPTY_SITE, SITE_TYPE_OPTIONS } from '../../constants'
import type { NewSite, SiteType } from '../../types'
import styles from './AddSiteForm.module.css'

interface AddSiteFormProps {
  onSubmit: (site: NewSite) => Promise<void>
}

export function AddSiteForm({ onSubmit }: AddSiteFormProps) {
  const [site, setSite] = useState<NewSite>(EMPTY_SITE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(site)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Création impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <TextField label="Nom du site" required value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} />
      <Select
        label="Type"
        value={site.type}
        options={SITE_TYPE_OPTIONS}
        onChange={(e) => setSite({ ...site, type: e.target.value as SiteType })}
      />
      <TextField label="Adresse" value={site.address} onChange={(e) => setSite({ ...site, address: e.target.value })} />
      {error && <p className={styles.error}>{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Ajout en cours...' : 'Ajouter'}
      </Button>
    </form>
  )
}
