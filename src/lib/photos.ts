// Profile photos (docs/decisions/0010). The files live in the private bucket
// "avatars" (loading and saving: data.ts); this file prepares them on the phone
// and hands them to every Avatar.
import { createContext } from 'react'

const SIZE = 256 // px; the biggest Avatar is 72 px, times 3 for the iPhone screen

/**
 * Turns a picked photo into a small square JPEG. Drawing it on a canvas and
 * saving it again keeps only the pixels: the hidden photo data (GPS location,
 * camera, date) is gone. The browser decodes iPhone HEIC files and turns them
 * upright on its own.
 */
export async function resizePhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()

    // The biggest square from the middle of the photo
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const left = (img.naturalWidth - side) / 2
    const top = (img.naturalHeight - side) / 2

    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('no canvas')
    context.drawImage(img, left, top, side, side, 0, 0, SIZE, SIZE)

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.85)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** member id -> photo URL (an object URL, only valid inside this app). No entry = show the emoji. */
export type Photos = Record<string, string>

// App.tsx fills this; Avatar reads it, so the screens don't have to pass photos around
export const PhotosContext = createContext<Photos>({})
