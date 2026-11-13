import { describe, it, expect } from 'vitest'
import { stripHtml, stripHtmlInline } from './format'

describe('stripHtml (format)', () => {
  it('keeps paragraphs apart instead of gluing them', () => {
    expect(stripHtml('<p>TEXTO I</p><p>As mariposas</p>')).toBe('TEXTO I\nAs mariposas')
    expect(stripHtml('gráfico:<br>ABCDE<div>A tirinha</div>')).toBe('gráfico:\nABCDE\nA tirinha')
  })

  it('separates table cells with spaces', () => {
    expect(stripHtml('<table><tr><td>A</td><td>B</td></tr></table>')).toBe('A B')
  })

  it('drops script/style content and decodes entities without double decoding', () => {
    expect(stripHtml('<script>alert(1)</script><p>A &amp; B &amp;lt;</p>')).toBe('A & B &lt;')
  })

  it('collapses runs of line breaks', () => {
    expect(stripHtml('<p>a</p><p></p><p></p><p>b</p>')).toBe('a\nb')
  })

  it('inline variant folds breaks into single spaces', () => {
    expect(stripHtmlInline('<p>TEXTO I</p><p>As mariposas</p>')).toBe('TEXTO I As mariposas')
  })

  it('handles empty input', () => {
    expect(stripHtml('')).toBe('')
  })
})
