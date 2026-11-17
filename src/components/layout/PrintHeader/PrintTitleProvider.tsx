import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { PrintTitleContext } from './printTitleContext'

/** Entoure une coque de pages (site, administration) : ses pages peuvent y déclarer le titre à imprimer (voir usePrintTitle). */
export function PrintTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string>()
  const value = useMemo(() => ({ title, setTitle }), [title])
  return <PrintTitleContext.Provider value={value}>{children}</PrintTitleContext.Provider>
}
