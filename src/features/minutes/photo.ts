const MAX_SIDE = 1400
const QUALITY = 0.82

/** Lit une photo choisie par l'utilisateur et la réduit (1400 px max, JPEG) pour qu'elle reste légère dans le compte rendu. */
export async function readPhoto(file: File): Promise<{ src: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Cette image ne peut pas être lue.')
  })
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Traitement de l’image impossible.')
  // Fond blanc : un PNG transparent ne doit pas devenir noir en JPEG.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return { src: canvas.toDataURL('image/jpeg', QUALITY), width, height }
}
