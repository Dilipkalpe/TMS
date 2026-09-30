import PrintLogo from './PrintLogo'
import { lrTotalCharges } from '../../utils/printUtils'

function biltyDate(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) {
    const s = String(value)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[3]}/${m[2]}/${m[1]}`
    return s
  }
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function money(v) {
  const n = num(v)
  if (!n) return '0'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function weightTons(lr) {
  const items = Array.isArray(lr.items) ? lr.items : []
  const fromItems = items.reduce((s, i) => s + num(i.weight), 0)
  const kg = num(lr.chargedWeight || lr.actualWeight || lr.weight || fromItems)
  if (!kg) return { display: '', tons: 0 }
  // Values over 50 treated as kg → convert to ton
  const tons = kg > 50 ? kg / 1000 : kg
  return { display: tons.toFixed(3), tons }
}

function articles(lr) {
  const items = Array.isArray(lr.items) ? lr.items : []
  const fromItems = items.reduce((s, i) => s + num(i.qty), 0)
  return lr.packages || lr.quantity || (fromItems || '') || ''
}

function gstSplit(lr) {
  const gst = num(lr.gst)
  const pctRaw = String(lr.gstPercent ?? '18').replace('%', '')
  const pct = num(pctRaw) || 18
  const halfPct = (pct / 2).toFixed(1)
  const halfAmt = gst / 2
  return { sgstPct: halfPct, cgstPct: halfPct, sgst: halfAmt, cgst: halfAmt, pct }
}

function bankRows(company) {
  const rows = []
  if (company?.bankName || company?.bankAccount) {
    rows.push({
      name: company.bankName || 'Bank',
      account: company.bankAccount || '',
      ifsc: company.ifsc || company.bankIfsc || '',
      branch: company.bankBranch || '',
    })
  }
  if (company?.bankName2 || company?.bankAccount2) {
    rows.push({
      name: company.bankName2 || 'Bank',
      account: company.bankAccount2 || '',
      ifsc: company.ifsc2 || company.bankIfsc2 || '',
      branch: company.bankBranch2 || '',
    })
  }
  if (Array.isArray(company?.banks)) {
    company.banks.forEach((b) => {
      if (b?.account || b?.name) rows.push(b)
    })
  }
  return rows
}

function LineSpacer({ lines = 3 }) {
  return (
    <div className="lr-bilty-lines">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="lr-bilty-line" />
      ))}
    </div>
  )
}

/**
 * Classic Morbi / Balaji Roadlines style Lorry Receipt (Bilty).
 * Matches CONSIGNOR COPY grid layout used by road transporters.
 */
export default function LRBalajiBiltyPrintFormat({
  lr,
  company,
  copyLabel = 'CONSIGNOR COPY',
}) {
  const name = (company?.companyName || 'BALAJI ROADLINES').toUpperCase()
  const tagline = (company?.tagline || company?.businessType || 'TRANSPORT CONTRACTOR & COMMISSION AGENT').toUpperCase()
  const address = company?.address || ''
  const phone = company?.phone || company?.mobile || ''
  const pan = company?.pan || ''
  const gstin = company?.gstin || company?.gst || ''
  const jurisdiction = company?.jurisdiction || company?.city || 'Local'
  const { display: wtDisplay, tons } = weightTons(lr)
  const freight = num(lr.freight)
  const rate = tons > 0 ? freight / tons : num(lr.ratePerTon || lr.rate)
  const { sgstPct, cgstPct, sgst, cgst } = gstSplit(lr)
  const advance = num(lr.advance)
  const total = Math.max(0, lrTotalCharges(lr) - advance)
  const gstPayableBy = lr.gstPayableBy
    || (String(lr.paymentType || '').toLowerCase().includes('paid') ? 'Consignor' : 'Consignee')
  const banks = bankRows(company)
  const goods = lr.material
    || (Array.isArray(lr.items) ? lr.items.map((i) => i.description || i.itemName || i.name).filter(Boolean).join(', ') : '')
    || ''
  const invoiceNo = lr.invoiceNo || lr.invoiceNumber
    || (Array.isArray(lr.items) ? lr.items.map((i) => i.invoiceNo).filter(Boolean).join(', ') : '')
    || ''
  const goodsValue = lr.invoiceValue || lr.declaredValue
    || (Array.isArray(lr.items) ? lr.items.reduce((s, i) => s + num(i.invoiceValue), 0) : 0)
    || ''
  const driverDl = lr.driverLicenseNo || lr.dlNo || lr.drivingLicence || ''
  const driverMobile = lr.driverMobile || lr.driverPhone || ''
  const rto = lr.rto || lr.vehicleRto || ''
  const orderBy = lr.orderBy || lr.bookingBy || lr.bookedBy || ''

  return (
    <div className="print-document print-variant-T6 lr-bilty">
      <div className="lr-bilty-sheet">
        <div className="lr-bilty-copy">{copyLabel}</div>

        <div className="lr-bilty-header">
          <div className="lr-bilty-logo">
            <PrintLogo company={company} />
          </div>
          <div className="lr-bilty-brand">
            <p className="lr-bilty-jurisdiction">Subject to {String(jurisdiction).toUpperCase()} Jurisdiction</p>
            <h1 className="lr-bilty-name">{name}</h1>
            <div className="lr-bilty-tagline">{tagline}</div>
            {address ? <p className="lr-bilty-addr">{address}</p> : null}
            {phone ? <p className="lr-bilty-phone">Mo. {phone}</p> : null}
          </div>
        </div>

        <table className="lr-bilty-table">
          <tbody>
            <tr>
              <td className="w-lr"><strong>L.R. No. :</strong> {lr.lrNumber || '—'}</td>
              <td className="w-truck"><strong>Truck No. :</strong> {lr.vehicle || '—'}</td>
              <td className="w-date"><strong>Date :</strong> {biltyDate(lr.lrDate)}</td>
            </tr>
            <tr>
              <td colSpan={2}><strong>From :</strong> {lr.from || ''}</td>
              <td><strong>To :</strong> {lr.to || ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="lr-bilty-table lr-bilty-parties">
          <tbody>
            <tr>
              <td className="w-half">
                <div><strong>Consignor :</strong> {lr.consignor || ''}</div>
                {lr.consignorAddress
                  ? <p className="lr-bilty-pre">{lr.consignorAddress}</p>
                  : <LineSpacer lines={3} />}
                <div className="mt-1"><strong>GSTIN No. :</strong> {lr.consignorGst || ''}</div>
                <div><strong>E-way Bill No. :</strong> {lr.ewayBillNo || lr.ewayBill || ''}</div>
              </td>
              <td className="w-half">
                <div><strong>Consignee :</strong> {lr.consignee || ''}</div>
                {lr.consigneeAddress
                  ? <p className="lr-bilty-pre">{lr.consigneeAddress}</p>
                  : <LineSpacer lines={3} />}
                <div className="mt-1"><strong>GSTIN No. :</strong> {lr.consigneeGst || ''}</div>
                <div><strong>E-way Bill No. :</strong> {lr.ewayBillNo2 || lr.consigneeEwayBillNo || lr.ewayBillNo || lr.ewayBill || ''}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="lr-bilty-table">
          <tbody>
            <tr>
              <td className="center bold">AT OWNER&apos;S RISK</td>
              <td className="center"><strong>PAN No. :</strong> {pan || '—'}</td>
              <td className="center"><strong>GSTIN No. :</strong> {gstin || '—'}</td>
            </tr>
            <tr>
              <td colSpan={3} className="center notice">
                We are not Responsible for any Breakages of your Goods. No Deduct Lorry Freight.
                Please Take insurance of your Goods.
              </td>
            </tr>
          </tbody>
        </table>

        <table className="lr-bilty-table lr-bilty-goods">
          <thead>
            <tr>
              <th className="w-articles">No. of Articles</th>
              <th>Nature of Goods said to contain</th>
              <th className="w-wt">Weight<br />(In Ton)</th>
              <th className="w-rate">Rate Per<br />Ton Rs.</th>
              <th className="w-freight">Total Freight<br />(In Rs.) Paid</th>
            </tr>
          </thead>
          <tbody>
            <tr className="lr-bilty-goods-row">
              <td className="center">{articles(lr)}</td>
              <td>{goods}</td>
              <td className="center">{wtDisplay}</td>
              <td className="num">{rate ? money(rate) : ''}</td>
              <td className="lr-bilty-charges" rowSpan={2}>
                <div className="charge-row"><span>Freight</span><span>{money(freight)}</span></div>
                <div className="charge-row"><span>SGST {sgstPct}%</span><span>{money(sgst)}</span></div>
                <div className="charge-row"><span>CGST {cgstPct}%</span><span>{money(cgst)}</span></div>
                <div className="charge-row"><span>Less Advance</span><span>{money(advance)}</span></div>
                <div className="charge-row total"><span>TOTAL FREIGHT RS. :</span><span>{money(total)}</span></div>
              </td>
            </tr>
            <tr className="lr-bilty-goods-fill">
              <td colSpan={4} className="lr-bilty-bank-cell">
                {banks.length === 0 ? (
                  <div className="lr-bilty-bank-empty">Bank Details</div>
                ) : (
                  <div className="lr-bilty-banks">
                    {banks.map((b, i) => (
                      <div key={i} className="lr-bilty-bank">
                        <strong>{b.name}</strong>
                        {b.account ? <> A/c. No. {b.account}</> : null}
                        {b.ifsc ? <>, IFSC CODE : {b.ifsc}</> : null}
                        {b.branch ? <>, BRANCH : {b.branch}</> : null}
                      </div>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="lr-bilty-table">
          <tbody>
            <tr>
              <td><strong>Value Rs. :</strong> {goodsValue ? money(goodsValue) : ''}</td>
              <td><strong>Delivery At :</strong> {lr.deliveryBranch || lr.to || ''}</td>
              <td><strong>Invoice No. :</strong> {invoiceNo}</td>
            </tr>
            <tr>
              <td colSpan={3}><strong>GST Payable by :</strong> <span className="bold">{gstPayableBy}</span></td>
            </tr>
            <tr>
              <td colSpan={3}><strong>Remark :</strong> {lr.remarks || ''}</td>
            </tr>
            <tr>
              <td colSpan={3}>
                <strong>Driver Detail :</strong>
                {' '}<strong>Name :</strong> {lr.driver || ''}
                {' '}&nbsp;&nbsp;<strong>D.L. No. :</strong> {driverDl}
                {' '}&nbsp;&nbsp;<strong>R.T.O. :</strong> {rto}
              </td>
            </tr>
            <tr>
              <td colSpan={2}><strong>Driver Mobile No. :</strong> {driverMobile}</td>
              <td><strong>Order By :</strong> {orderBy}</td>
            </tr>
          </tbody>
        </table>

        <table className="lr-bilty-table lr-bilty-footer">
          <tbody>
            <tr>
              <td className="w-note">
                <p className="lr-bilty-footnote">
                  We are only Broker and commission agent. Please Check the all documents of truck carefully
                  terms and condition over leaf. Subject to {String(jurisdiction).toUpperCase()} Jurisdiction
                </p>
              </td>
              <td className="w-sign">
                <p className="bold">For {name}</p>
                <div className="lr-bilty-sign-space" />
                <p className="bold">Authorized Signatory</p>
              </td>
            </tr>
          </tbody>
        </table>

        <p className="lr-bilty-computer">This is computer Generated Bilty</p>
      </div>
    </div>
  )
}
