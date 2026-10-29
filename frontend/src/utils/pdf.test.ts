import { describe, it, expect } from 'vitest'
import { stripHtml } from './pdf'

describe('stripHtml', () => {
  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })

  it('returns null/undefined as-is', () => {
    expect(stripHtml(null as any)).toBeFalsy()
    expect(stripHtml(undefined as any)).toBeFalsy()
  })

  it('strips HTML tags', () => {
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World')
  })

  it('decodes common HTML entities after tag stripping', () => {
    // stripHtml replaces &nbsp; with a regular space via .replace(/&nbsp;/g, ' ')
    // Result: "A & B < C > D   E" (3 spaces: one before nbsp, nbsp→space, one after)
    const result = stripHtml('<p>A &amp; B &lt; C &gt; D &nbsp; E</p>')
    expect(result).toContain('A & B < C > D')
    expect(result).toContain('E')
    expect(result).not.toContain('&amp;')
    expect(result).not.toContain('&lt;')
    expect(result).not.toContain('&gt;')
    expect(result).not.toContain('&nbsp;')
  })

  it('returns plain text unchanged', () => {
    expect(stripHtml('No HTML here')).toBe('No HTML here')
  })

  it('handles nested tags', () => {
    expect(stripHtml('<div><span><em>Deep</em></span></div>')).toBe('Deep')
  })

  it('trims whitespace', () => {
    expect(stripHtml('  <p> spaced </p>  ')).toBe('spaced')
  })
})