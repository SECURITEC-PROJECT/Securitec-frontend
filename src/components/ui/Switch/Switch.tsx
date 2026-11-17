import styles from './Switch.module.css'

interface SwitchProps {
  label: string
  /** « partial » : une partie seulement des éléments est activée (ex. certaines actions d'un module). */
  state: 'on' | 'off' | 'partial'
  onChange: () => void
  disabled?: boolean
}

/** Interrupteur à bascule (comme dans HEROES). Un clic sur un état partiel active tout. */
export function Switch({ label, state, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={state === 'on' ? true : state === 'partial' ? 'mixed' : false}
      aria-label={label}
      className={`${styles.switch} ${styles[state]}`}
      onClick={onChange}
      disabled={disabled}
    >
      <span className={styles.knob} />
    </button>
  )
}
