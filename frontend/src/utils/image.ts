/**
 * Resolve an image source that may be a raw base64 string, a data: URI,
 * or an HTTP(S) URL. Returns a value safe to use as an <img src>.
 */
export function resolveImageSrc(value: string | null | undefined): string {
  if (!value) return ''
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  return `data:image/jpeg;base64,${value}`
}