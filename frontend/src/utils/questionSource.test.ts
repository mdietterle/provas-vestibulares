import { describe, it, expect } from 'vitest'
import { extractSource } from './questionSource'

describe('extractSource', () => {
  it('returns null source when no marker present', () => {
    const result = extractSource('Questão sem fonte')
    expect(result.statement).toBe('Questão sem fonte')
    expect(result.source).toBeNull()
  })

  it('extracts ENEM marker with Q number', () => {
    const result = extractSource('Texto da questão [ENEM 2023 – Q45]')
    expect(result.statement).toBe('Texto da questão')
    expect(result.source).toContain('ENEM 2023')
    expect(result.source).toContain('Q45')
  })

  it('normalizes dash to middle dot', () => {
    const result = extractSource('Texto [ENEM 2023 – Q10]')
    expect(result.source).toContain('·')
  })

  it('handles marker inside HTML closing tag', () => {
    const result = extractSource('<p>Texto da questão [ENEM 2023 – Q45]</p>')
    expect(result.source).toContain('ENEM 2023')
    expect(result.statement).not.toContain('[ENEM')
  })

  it('handles empty string', () => {
    const result = extractSource('')
    expect(result.statement).toBe('')
    expect(result.source).toBeNull()
  })

  it('handles null/undefined gracefully', () => {
    const result = extractSource(null as any)
    expect(result.source).toBeNull()
  })

  it('extracts simple marker without Q number', () => {
    const result = extractSource('Texto [ENEM 2023]')
    expect(result.source).toContain('ENEM 2023')
    expect(result.statement).not.toContain('[ENEM')
  })

  it('preserves HTML in statement after extraction', () => {
    const result = extractSource('<b>Bold text</b> [ENEM 2023 – Q1]')
    expect(result.statement).toContain('<b>Bold text</b>')
    expect(result.source).toBeTruthy()
  })
})