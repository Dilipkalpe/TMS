import { useCallback, useEffect, useMemo } from 'react'
import {
  CloudUpload, Eye, Loader2, Plus, Printer, RotateCcw, Save, Trash2, X,
} from 'lucide-react'
import Card, { CardHeader } from '../ui/Card'
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
  attachments: [],
})

function PartyBlock({ title, form, prefix, onSelect, onUpdate, sameAsConsignor }) {
  const nameKey = prefix === 'billingParty' ? 'billingParty' : prefix
  return (
    <Card className="h-full p-4">
      <CardHeader title={title} />
      <div className="space-y-3">
        {prefix === 'consignor' && (
          <PartyMasterSelect
            label="Name *"
            api={consignorsApi}
            valueId={form.consignorId}
            displayValue={form.consignor}
            onSelect={onSelect}
          />
        )}
        {prefix === 'consignee' && (
          <PartyMasterSelect
            label="Name *"
            api={consigneesApi}
            valueId={form.consigneeId}
            displayValue={form.consignee}
            onSelect={onSelect}
          />
        )}
        {prefix === 'billingParty' && (
          <>
            <Input
              label="Name *"
              value={form.billingParty}
              onChange={(e) => onUpdate('billingParty', e.target.value)}
              placeholder={sameAsConsignor ? 'Same as consignor' : 'Billing party name'}
            />
            <Button size="sm" variant="outline" type="button" onClick={sameAsConsignor}>
              Copy from Consignor
            </Button>
          </>
        )}
        <Textarea label="Address" rows={2} value={form[`${nameKey}Address`] || ''} onChange={(e) => onUpdate(`${nameKey}Address`, e.target.value)} />
        <Input label="GSTIN" value={form[`${nameKey}Gst`] || ''} onChange={(e) => onUpdate(`${nameKey}Gst`, e.target.value)} />
        <Input label="Mobile" value={form[`${nameKey}Phone`] || ''} onChange={(e) => onUpdate(`${nameKey}Phone`, e.target.value)} />
      </div>
    </Card>
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
    <div className="space-y-4">
      {flowBanner}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Input label="LR No." value={form.lrNumber || 'Auto on save'} readOnly />
            <Input label="LR Date *" type="date" value={form.lrDate} onChange={(e) => update('lrDate', e.target.value)} />
            <Input label="Booking Branch" value={form.branchName} placeholder="Current branch" onChange={(e) => update('branchName', e.target.value)} />
            <Select
              label="Booking Type"
              options={LR_BUSINESS_TYPES.map((t) => ({ value: t, label: LR_BUSINESS_TYPE_LABELS[t] || t }))}
              value={form.businessType}
              onChange={(e) => update('businessType', e.target.value)}
            />
            {!ultra && (
              <Select label="Service Type" options={SERVICE_TYPES} value={form.serviceType} onChange={(e) => update('serviceType', e.target.value)} />
            )}
            {bookingSlot}
          </div>
          {!ultra && (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 p-3 text-center dark:border-slate-600">
              <div className="flex h-20 w-20 items-center justify-center bg-slate-100 text-[10px] text-slate-500 dark:bg-slate-800">
                QR
              </div>
              <p className="mt-1 text-xs text-slate-500">Scan to Track</p>
              <p className="text-xs font-semibold">{form.lrNumber || 'New LR'}</p>
            </div>
          )}
        </div>
      </Card>

      {!ultra && (
        <div className="grid gap-4 lg:grid-cols-3">
          <PartyBlock
            title="Consignor (From)"
            prefix="consignor"
            form={form}
            onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsignorToLrForm(row), pickupCity: row.city || prev.from }))}
            onUpdate={update}
          />
          <PartyBlock
            title="Consignee (To)"
            prefix="consignee"
            form={form}
            onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsigneeToLrForm(row), deliveryBranch: row.city || prev.to }))}
            onUpdate={update}
          />
          <PartyBlock
            title="Billing Party"
            prefix="billingParty"
            form={form}
            onUpdate={update}
            sameAsConsignor={copyBillingFromConsignor}
          />
        </div>
      )}

      {ultra ? (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PartyMasterSelect label="Consignor *" api={consignorsApi} valueId={form.consignorId} displayValue={form.consignor} onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsignorToLrForm(row) }))} />
            <PartyMasterSelect label="Consignee *" api={consigneesApi} valueId={form.consigneeId} displayValue={form.consignee} onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsigneeToLrForm(row) }))} />
            <Input label="From *" value={form.from} onChange={(e) => update('from', e.target.value)} />
            <Input label="To *" value={form.to} onChange={(e) => update('to', e.target.value)} />
            <Input label="Material" value={form.material} onChange={(e) => update('material', e.target.value)} />
            <Input label="Qty / Weight" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} placeholder="27 pkgs / 372 kg" />
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input label="Pickup Address" value={form.pickupAddress} onChange={(e) => update('pickupAddress', e.target.value)} />
              <Input label="Pickup City" value={form.pickupCity || form.from} onChange={(e) => update('pickupCity', e.target.value)} />
              <Input label="Destination" value={form.to} onChange={(e) => update('to', e.target.value)} />
              <Input label="Delivery Branch" value={form.deliveryBranch} onChange={(e) => update('deliveryBranch', e.target.value)} />
              <Input label="Expected Delivery Date" type="date" value={form.expectedDeliveryDate} onChange={(e) => update('expectedDeliveryDate', e.target.value)} />
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
            <Card padding={false}>
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <CardHeader title="Item Details" />
              </div>
              <div
                ref={gridRef}
                className="overflow-x-auto"
                data-kbd-grid="true"
                onKeyDown={onContainerKeyDown}
                title="Grid: F7 insert · F6 delete · Ctrl+D duplicate · Ctrl+C/V copy/paste"
              >
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
                    <tr>
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">Item Name / Description</th>
                      <th className="px-2 py-2">HSN</th>
                      <th className="px-2 py-2">Package</th>
                      <th className="px-2 py-2">Qty</th>
                      <th className="px-2 py-2">Weight (Kg)</th>
                      <th className="px-2 py-2">Invoice No.</th>
                      <th className="px-2 py-2">Invoice Date</th>
                      <th className="px-2 py-2">Invoice Value (₹)</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {(form.items || []).map((item, idx) => (
                      <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-1">{idx + 1}</td>
                        {ITEM_FIELD_KEYS.map((field, colIdx) => (
                          <td key={field} className="px-2 py-1" data-grid-row={idx} data-grid-col={colIdx}>
                            {field === 'packageType' ? (
                              <select className="rounded border px-1 py-1 text-sm dark:border-slate-700 dark:bg-slate-900" value={item.packageType} onChange={(e) => updateItem(idx, 'packageType', e.target.value)}>
                                {PACKAGE_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                              </select>
                            ) : (
                              <input
                                type={field === 'qty' || field === 'weight' || field === 'invoiceValue' ? 'number' : field === 'invoiceDate' ? 'date' : 'text'}
                                step={field === 'weight' ? '0.001' : undefined}
                                className={`rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 ${field === 'description' ? 'w-full' : field === 'hsn' ? 'w-20' : field === 'qty' ? 'w-16' : field === 'weight' ? 'w-20' : 'w-24'}`}
                                value={item[field] ?? ''}
                                onChange={(e) => updateItem(idx, field, e.target.value)}
                              />
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-1">
                          <button type="button" className="text-red-500 hover:text-red-700" onClick={() => removeItem(idx)} aria-label="Remove item">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-slate-50 text-sm font-medium dark:bg-slate-900">
                    <tr>
                      <td colSpan={4} className="px-4 py-2">
                        <Button size="sm" variant="outline" icon={Plus} type="button" onClick={addItem}>Add Item</Button>
                      </td>
                      <td className="px-2 py-2 text-green-700">{itemTotals.qty}</td>
                      <td className="px-2 py-2 text-green-700">{itemTotals.weight.toFixed(3)}</td>
                      <td colSpan={2} />
                      <td className="px-2 py-2 text-green-700">{formatCurrency(itemTotals.invoiceValue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <CardHeader title="Freight & Charges" />
              <div className="space-y-3">
                <Select label="Freight Type" options={PAYMENT_TYPES} value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} />
                <Input label="Freight Amount (₹)" type="number" value={form.freight} onChange={(e) => update('freight', e.target.value)} />
                <Input label="Loading Charges (₹)" type="number" value={form.loadingCharges} onChange={(e) => update('loadingCharges', e.target.value)} />
                <Input label="Unloading Charges (₹)" type="number" value={form.unloadingCharges} onChange={(e) => update('unloadingCharges', e.target.value)} />
                <Input label="Other Charges (₹)" type="number" value={form.otherCharges} onChange={(e) => update('otherCharges', e.target.value)} />
                <div className="rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <span className="text-slate-500">Taxable Amount</span>
                  <p className="font-semibold">{formatCurrency(taxable)}</p>
                </div>
                <Select label="GST %" options={GST_OPTIONS} value={form.gstPercent} onChange={(e) => update('gstPercent', e.target.value)} />
                <div className="rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  <span className="text-slate-500">GST Amount</span>
                  <p className="font-semibold">{formatCurrency(gstAmount)}</p>
                </div>
                <div className="rounded-lg bg-green-50 px-3 py-2 dark:bg-green-950/30">
                  <span className="text-xs text-green-800 dark:text-green-200">Total Amount (₹)</span>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <Textarea label={`Remarks (${(form.remarks || '').length} / 500)`} rows={4} maxLength={500} value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
            </Card>
            <Card className="p-4">
              <CardHeader title="Attachments" />
              <div className="flex flex-wrap gap-2">
                {(form.attachments || []).map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
                    {f.name}
                    <button type="button" onClick={() => update('attachments', form.attachments.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
                <CloudUpload className="h-4 w-4" />
                Upload More
                <input type="file" multiple className="hidden" onChange={(e) => {
                  const files = [...(form.attachments || []), ...Array.from(e.target.files || [])]
                  update('attachments', files)
                }} />
              </label>
            </Card>
          </div>
        </>
      )}

      {ultra && (
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Freight Type" options={PAYMENT_TYPES} value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} />
            <Input label="Freight (₹)" type="number" value={form.freight} onChange={(e) => update('freight', e.target.value)} />
            <Input label="GST (₹)" type="number" value={form.gst} onChange={(e) => update('gst', e.target.value)} />
            <Input label="Total" readOnly value={formatCurrency(totalAmount)} />
          </div>
        </Card>
      )}

      <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <Button variant="outline" icon={RotateCcw} type="button" onClick={onClear}>Clear</Button>
        <Button icon={saving ? Loader2 : Save} type="button" onClick={onSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button icon={Printer} type="button" onClick={onSavePrint} disabled={saving}>Save & Print</Button>
        {!ultra && <Button variant="secondary" icon={Eye} type="button" onClick={onPreview}>Preview</Button>}
        <Button variant="outline" icon={X} type="button" onClick={onCancel} className="text-red-600">Cancel</Button>
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
