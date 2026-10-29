import { describe, it, expect } from 'vitest'
import { seededShuffle } from './shuffle'

describe('seededShuffle', () => {
  it('returns array of same length', () => {
    const input = [1, 2, 3, 4, 5]
    const result = seededShuffle(input, 42)
    expect(result).toHaveLength(input.length)
  })

  it('contains same elements', () => {
    const input = [1, 2, 3, 4, 5]
    const result = seededShuffle(input, 42)
    expect(result.sort()).toEqual(input.sort())
  })

  it('does not mutate original array', () => {
    const input = [1, 2, 3, 4, 5]
    const copy = [...input]
    seededShuffle(input, 42)
    expect(input).toEqual(copy)
  })

  it('handles empty array', () => {
    expect(seededShuffle([], 42)).toEqual([])
  })

  it('handles single element', () => {
    expect(seededShuffle([42], 99)).toEqual([42])
  })

  it('produces deterministic output for same seed', () => {
    const input = [1, 2, 3, 4, 5]
    const a = seededShuffle(input, 123)
    const b = seededShuffle(input, 123)
    expect(a).toEqual(b)
  })

  it('produces different output for different seeds', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const a = seededShuffle(input, 1)
    const b = seededShuffle(input, 2)
    // Extremely unlikely to be equal with different seeds
    expect(a).not.toEqual(b)
  })
})