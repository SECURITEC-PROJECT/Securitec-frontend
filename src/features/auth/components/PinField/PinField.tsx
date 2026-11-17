import styles from './PinField.module.css'

interface PinFieldProps {
  identifier: string
  onIdentifierChange: (value: string) => void
  pinLength: number
  filled: number
}

export function PinField({ identifier, onIdentifierChange, pinLength, filled }: PinFieldProps) {
  return (
    <div className={styles.field}>
      <input
        className={styles.identifier}
        type="text"
        autoComplete="username"
        placeholder="Identifiant ou matricule"
        value={identifier}
        onChange={(event) => onIdentifierChange(event.target.value)}
      />
      <div className={styles.pin}>
        <span className={styles.label}>Code PIN</span>
        <span className={styles.dots} role="img" aria-label={`${filled} chiffres saisis sur ${pinLength}`}>
          {Array.from({ length: pinLength }, (_, index) => (
            <span key={index} className={`${styles.dot} ${index < filled ? styles.filled : ''}`} />
          ))}
        </span>
      </div>
    </div>
  )
}
