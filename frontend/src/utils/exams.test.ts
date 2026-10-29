import { describe, it, expect } from 'vitest'
import { EXAM_TYPES, EXAM_TYPE_LABEL, EXAM_TYPE_COLOR } from './exams'

describe('exam utils', () => {
  describe('EXAM_TYPES', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(EXAM_TYPES)).toBe(true)
      expect(EXAM_TYPES.length).toBeGreaterThan(0)
    })

    it('every entry has required fields', () => {
      for (const exam of EXAM_TYPES) {
        expect(exam.id).toBeTruthy()
        expect(exam.label).toBeTruthy()
        expect(exam.region).toBeTruthy()
        expect(exam.color).toBeTruthy()
        expect(exam.gradient).toBeTruthy()
      }
    })

    it('contains enem', () => {
      const enem = EXAM_TYPES.find(e => e.id === 'enem')
      expect(enem).toBeDefined()
      expect(enem?.label).toBe('ENEM')
    })
  })

  describe('EXAM_TYPE_LABEL', () => {
    it('maps known exam ids to labels', () => {
      expect(EXAM_TYPE_LABEL['enem']).toBe('ENEM')
      expect(EXAM_TYPE_LABEL['fuvest']).toBe('FUVEST')
    })

    it('returns undefined for unknown id', () => {
      expect(EXAM_TYPE_LABEL['nonexistent_xyz']).toBeUndefined()
    })
  })

  describe('EXAM_TYPE_COLOR', () => {
    it('maps known exam ids to color strings', () => {
      expect(typeof EXAM_TYPE_COLOR['enem']).toBe('string')
      expect(EXAM_TYPE_COLOR['enem'].startsWith('#')).toBe(true)
    })

    it('returns undefined for unknown id', () => {
      expect(EXAM_TYPE_COLOR['nonexistent_xyz']).toBeUndefined()
    })
  })
})