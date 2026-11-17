import { api, apiBlob, apiDownload, apiUpload } from '../lib/api'

/** Fiche d'un utilisateur : prénom et coordonnées. */
export interface UserProfile {
  firstName: string
  email: string
  phone: string
  street: string
  street2: string
  postalCode: string
  city: string
  country: string
}

const blank = (value: string | null | undefined) => value ?? ''

const toProfile = (profile: Record<keyof UserProfile, string | null>): UserProfile => ({
  firstName: blank(profile.firstName),
  email: blank(profile.email),
  phone: blank(profile.phone),
  street: blank(profile.street),
  street2: blank(profile.street2),
  postalCode: blank(profile.postalCode),
  city: blank(profile.city),
  country: blank(profile.country),
})

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { profile } = await api<{ profile: Record<keyof UserProfile, string | null> }>(`/users/${userId}/profile`)
  return toProfile(profile)
}

/** Enregistre la fiche entière ; le backend remplace les valeurs. */
export async function saveUserProfile(userId: string, profile: UserProfile): Promise<UserProfile> {
  const saved = await api<{ profile: Record<keyof UserProfile, string | null> }>(`/users/${userId}/profile`, { method: 'PUT', body: profile })
  return toProfile(saved.profile)
}

export interface UserDocument {
  id: string
  name: string
  extension: string
  size: number
  category: string
  createdAt: string
}

export async function fetchUserDocuments(userId: string) {
  const { documents } = await api<{ documents: UserDocument[] }>(`/users/${userId}/documents`)
  return documents
}

export const uploadUserDocument = (userId: string, file: File, category = 'Autre') =>
  apiUpload(`/users/${userId}/documents`, file, { 'x-file-name': encodeURIComponent(file.name), 'x-file-category': category })

export const downloadUserDocument = (userId: string, document: UserDocument) => apiDownload(`/users/${userId}/documents/${document.id}`, document.name)

export const deleteUserDocument = (userId: string, documentId: string) => api(`/users/${userId}/documents/${documentId}`, { method: 'DELETE' })

/** Photo d'identité d'un utilisateur, ou null s'il n'en a pas. */
export const fetchUserPhoto = (userId: string) => apiBlob(`/users/${userId}/photo`)

export const uploadUserPhoto = (userId: string, file: File) => apiUpload(`/users/${userId}/photo`, file, {}, 'PUT')

export const removeUserPhoto = (userId: string) => api(`/users/${userId}/photo`, { method: 'DELETE' })

/** Contenu d'un document, pour l'aperçu sans téléchargement. */
export const fetchUserDocumentBlob = (userId: string, document: UserDocument) => apiBlob(`/users/${userId}/documents/${document.id}`)
