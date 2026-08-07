const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n) {
  if (n < 20) return ones[n]
  return `${tens[Math.floor(n / 10)]}${ones[n % 10] ? ` ${ones[n % 10]}` : ''}`.trim()
}

function threeDigits(n) {
  if (n === 0) return ''
  if (n < 100) return twoDigits(n)
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigits(n % 100)}` : ''}`.trim()
}

/** Convert INR amount to words (Indian numbering). */
export function amountToWords(amount) {
  const n = Math.round(Number(amount) || 0)
  if (n === 0) return 'Rupees Zero Only'
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000
  const parts = []
  if (crore) parts.push(`${threeDigits(crore)} Crore`)
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`)
  if (rest) parts.push(threeDigits(rest))
  return `Rupees ${parts.join(' ')} Only`
}
