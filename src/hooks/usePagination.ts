import { useState } from 'react'

export const DEFAULT_PAGE_SIZE = 50

/** Pagination d'une liste déjà filtrée. La page courante est ramenée dans les bornes si la liste raccourcit. */
export function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(Math.max(1, size))
      setPage(1)
    },
    pageCount,
    pageItems: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  }
}
