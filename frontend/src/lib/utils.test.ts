import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })

  it('merges single class string', () => {
    expect(cn('px-4')).toBe('px-4')
  })

  it('merges multiple class strings', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toContain('base')
    expect(result).toContain('active')
  })

  it('filters falsy values', () => {
    const result = cn('keep', false, null, undefined, 0, '', 'also-keep')
    expect(result).toContain('keep')
    expect(result).toContain('also-keep')
    expect(result).not.toContain('false')
    expect(result).not.toContain('null')
  })

  it('resolves tailwind conflicts via twMerge', () => {
    // px-4 should win over px-2 when merged
    const result = cn('px-2', 'px-4')
    expect(result).toBe('px-4')
  })

  it('handles array inputs', () => {
    const result = cn(['px-4', 'py-2'])
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
  })

  it('handles object inputs', () => {
    const result = cn({ 'px-4': true, 'hidden': false })
    expect(result).toContain('px-4')
    expect(result).not.toContain('hidden')
  })
})