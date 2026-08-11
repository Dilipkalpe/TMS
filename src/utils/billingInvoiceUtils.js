/** Bill types accepted by POST /api/lr/{lrNumber}/invoice */
export const SUPPORTED_BILL_TYPES = [
  { value: 'FC', label: 'Freight Invoice (FC)' },
  { value: 'RCM', label: 'RCM Invoice' },
  { value: 'STANDARD', label: 'Standard Invoice' },
]

export const PAYMENT_TERMS = ['Immediate', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days']
export const PAYMENT_MODES = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'Credit']

export function normalizeBillType(type) {
  const t = String(type || 'FC').toUpperCase()
  if (t === 'RCM') return 'RCM'
  if (t === 'STANDARD') return 'STANDARD'
  return 'FC'
}

export function gstRateForBillType(billType) {
  return normalizeBillType(billType) === 'RCM' ? 5 : 18
}

export function isInterstateGst(companyGstin, partyGstin) {
  const a = String(companyGstin || '').slice(0, 2)
  const b = String(partyGstin || '').slice(0, 2)
  if (!/^\d{2}$/.test(a) || !/^\d{2}$/.test(b)) return false
  return a !== b
}

export function financialYear(isoDate) {
  const d = isoDate ? new Date(isoDate) : new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  if (m >= 4) return `${y}-${String(y + 1).slice(-2)}`
  return `${y - 1}-${String(y).slice(-2)}`
}

export function dueDateFromTerms(invoiceDate, terms) {
  const days = parseInt(String(terms).replace(/\D/g, ''), 10) || 0
  const d = new Date(invoiceDate || new Date())
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function validateGstin(gstin) {
  if (!gstin || !String(gstin).trim()) return true
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(String(gstin).trim())
}

function newLineId(prefix = '') {
  return `${prefix}${crypto.randomUUID?.() ?? Date.now()}`
}

export function emptyLine(lr, billType = 'FC') {
  const gstPct = gstRateForBillType(billType)
  return {
    id: newLineId(),
    particulars: 'Freight Charges',
    description: lr ? `Freight Charges - ${lr.from || ''} to ${lr.to || ''}` : '',
    hsn: '996511',
    lrRef: lr?.lrNumber || '',
    qty: 1,
    unit: 'Trip',
    rate: Number(lr?.freight || 0),
    gstPct,
  }
}

function pushChargeLine(lines, lr, label, amount, billType) {
  if (Number(amount) <= 0) return
  lines.push({
    ...emptyLine(lr, billType),
    id: newLineId(`${lr.lrNumber}-${label}-`),
    particulars: label,
    description: `${label} - ${lr.lrNumber}`,
    rate: Number(amount),
  })
}

/** Build editable line items from LR charge fields (mirrors server BookingFinanceService categories). */
export function linesFromLr(lr, billType = 'FC') {
  if (!lr) return []
  const lines = [emptyLine(lr, billType)]
  pushChargeLine(lines, lr, 'Loading Charges', lr.loadingCharges, billType)
  pushChargeLine(lines, lr, 'Unloading Charges', lr.unloadingCharges, billType)
  pushChargeLine(lines, lr, 'Hamali', lr.hamali, billType)
  pushChargeLine(lines, lr, 'Insurance', lr.insurance, billType)
  return lines
}

export function linesFromLrs(lrs, billType = 'FC') {
  return (lrs || []).flatMap((lr) => linesFromLr(lr, billType))
}

export function calcBillingLine(row, billType, isInterstate = false) {
  const taxable = Number(row.qty || 1) * Number(row.rate || 0)
  const gstPct = Number(row.gstPct ?? gstRateForBillType(billType))
  const gstAmt = Math.round(taxable * gstPct) / 100
  const igst = isInterstate ? gstAmt : 0
  const cgst = isInterstate ? 0 : gstAmt / 2
  const sgst = isInterstate ? 0 : gstAmt / 2
  const isRcm = normalizeBillType(billType) === 'RCM'
  const total = isRcm ? taxable : taxable + gstAmt
  return { taxable, gstPct, gstAmt, cgst, sgst, igst, total }
}

export function calcInvoiceSummary({ rows, form, billType, advance = 0, isInterstate = false }) {
  const lineTotals = (rows || []).reduce((s, r) => {
    const c = calcBillingLine(r, billType, isInterstate)
    return { taxable: s.taxable + c.taxable, gst: s.gst + c.gstAmt, total: s.total + c.total }
  }, { taxable: 0, gst: 0, total: 0 })

  const freight = lineTotals.taxable
  const detention = Number(form?.detentionCharges || 0)
  const other = Number(form?.otherCharges || 0)
  const discount = Number(form?.discount || 0)
  const adjustment = Number(form?.adjustment || 0)
  const sub = freight + detention + other
  const adjusted = Math.max(0, sub - discount + adjustment)
  const gstRate = gstRateForBillType(billType)
  const isRcm = normalizeBillType(billType) === 'RCM'
  const gst = isRcm
    ? Math.round(adjusted * gstRate) / 100
    : lineTotals.gst
  const roundOff = Number(form?.roundOff || 0)
  const gross = isRcm ? adjusted : adjusted + gst
  const adv = Number(advance || 0)
  const grand = Math.max(0, gross + roundOff - adv)
  const halfGst = gst / 2

  return {
    freight,
    detention,
    other,
    discount,
    adjustment,
    sub,
    adjusted,
    gst,
    gstRate,
    cgst: isInterstate ? 0 : halfGst,
    sgst: isInterstate ? 0 : halfGst,
    igst: isInterstate ? gst : 0,
    roundOff,
    gross,
    advance: adv,
    grand,
    isRcm,
    isInterstate,
  }
}

export function buildInvoicePayload({ form, rows, summary, lr }) {
  const lrLines = lr ? linesFromLr(lr, form.invoiceType) : rows
  return {
    billType: normalizeBillType(form.invoiceType),
    invoiceDate: form.invoiceDate,
    customerName: form.billTo,
    gstin: form.billToGstin || undefined,
    placeOfSupply: form.placeOfSupply,
    paymentType: form.paymentMode,
    notes: form.remarks,
    lineItems: lrLines.map((r) => ({
      particulars: r.particulars,
      description: r.description,
      hsn: r.hsn,
      lrRef: r.lrRef,
      qty: r.qty,
      unit: r.unit,
      rate: r.rate,
      gstPct: r.gstPct,
    })),
    amountInWords: summary.amountInWords || undefined,
    paymentDetails: {
      mode: form.paymentMode,
      terms: form.paymentTerms,
      dueDate: form.dueDate,
      bankAccount: form.bankAccount,
      ifsc: form.ifsc,
    },
  }
}

export function printBillFromResult({ inv, form, company, summary, rows, lr }) {
  const isRcm = normalizeBillType(form.invoiceType) === 'RCM'
  return {
    billNo: inv.invoiceNo || inv.invoiceNumber || 'Draft',
    billType: form.invoiceType,
    billDate: inv.invoiceDate || form.invoiceDate,
    customerName: form.billTo,
    gstin: form.billToGstin,
    placeOfSupply: form.placeOfSupply,
    taxableAmount: inv.taxableAmount ?? summary.adjusted,
    gstAmount: inv.gstAmount ?? summary.gst,
    totalAmount: inv.totalAmount ?? summary.grand,
    netPayable: inv.balance ?? inv.totalAmount ?? summary.grand,
    advance: summary.advance,
    grossTotal: isRcm ? summary.adjusted : summary.adjusted + summary.gst,
    bookingId: lr?.bookingId,
    lines: rows.map((r) => ({
      description: r.description || r.particulars,
      amount: calcBillingLine(r, form.invoiceType, summary.isInterstate).taxable,
    })),
  }
}
