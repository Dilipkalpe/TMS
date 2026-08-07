import { useCallback, useEffect, useMemo } from 'react'
import {
  CloudUpload, Eye, Loader2, Plus, Printer, RotateCcw, Save, Trash2, X,
} from 'lucide-react'
import Button from '../ui/Button'
import Input, { Select, Textarea } from '../ui/Input'
import PartyMasterSelect from '../masters/PartyMasterSelect'
import { consignorsApi, consigneesApi } from '../../services/api'
import { applyConsignorToLrForm, applyConsigneeToLrForm } from '../../utils/partyMasterLr'
import { formatCurrency } from '../ui/ReportFilters'
import { LR_BUSINESS_TYPES, LR_BUSINESS_TYPE_LABELS } from '../../constants/lrBusinessTypes'
import { useGridKeyboard } from '../../hooks/useGridKeyboard'

const PAYMENT_TYPES = ['To Pay', 'Paid', 'TBB', 'To Be Billed']
const SERVICE_TYPES = ['Normal', 'Express', 'ODC', 'Priority']
const PACKAGE_TYPES = ['Box', 'Carton', 'Coil', 'Bag', 'Pallet', 'Other']
const GST_OPTIONS = ['0%', '5%', '12%', '18%', '28%']
const ITEM_FIELD_KEYS = ['description', 'hsn', 'packageType', 'qty', 'weight', 'invoiceNo', 'invoiceDate', 'invoiceValue']

export const emptyLrItem = () => ({
  id: crypto.randomUUID?.() ?? String(Date.now()),
  description: '',
  hsn: '',
  packageType: 'Box',
  qty: 0,
  weight: 0,
  invoiceNo: '',
  invoiceDate: '',
  invoiceValue: 0,
})

export const emptyLrEntryForm = () => ({
  bookingId: '',
  lrNumber: '',
  lrDate: new Date().toISOString().slice(0, 10),
  branchName: '',
  businessType: 'PTL',
  serviceType: 'Normal',
  consignorId: '',
  consigneeId: '',
  billingPartyId: '',
  consignor: '',
  consignee: '',
  billingParty: '',
  consignorContact: '',
  consignorPhone: '',
  consignorGst: '',
  consignorAddress: '',
  consigneeContact: '',
  consigneePhone: '',
  consigneeGst: '',
  consigneeAddress: '',
  billingPartyContact: '',
  billingPartyPhone: '',
  billingPartyGst: '',
  billingPartyAddress: '',
  pickupAddress: '',
  pickupCity: '',
  deliveryBranch: '',
  expectedDeliveryDate: '',
  from: '',
  to: '',
  vehicle: '',
  driver: '',
  material: '',
  quantity: '',
  items: [emptyLrItem()],
  freight: 0,
  gst: 0,
  gstPercent: '18%',
  hamali: 0,
  loadingCharges: 0,
  unloadingCharges: 0,
  otherCharges: 0,
  insurance: 0,
  advance: 0,
  balance: 0,
  paymentType: 'Paid',
  customerName: '',
  remarks: '',
  ewayBillNo: '',
  attachments: [],
})

function PartyBlock({ title, form, prefix, onSelect, onUpdate, sameAsConsignor, compact }) {
  const nameKey = prefix === 'billingParty' ? 'billingParty' : prefix
  const wrap = compact ? 'lr-entry-section lr-entry-compact min-h-0' : 'h-full p-4'
  return (
    <div className={wrap}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{title}</p>
      <div className={compact ? 'space-y-1' : 'space-y-3'}>
        {prefix === 'consignor' && (
          <PartyMasterSelect label="Name *" api={consignorsApi} valueId={form.consignorId} displayValue={form.consignor} onSelect={onSelect} />
        )}
        {prefix === 'consignee' && (
          <PartyMasterSelect label="Name *" api={consigneesApi} valueId={form.consigneeId} displayValue={form.consignee} onSelect={onSelect} />
        )}
        {prefix === 'billingParty' && (
          <div className="flex gap-1">
            <div className="min-w-0 flex-1">
              <Input label="Name *" value={form.billingParty} onChange={(e) => onUpdate('billingParty', e.target.value)} placeholder="Billing party" />
            </div>
            <Button size="sm" variant="outline" type="button" className="mt-4 shrink-0" onClick={sameAsConsignor}>Copy</Button>
          </div>
        )}
        <Textarea label="Address" rows={compact ? 1 : 2} value={form[`${nameKey}Address`] || ''} onChange={(e) => onUpdate(`${nameKey}Address`, e.target.value)} />
        <div className="grid grid-cols-2 gap-1">
          <Input label="GSTIN" value={form[`${nameKey}Gst`] || ''} onChange={(e) => onUpdate(`${nameKey}Gst`, e.target.value)} />
          <Input label="Mobile" value={form[`${nameKey}Phone`] || ''} onChange={(e) => onUpdate(`${nameKey}Phone`, e.target.value)} />
        </div>
      </div>
    </div>
  )
}

export default function LrEntryFormLayout({
  form,
  setForm,
  update,
  ultra = false,
  saving = false,
  onSave,
  onSavePrint,
  onPreview,
  onClear,
  onCancel,
  bookingSlot,
  flowBanner,
}) {
  const itemTotals = useMemo(() => {
    const items = form.items || []
    return {
      qty: items.reduce((s, i) => s + (Number(i.qty) || 0), 0),
      weight: items.reduce((s, i) => s + (Number(i.weight) || 0), 0),
      invoiceValue: items.reduce((s, i) => s + (Number(i.invoiceValue) || 0), 0),
    }
  }, [form.items])

  const taxable = useMemo(() => {
    return Number(form.freight || 0) + Number(form.loadingCharges || 0)
      + Number(form.unloadingCharges || 0) + Number(form.otherCharges || 0) + Number(form.hamali || 0)
  }, [form])

  const gstAmount = useMemo(() => {
    const pct = parseFloat(String(form.gstPercent || '0').replace('%', '')) || 0
    return Math.round(taxable * pct) / 100
  }, [taxable, form.gstPercent])

  const totalAmount = taxable + gstAmount + Number(form.insurance || 0)

  useEffect(() => {
    if (Math.abs(Number(form.gst) - gstAmount) > 0.01) {
      update('gst', gstAmount)
    }
  }, [gstAmount]) // eslint-disable-line react-hooks/exhaustive-deps

  const syncItemsToForm = useCallback((items) => {
    const desc = items.map((i) => i.description).filter(Boolean).join('; ')
    const qtyStr = `${itemTotals.qty} pkgs / ${itemTotals.weight.toFixed(3)} kg`
    setForm((prev) => ({
      ...prev,
      items,
      material: desc || prev.material,
      quantity: qtyStr,
      customerName: prev.billingParty || prev.consignor,
    }))
  }, [itemTotals.qty, itemTotals.weight, setForm])

  const updateItem = (idx, field, value) => {
    const items = [...(form.items || [])]
    items[idx] = { ...items[idx], [field]: value }
    syncItemsToForm(items)
  }

  const addItem = () => syncItemsToForm([...(form.items || []), emptyLrItem()])
  const removeItem = (idx) => syncItemsToForm((form.items || []).filter((_, i) => i !== idx))

  const { containerRef: gridRef, onContainerKeyDown } = useGridKeyboard({
    rows: form.items || [],
    setRows: (items) => syncItemsToForm(items),
    createEmptyRow: emptyLrItem,
    fieldKeys: ITEM_FIELD_KEYS,
    enabled: !ultra,
  })

  const copyBillingFromConsignor = () => {
    setForm((prev) => ({
      ...prev,
      billingParty: prev.consignor,
      billingPartyAddress: prev.consignorAddress,
      billingPartyGst: prev.consignorGst,
      billingPartyPhone: prev.consignorPhone,
      customerName: prev.consignor,
    }))
  }

  return (
    <div className="lr-entry-shell lr-entry-compact">
      {flowBanner && <div className="shrink-0 [&>div]:rounded [&>div]:px-2 [&>div]:py-1 [&>div]:text-[10px]">{flowBanner}</div>}

      {/* Header row */}
      <div className="lr-entry-section shrink-0">
        <div className="flex items-start gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-3 lg:grid-cols-6">
            <Input label="LR No." value={form.lrNumber || 'Auto'} readOnly />
            <Input label="LR Date *" type="date" value={form.lrDate} onChange={(e) => update('lrDate', e.target.value)} />
            <Input label="Branch" value={form.branchName} placeholder="Branch" onChange={(e) => update('branchName', e.target.value)} />
            <Select
              label="Type"
              options={LR_BUSINESS_TYPES.map((t) => ({ value: t, label: LR_BUSINESS_TYPE_LABELS[t] || t }))}
              value={form.businessType}
              onChange={(e) => update('businessType', e.target.value)}
            />
            {!ultra && (
              <Select label="Service" options={SERVICE_TYPES} value={form.serviceType} onChange={(e) => update('serviceType', e.target.value)} />
            )}
            {bookingSlot}
          </div>
          {!ultra && (
            <div className="hidden shrink-0 flex-col items-center rounded border border-dashed border-slate-300 px-2 py-1 text-center sm:flex dark:border-slate-600">
              <div className="flex h-10 w-10 items-center justify-center bg-slate-100 text-[8px] text-slate-500 dark:bg-slate-800">QR</div>
              <p className="text-[9px] font-semibold">{form.lrNumber || 'New'}</p>
            </div>
          )}
        </div>
      </div>

      {ultra ? (
        <>
          <div className="lr-entry-section shrink-0">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 lg:grid-cols-4 xl:grid-cols-8">
              <PartyMasterSelect label="Consignor *" api={consignorsApi} valueId={form.consignorId} displayValue={form.consignor} onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsignorToLrForm(row) }))} />
              <PartyMasterSelect label="Consignee *" api={consigneesApi} valueId={form.consigneeId} displayValue={form.consignee} onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsigneeToLrForm(row) }))} />
              <Input label="From *" value={form.from} onChange={(e) => update('from', e.target.value)} />
              <Input label="To *" value={form.to} onChange={(e) => update('to', e.target.value)} />
              <Input label="Material" value={form.material} onChange={(e) => update('material', e.target.value)} />
              <Input label="Qty/Wt" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} placeholder="pkgs/kg" />
              <Input label="E-Way Bill No." value={form.ewayBillNo} onChange={(e) => update('ewayBillNo', e.target.value)} />
              <Select label="Freight Type" options={PAYMENT_TYPES} value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} />
              <Input label="Freight ₹" type="number" value={form.freight} onChange={(e) => update('freight', e.target.value)} />
              <Input label="GST ₹" type="number" value={form.gst} onChange={(e) => update('gst', e.target.value)} />
              <Input label="Total ₹" readOnly value={formatCurrency(totalAmount)} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="lr-entry-party-grid shrink-0">
            <PartyBlock title="Consignor" prefix="consignor" compact form={form} onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsignorToLrForm(row), pickupCity: row.city || prev.from }))} onUpdate={update} />
            <PartyBlock title="Consignee" prefix="consignee" compact form={form} onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsigneeToLrForm(row), deliveryBranch: row.city || prev.to }))} onUpdate={update} />
            <PartyBlock title="Billing" prefix="billingParty" compact form={form} onUpdate={update} sameAsConsignor={copyBillingFromConsignor} />
          </div>

          <div className="lr-entry-section shrink-0">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 lg:grid-cols-5">
              <Input label="Pickup Addr" value={form.pickupAddress} onChange={(e) => update('pickupAddress', e.target.value)} />
              <Input label="Pickup City" value={form.pickupCity || form.from} onChange={(e) => update('pickupCity', e.target.value)} />
              <Input label="Destination" value={form.to} onChange={(e) => update('to', e.target.value)} />
              <Input label="Del. Branch" value={form.deliveryBranch} onChange={(e) => update('deliveryBranch', e.target.value)} />
              <Input label="Exp. Delivery" type="date" value={form.expectedDeliveryDate} onChange={(e) => update('expectedDeliveryDate', e.target.value)} />
            </div>
          </div>

          <div className="lr-entry-main">
            <div className="lr-entry-section flex min-h-0 flex-col overflow-hidden">
              <div className="mb-1 flex shrink-0 items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Item Details</p>
                <Button size="sm" variant="outline" icon={Plus} type="button" onClick={addItem}>Add (F7)</Button>
              </div>
              <div
                ref={gridRef}
                className="lr-entry-items-scroll"
                data-kbd-grid="true"
                onKeyDown={onContainerKeyDown}
              >
                <table className="w-full min-w-[720px] text-[11px]">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left dark:bg-slate-800">
                    <tr>
                      <th className="px-1 py-0.5">#</th>
                      <th className="px-1 py-0.5">Description</th>
                      <th className="px-1 py-0.5">HSN</th>
                      <th className="px-1 py-0.5">Pkg</th>
                      <th className="px-1 py-0.5">Qty</th>
                      <th className="px-1 py-0.5">Kg</th>
                      <th className="px-1 py-0.5">Inv#</th>
                      <th className="px-1 py-0.5">Date</th>
                      <th className="px-1 py-0.5">Value</th>
                      <th className="px-1 py-0.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {(form.items || []).map((item, idx) => (
                      <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-1 py-0.5">{idx + 1}</td>
                        {ITEM_FIELD_KEYS.map((field, colIdx) => (
                          <td key={field} className="px-1 py-0.5" data-grid-row={idx} data-grid-col={colIdx}>
                            {field === 'packageType' ? (
                              <select className="w-full rounded border px-0.5 py-0.5 dark:border-slate-700 dark:bg-slate-900" value={item.packageType} onChange={(e) => updateItem(idx, 'packageType', e.target.value)}>
                                {PACKAGE_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                              </select>
                            ) : (
                              <input
                                type={field === 'qty' || field === 'weight' || field === 'invoiceValue' ? 'number' : field === 'invoiceDate' ? 'date' : 'text'}
                                step={field === 'weight' ? '0.001' : undefined}
                                className="w-full min-w-0 rounded border px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900"
                                value={item[field] ?? ''}
                                onChange={(e) => updateItem(idx, field, e.target.value)}
                              />
                            )}
                          </td>
                        ))}
                        <td className="px-1 py-0.5">
                          <button type="button" className="text-red-500" onClick={() => removeItem(idx)} aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-slate-50 text-[10px] font-medium dark:bg-slate-900">
                    <tr>
                      <td colSpan={4} className="px-1 py-0.5">Totals</td>
                      <td className="px-1 py-0.5 text-green-700">{itemTotals.qty}</td>
                      <td className="px-1 py-0.5 text-green-700">{itemTotals.weight.toFixed(1)}</td>
                      <td colSpan={2} />
                      <td className="px-1 py-0.5 text-green-700">{formatCurrency(itemTotals.invoiceValue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="lr-entry-section flex min-h-0 flex-col overflow-y-auto">
              <p className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-primary">Freight</p>
              <div className="grid grid-cols-2 gap-1 xl:grid-cols-1">
                <Select label="Type" options={PAYMENT_TYPES} value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} />
                <Input label="Freight" type="number" value={form.freight} onChange={(e) => update('freight', e.target.value)} />
                <Input label="Loading" type="number" value={form.loadingCharges} onChange={(e) => update('loadingCharges', e.target.value)} />
                <Input label="Unloading" type="number" value={form.unloadingCharges} onChange={(e) => update('unloadingCharges', e.target.value)} />
                <Input label="Other" type="number" value={form.otherCharges} onChange={(e) => update('otherCharges', e.target.value)} />
                <Select label="GST %" options={GST_OPTIONS} value={form.gstPercent} onChange={(e) => update('gstPercent', e.target.value)} />
              </div>
              <div className="mt-1 shrink-0 rounded bg-green-50 px-2 py-1 dark:bg-green-950/30">
                <p className="text-[9px] text-green-800 dark:text-green-200">Taxable {formatCurrency(taxable)} · GST {formatCurrency(gstAmount)}</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-1 gap-1 lg:grid-cols-[1fr_auto]">
            <Textarea label={`Remarks (${(form.remarks || '').length}/500)`} rows={1} maxLength={500} value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
            <div className="lr-entry-section flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] text-primary">
                <CloudUpload className="h-3 w-3" /> Attach
                <input type="file" multiple className="hidden" onChange={(e) => update('attachments', [...(form.attachments || []), ...Array.from(e.target.files || [])])} />
              </label>
              {(form.attachments || []).slice(0, 3).map((f, i) => (
                <span key={i} className="max-w-[5rem] truncate rounded bg-slate-100 px-1 text-[9px] dark:bg-slate-800">{f.name}</span>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="lr-entry-footer">
        <Button size="sm" variant="outline" icon={RotateCcw} type="button" onClick={onClear}>Clear</Button>
        <Button size="sm" icon={saving ? Loader2 : Save} type="button" onClick={onSave} disabled={saving} className="bg-green-600 hover:bg-green-700">{saving ? '…' : 'Save'}</Button>
        <Button size="sm" icon={Printer} type="button" onClick={onSavePrint} disabled={saving}>Save & Print</Button>
        {!ultra && <Button size="sm" variant="secondary" icon={Eye} type="button" onClick={onPreview}>Preview</Button>}
        <Button size="sm" variant="outline" icon={X} type="button" onClick={onCancel} className="text-red-600">Cancel</Button>
      </div>
    </div>
  )
}

export function buildLrApiPayload(form) {
  const meta = {
    serviceType: form.serviceType,
    expectedDeliveryDate: form.expectedDeliveryDate,
    pickupAddress: form.pickupAddress,
    pickupCity: form.pickupCity,
    deliveryBranch: form.deliveryBranch,
    billingParty: form.billingParty,
    items: form.items,
    gstPercent: form.gstPercent,
    otherCharges: form.otherCharges,
    ewayBillNo: form.ewayBillNo,
  }
  const baseRemarks = (form.remarks || '').split('\n__lr_meta__:')[0]
  const remarksExtra = `\n__lr_meta__:${JSON.stringify(meta)}`
  const {
    attachments, items, serviceType, expectedDeliveryDate, pickupAddress,
    pickupCity, deliveryBranch, billingParty, gstPercent, otherCharges,
    billingPartyId, billingPartyContact, billingPartyPhone, billingPartyGst, billingPartyAddress,
    branchName,
    ...apiFields
  } = form
  return {
    ...apiFields,
    customerName: form.billingParty || form.consignor,
    hamali: Number(form.hamali || 0) + Number(form.otherCharges || 0),
    remarks: baseRemarks + remarksExtra,
  }
}
