import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, TextLink } from '../../../../components/ui'
import { PIN_LENGTH } from '../../constants'
import { usePin } from '../../hooks/usePin'
import type { LoginCredentials } from '../../types'
import { PinField } from '../PinField'
import { PinKeypad } from '../PinKeypad'
import styles from './LoginForm.module.css'

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>
  onBadgeLogin: () => void
  onForgotPin: () => void
  onRequestAccess: () => void
}

export function LoginForm({ onSubmit, onBadgeLogin, onForgotPin, onRequestAccess }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { pin, addDigit, removeDigit, reset, isComplete } = usePin()

  const canSubmit = identifier.trim() !== '' && isComplete && !submitting

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setError('')
    setSubmitting(true)
    try {
      await onSubmit({ identifier: identifier.trim(), pin })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Connexion impossible.')
      reset()
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <PinField
        identifier={identifier}
        onIdentifierChange={setIdentifier}
        pinLength={PIN_LENGTH}
        filled={pin.length}
      />
      <PinKeypad onDigit={addDigit} onBackspace={removeDigit} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!canSubmit}>
        {submitting ? 'Connexion...' : 'Se connecter sur SECURITEC'}
      </Button>
      <Button type="button" variant="outline" onClick={onBadgeLogin}>
        Se connecter avec un badge
      </Button>
      <TextLink className={styles.forgot} onClick={onForgotPin}>
        J'ai oublié mon code PIN
      </TextLink>
      <Button type="button" variant="secondary" onClick={onRequestAccess}>
        Demander un accès
      </Button>
    </form>
  )
}
