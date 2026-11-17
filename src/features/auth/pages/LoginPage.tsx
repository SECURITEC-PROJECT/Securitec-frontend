import { Navigate } from 'react-router-dom'
import { Logo } from '../../../components/ui'
import { FeatureList } from '../components/FeatureList'
import { LoginForm } from '../components/LoginForm'
import { useAuth } from '../hooks/useAuth'
import styles from './LoginPage.module.css'

const noop = () => undefined

export function LoginPage() {
  const { user, login } = useAuth()

  if (user) return <Navigate to="/sites" replace />

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Logo />
        <header className={styles.header}>
          <h1 className={styles.title}>Connexion</h1>
          <p className={styles.subtitle}>Digitalisation du poste de garde</p>
        </header>
        <LoginForm onSubmit={login} onBadgeLogin={noop} onForgotPin={noop} onRequestAccess={noop} />
        <FeatureList />
        <footer className={styles.footer}>SECURITEC</footer>
      </div>
    </main>
  )
}
