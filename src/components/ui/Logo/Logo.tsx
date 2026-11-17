import styles from './Logo.module.css'

export function Logo({ size = 80 }: { size?: number }) {
  return <img className={styles.logo} src="/logo.jpg" alt="SECURITEC" width={size} height={size} />
}
