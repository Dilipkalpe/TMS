/** LR entry charge / tax calculations for form sync and footer summary. */
export function computeLrFinancials(form) {
  const subTotal = Number(form.freight || 0) + Number(form.loadingCharges || 0)
    + Number(form.unloadingCharges || 0) + Number(form.otherCharges || 0) + Number(form.hamali || 0)

  const taxable = subTotal
  const pct = parseFloat(String(form.gstPercent || '0').replace('%', '')) || 0
  const gstAmount = Math.round(taxable * pct) / 100
  const totalAmount = taxable + gstAmount + Number(form.insurance || 0)
  const balance = Number(form.balance ?? totalAmount - Number(form.advance || 0))

  return { subTotal, taxable, gstAmount, totalAmount, balance }
}
