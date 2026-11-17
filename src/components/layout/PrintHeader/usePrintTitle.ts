import { useContext, useEffect } from 'react'
import { PrintTitleContext } from './printTitleContext'

/** Titre imprimé en tête de page, quand la page en a déclaré un (sinon `undefined`). */
export const usePrintTitleValue = () => useContext(PrintTitleContext).title

/** Déclare le titre imprimé de la page courante (ex. le nom de la feuille de saisie) ; il est retiré quand la page se ferme. */
export function usePrintTitle(title: string | undefined) {
  const { setTitle } = useContext(PrintTitleContext)
  useEffect(() => {
    setTitle(title)
    return () => setTitle(undefined)
  }, [title, setTitle])
}
