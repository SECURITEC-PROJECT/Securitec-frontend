import styles from './NewSiteCard.module.css'

export function NewSiteCard({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.plus}>+</span>
      <span className={styles.label}>Nouveau site</span>
    </button>
  )
}
