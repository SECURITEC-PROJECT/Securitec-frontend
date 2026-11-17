import type { TextareaHTMLAttributes } from 'react'
import styles from './TextArea.module.css'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function TextArea({ label, required, ...props }: TextAreaProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </span>
      <textarea className={styles.input} rows={3} required={required} {...props} />
    </label>
  )
}
