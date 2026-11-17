import { Modal } from '../../../../components/ui'
import type { NewSite } from '../../types'
import { AddSiteForm } from '../AddSiteForm'

interface AddSiteModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (site: NewSite) => Promise<void>
}

export function AddSiteModal({ open, onClose, onSubmit }: AddSiteModalProps) {
  return (
    <Modal title="Ajouter un site" open={open} onClose={onClose}>
      <AddSiteForm onSubmit={onSubmit} />
    </Modal>
  )
}
