import { api } from '../../lib/api'
import type { PlanningOptions, Shift, ShiftInput } from './types'

export const fetchPlanningOptions = () => api<PlanningOptions>('/planning/options')

export async function fetchShifts(from: Date, to: Date, filters: { siteId?: string; userId?: string }) {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
  if (filters.siteId) query.set('siteId', filters.siteId)
  if (filters.userId) query.set('userId', filters.userId)
  return (await api<{ shifts: Shift[] }>(`/planning?${query}`)).shifts
}

export const createShift = (input: ShiftInput) => api<{ shift: Shift }>('/planning', { method: 'POST', body: input })

export const updateShift = (id: string, input: ShiftInput) => api<{ shift: Shift }>(`/planning/${id}`, { method: 'PUT', body: input })

export const deleteShift = (id: string) => api<{ id: string }>(`/planning/${id}`, { method: 'DELETE' })
