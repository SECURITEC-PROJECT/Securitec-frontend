import type { HTMLAttributes } from 'react'
import styles from './Badge.module.css'

export type BadgeTone = 'primary' | 'success' | 'danger' | 'warning' | 'attention' | 'info' | 'neutral'
export type BadgeSize = 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone: BadgeTone
  size?: BadgeSize
}

export function Badge({ tone, size = 'md', className = '', ...props }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]} ${styles[size]} ${className}`} {...props} />
}
