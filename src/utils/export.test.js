import { describe, it, expect } from 'vitest'
import { formatChange } from './export'

describe('export utilities', () => {
  it('formatChange returns dash when previous is zero', () => {
    expect(formatChange(100, 0)).toEqual({ text: '—', positive: true })
  })

  it('formatChange calculates positive and negative percent', () => {
    expect(formatChange(150, 100)).toEqual({ text: '+50.0%', positive: true })
    expect(formatChange(80, 100)).toEqual({ text: '-20.0%', positive: false })
  })
})
