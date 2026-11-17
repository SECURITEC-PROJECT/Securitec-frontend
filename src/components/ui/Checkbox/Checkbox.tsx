import type { InputHTMLAttributes } from 'react'
import styles from './Checkbox.module.css'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label className={styles.checkbox}>
      <input type="checkbox" className={styles.input} {...props} />
      <span>{label}</span>
    </label>
  )
}
