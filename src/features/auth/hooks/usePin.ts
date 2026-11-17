import { useCallback, useState } from 'react'
import { PIN_LENGTH } from '../constants'

export function usePin(length = PIN_LENGTH) {
  const [pin, setPin] = useState('')

  const addDigit = useCallback(
    (digit: string) => setPin((current) => (current.length < length ? current + digit : current)),
    [length],
  )
  const removeDigit = useCallback(() => setPin((current) => current.slice(0, -1)), [])
  const reset = useCallback(() => setPin(''), [])

  return { pin, addDigit, removeDigit, reset, isComplete: pin.length === length }
}
