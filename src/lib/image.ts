/** Taille maximale (en pixels) du grand côté d'une photo d'identité envoyée au serveur. */
export const ID_PHOTO_MAX_SIDE = 1024

/**
 * Prépare une image choisie par l'utilisateur avant l'envoi : elle est décodée, réduite (grand côté ≤ `maxSide`)
 * et ré-encodée en JPEG. Une photo de téléphone de plusieurs Mo devient ainsi un fichier léger (quelques centaines de Ko),
 * orientée correctement. Lève une erreur claire si le fichier n'est pas une image lisible par le navigateur.
 */
export async function prepareImage(file: File, maxSide = ID_PHOTO_MAX_SIDE, quality = 0.9): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Cette image est illisible. Choisissez une photo PNG, JPEG ou WebP.')
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Traitement de l’image impossible dans ce navigateur.')
  // Fond blanc : un PNG transparent ne devient pas noir en JPEG.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Traitement de l’image impossible.')
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}
