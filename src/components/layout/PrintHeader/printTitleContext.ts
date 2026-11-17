import { createContext } from 'react'

export interface PrintTitleValue {
  /** Titre propre à la page (ex. le nom d'une feuille de saisie) ; absent : l'en-tête déduit le titre de l'adresse. */
  title?: string
  setTitle: (title?: string) => void
}

export const PrintTitleContext = createContext<PrintTitleValue>({ setTitle: () => undefined })
