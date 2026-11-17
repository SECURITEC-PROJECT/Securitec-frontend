import { api } from '../../../lib/api'
import type { Minutes, MinutesLayout, MinutesSummary } from '../types'

export const fetchMinutesList = async (siteId: string) => (await api<{ minutes: MinutesSummary[] }>(`/minutes?siteId=${encodeURIComponent(siteId)}`)).minutes

export const fetchMinutes = async (id: string) => (await api<{ minutes: Minutes }>(`/minutes/${id}`)).minutes

export const createMinutes = async (siteId: string, name: string) => (await api<{ minutes: Minutes }>('/minutes', { method: 'POST', body: { siteId, name } })).minutes

export const saveMinutes = async (id: string, name: string, layout: MinutesLayout) => (await api<{ minutes: Minutes }>(`/minutes/${id}`, { method: 'PUT', body: { name, layout } })).minutes

export const deleteMinutes = (id: string) => api(`/minutes/${id}`, { method: 'DELETE' })
