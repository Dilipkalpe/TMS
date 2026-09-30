import { describe, expect, it } from 'vitest'
import {
  calcBillingLine,
  calcInvoiceSummary,
  gstRateForBillType,
  normalizeBillType,
} from './billingInvoiceUtils'

describe('billingInvoiceUtils GST', () => {
  it('normalizes bill types', () => {
    expect(normalizeBillType('rcm')).toBe('RCM')
    expect(normalizeBillType('STANDARD')).toBe('STANDARD')
    expect(normalizeBillType('')).toBe('FC')
  })

  it('uses 5% for RCM and 18% for FC', () => {
    expect(gstRateForBillType('RCM')).toBe(5)
    expect(gstRateForBillType('FC')).toBe(18)
  })

  it('splits CGST/SGST for intra-state FC line', () => {
    const line = calcBillingLine({ qty: 1, rate: 1000, gstPct: 18 }, 'FC', false)
    expect(line.taxable).toBe(1000)
    expect(line.gstAmt).toBe(180)
    expect(line.cgst).toBe(90)
    expect(line.sgst).toBe(90)
    expect(line.igst).toBe(0)
    expect(line.total).toBe(1180)
  })

  it('uses IGST for inter-state FC line', () => {
    const line = calcBillingLine({ qty: 2, rate: 500, gstPct: 18 }, 'FC', true)
    expect(line.taxable).toBe(1000)
    expect(line.igst).toBe(180)
    expect(line.cgst).toBe(0)
    expect(line.sgst).toBe(0)
    expect(line.total).toBe(1180)
  })

  it('RCM taxable-only total excludes GST from payable', () => {
    const line = calcBillingLine({ qty: 1, rate: 2000, gstPct: 5 }, 'RCM', false)
    expect(line.taxable).toBe(2000)
    expect(line.gstAmt).toBe(100)
    expect(line.total).toBe(2000)
  })

  it('invoice summary grand = taxable + gst + roundOff - advance (FC)', () => {
    const summary = calcInvoiceSummary({
      rows: [{ qty: 1, rate: 1000, gstPct: 18 }],
      form: { discount: 0, detentionCharges: 0, otherCharges: 0, adjustment: 0, roundOff: 0.4 },
      billType: 'FC',
      advance: 100,
      isInterstate: false,
    })
    expect(summary.freight).toBe(1000)
    expect(summary.gst).toBe(180)
    expect(summary.gross).toBe(1180)
    expect(summary.grand).toBeCloseTo(1080.4, 2)
    expect(summary.cgst).toBe(90)
    expect(summary.sgst).toBe(90)
  })

  it('rejects negative grand by flooring at zero', () => {
    const summary = calcInvoiceSummary({
      rows: [{ qty: 1, rate: 100, gstPct: 18 }],
      form: {},
      billType: 'FC',
      advance: 9999,
    })
    expect(summary.grand).toBe(0)
  })
})
