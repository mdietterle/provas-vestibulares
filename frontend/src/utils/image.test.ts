import { describe, it, expect } from 'vitest'
import { resolveImageSrc } from './image'

describe('resolveImageSrc', () => {
  it('returns empty string for null', () => {
    expect(resolveImageSrc(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(resolveImageSrc(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(resolveImageSrc('')).toBe('')
  })

  it('passes through data: URI unchanged', () => {
    const dataUri = 'data:image/png;base64,abc123'
    expect(resolveImageSrc(dataUri)).toBe(dataUri)
  })

  it('passes through http URL unchanged', () => {
    const url = 'http://example.com/img.jpg'
    expect(resolveImageSrc(url)).toBe(url)
  })

  it('passes through https URL unchanged', () => {
    const url = 'https://example.com/img.jpg'
    expect(resolveImageSrc(url)).toBe(url)
  })

  it('wraps raw base64 in data URI', () => {
    const base64 = 'iVBORw0KGgo='
    expect(resolveImageSrc(base64)).toBe('data:image/jpeg;base64,iVBORw0KGgo=')
  })
})