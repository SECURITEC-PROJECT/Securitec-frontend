import type { ButtonHTMLAttributes } from 'react'
import styles from './TextLink.module.css'

export function TextLink({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`${styles.link} ${className}`} {...props} />
}
