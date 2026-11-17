import { KEYPAD_DIGITS } from '../../constants'
import styles from './PinKeypad.module.css'

interface PinKeypadProps {
  onDigit: (digit: string) => void
  onBackspace: () => void
}

export function PinKeypad({ onDigit, onBackspace }: PinKeypadProps) {
  return (
    <div className={styles.keypad}>
      {KEYPAD_DIGITS.map((digit) => (
        <button key={digit} type="button" className={styles.key} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      <span />
      <button type="button" className={styles.key} onClick={() => onDigit('0')}>
        0
      </button>
      <button type="button" className={styles.key} onClick={onBackspace} aria-label="Effacer">
        ⌫
      </button>
    </div>
  )
}
