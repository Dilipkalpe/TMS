import { useCallback, useEffect, useMemo, useState } from 'react'
import Input, { Select, Textarea } from '../ui/Input'
import VehicleMasterSelect from '../masters/VehicleMasterSelect'
import DriverMasterSelect from '../masters/DriverMasterSelect'
import PartyMasterSelect from '../masters/PartyMasterSelect'
import { consignorsApi, consigneesApi } from '../../services/api'
import { applyConsignorToLrForm, applyConsigneeToLrForm } from '../../utils/partyMasterLr'
import { formatCurrency } from '../ui/ReportFilters'
import { LR_BUSINESS_TYPES, LR_BUSINESS_TYPE_LABELS } from '../../constants/lrBusinessTypes'
import { useGridKeyboard } from '../../hooks/useGridKeyboard'
import LrEntryInformationSection from './entry/LrEntryInformationSection'
import LrEntryPartiesSection from './entry/LrEntryPartiesSection'
import LrEntryRouteSection from './entry/LrEntryRouteSection'
import LrEntryItemsSection, { ITEM_FIELD_KEYS } from './entry/LrEntryItemsSection'
import LrEntryChargesSection from './entry/LrEntryChargesSection'
import LrEntryAdditionalSection from './entry/LrEntryAdditionalSection'
import { computeLrFinancials } from '../../utils/lrEntryFinancials'

const PAYMENT_TYPES = ['To Pay', 'Paid', 'TBB', 'To Be Billed']

function tomorrowIsoDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export const emptyLrItem = () => ({
  id: crypto.randomUUID?.() ?? String(Date.now()),
  itemId: '',
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
  expectedDeliveryDate: tomorrowIsoDate(),
  expectedDeliveryTime: '',
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

function applyBillingFromMode(prev, mode) {
  if (mode === 'consignor') {
    return {
      ...prev,
      billingParty: prev.consignor,
      billingPartyAddress: prev.consignorAddress,
      billingPartyGst: prev.consignorGst,
      billingPartyPhone: prev.consignorPhone,
      billingPartyId: prev.consignorId,
      customerName: prev.consignor,
    }
  }
  if (mode === 'consignee') {
    return {
      ...prev,
      billingParty: prev.consignee,
      billingPartyAddress: prev.consigneeAddress,
      billingPartyGst: prev.consigneeGst,
      billingPartyPhone: prev.consigneePhone,
      billingPartyId: prev.consigneeId,
      customerName: prev.consignee,
    }
  }
  return prev
}

export default function LrEntryFormLayout({
  form,
  setForm,
  update,
  ultra = false,
  bookingSlot,
  fieldErrors = {},
  formActionsRef,
  onClearFieldErrors,
}) {
  const [billingMode, setBillingMode] = useState('consignor')

  const itemTotals = useMemo(() => {
    const items = form.items || []
    return {
      qty: items.reduce((s, i) => s + (Number(i.qty) || 0), 0),
      weight: items.reduce((s, i) => s + (Number(i.weight) || 0), 0),
      invoiceValue: items.reduce((s, i) => s + (Number(i.invoiceValue) || 0), 0),
    }
  }, [form.items])

  const { gstAmount, totalAmount } = useMemo(() => computeLrFinancials(form), [form])

  useEffect(() => {
    if (Math.abs(Number(form.gst) - gstAmount) > 0.01) {
      update('gst', gstAmount)
    }
  }, [gstAmount]) // eslint-disable-line react-hooks/exhaustive-deps

  const syncItemsToForm = useCallback((items) => {
    const qty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
    const weight = items.reduce((s, i) => s + (Number(i.weight) || 0), 0)
    const desc = items.map((i) => i.description).filter(Boolean).join('; ')
    const qtyStr = `${qty} pkgs / ${weight.toFixed(3)} kg`
    setForm((prev) => ({
      ...prev,
      items,
      material: desc || prev.material,
      quantity: qtyStr,
      customerName: prev.billingParty || prev.consignor,
    }))
  }, [setForm])

  const updateItem = (idx, field, value) => {
    const items = [...(form.items || [])]
    items[idx] = { ...items[idx], [field]: value }
    syncItemsToForm(items)
  }

  const patchItem = (idx, patch) => {
    const items = [...(form.items || [])]
    items[idx] = { ...items[idx], ...patch }
    syncItemsToForm(items)
  }

  const addItem = useCallback(() => {
    syncItemsToForm([...(form.items || []), emptyLrItem()])
  }, [form.items, syncItemsToForm])

  const removeItem = (idx) => syncItemsToForm((form.items || []).filter((_, i) => i !== idx))

  useEffect(() => {
    if (formActionsRef) {
      formActionsRef.current = { addItem }
    }
  }, [formActionsRef, addItem])

  const { containerRef: gridRef } = useGridKeyboard({
    rows: form.items || [],
    setRows: (items) => syncItemsToForm(items),
    createEmptyRow: emptyLrItem,
    fieldKeys: ITEM_FIELD_KEYS,
    enabled: !ultra,
  })

  const handleBillingModeChange = (mode) => {
    setBillingMode(mode)
    if (mode !== 'custom') {
      setForm((prev) => applyBillingFromMode(prev, mode))
    }
  }

  const copyBillingFromConsignor = () => {
    setBillingMode('consignor')
    setForm((prev) => applyBillingFromMode(prev, 'consignor'))
  }

  if (ultra) {
    return (
      <div className="lr-entry-shell lr-entry-compact">
        <div className="lr-entry-section shrink-0">
          <p className="lr-entry-band-title mb-1">Document</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-3 lg:grid-cols-6">
            <Input label="LR No." value={form.lrNumber || 'Auto'} readOnly />
            <Input label="LR Date *" type="date" value={form.lrDate} onChange={(e) => update('lrDate', e.target.value)} />
            <Input label="Branch" value={form.branchName} placeholder="Branch" onChange={(e) => update('branchName', e.target.value)} />
            <Select
              label="Type"
              options={LR_BUSINESS_TYPES.map((t) => ({ value: t, label: LR_BUSINESS_TYPE_LABELS[t] || t }))}
              value={form.businessType}
              onChange={(e) => update('businessType', e.target.value)}
            />
            {bookingSlot}
          </div>
        </div>
        <div className="lr-entry-section shrink-0">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 lg:grid-cols-4 xl:grid-cols-8">
            <PartyMasterSelect label="Consignor *" api={consignorsApi} valueId={form.consignorId} displayValue={form.consignor} onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsignorToLrForm(row) }))} />
            <PartyMasterSelect label="Consignee *" api={consigneesApi} valueId={form.consigneeId} displayValue={form.consignee} onSelect={(row) => setForm((prev) => ({ ...prev, ...applyConsigneeToLrForm(row) }))} />
            <Input label="From *" value={form.from} onChange={(e) => update('from', e.target.value)} />
            <Input label="To *" value={form.to} onChange={(e) => update('to', e.target.value)} />
            <VehicleMasterSelect
              label="Vehicle"
              displayValue={form.vehicle}
              placeholder="Search vehicle number…"
              onSelect={(row) => update('vehicle', row.number ?? '')}
            />
            <DriverMasterSelect
              label="Driver"
              displayValue={form.driver}
              placeholder="Search driver name…"
              onSelect={(row) => update('driver', row.name ?? '')}
            />
            <Input label="Material" value={form.material} onChange={(e) => update('material', e.target.value)} />
            <Input label="Qty/Wt" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} placeholder="pkgs/kg" />
            <Input label="E-Way Bill No." value={form.ewayBillNo} onChange={(e) => update('ewayBillNo', e.target.value)} />
            <Select label="Freight Type" options={PAYMENT_TYPES} value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} />
            <Input label="Freight ₹" type="number" value={form.freight} onChange={(e) => update('freight', e.target.value)} />
            <Input label="GST ₹" type="number" value={form.gst} onChange={(e) => update('gst', e.target.value)} />
            <Input label="Advance ₹" type="number" value={form.advance} onChange={(e) => update('advance', e.target.value)} />
            <Input label="Total ₹" readOnly value={formatCurrency(totalAmount)} />
          </div>
          <div className="mt-1">
            <Textarea label="Remarks" rows={1} maxLength={500} value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="lr-entry-v2-shell">
      <LrEntryInformationSection
        form={form}
        update={update}
        bookingSlot={bookingSlot}
        errors={fieldErrors}
      />

      <LrEntryPartiesSection
        form={form}
        setForm={setForm}
        update={update}
        billingMode={billingMode}
        onBillingModeChange={handleBillingModeChange}
        onCopyBillingFromConsignor={copyBillingFromConsignor}
        onClearFieldErrors={onClearFieldErrors}
        errors={fieldErrors}
      />

      <LrEntryRouteSection
        form={form}
        setForm={setForm}
        update={update}
        errors={fieldErrors}
      />

      <div className="lr-entry-v2-items-charges">
        <LrEntryItemsSection
          items={form.items}
          itemTotals={itemTotals}
          gridRef={gridRef}
          updateItem={updateItem}
          patchItem={patchItem}
          addItem={addItem}
          removeItem={removeItem}
          errors={fieldErrors}
        />
        <LrEntryChargesSection form={form} update={update} />
      </div>

      <LrEntryAdditionalSection form={form} update={update} />
    </div>
  )
}

export function parseLrRemarksMeta(remarks) {
  const text = remarks || ''
  const marker = '\n__lr_meta__:'
  const idx = text.indexOf(marker)
  if (idx === -1) {
    // Also accept meta glued without leading newline (legacy / trimmed rows).
    const alt = text.indexOf('__lr_meta__:')
    if (alt === -1) return { remarks: text, meta: null }
    try {
      return {
        remarks: text.slice(0, alt).trimEnd(),
        meta: JSON.parse(text.slice(alt + '__lr_meta__:'.length)),
      }
    } catch {
      return { remarks: text, meta: null }
    }
  }
  try {
    return {
      remarks: text.slice(0, idx).trimEnd(),
      meta: JSON.parse(text.slice(idx + marker.length)),
    }
  } catch {
    return { remarks: text, meta: null }
  }
}

/** Map API LR DTO (+ optional __lr_meta__ in remarks) into the shared entry form shape. */
export function mapLrDtoToEntryForm(lr) {
  const base = emptyLrEntryForm()
  const { remarks, meta } = parseLrRemarksMeta(lr?.remarks)
  const otherCharges = Number(meta?.otherCharges ?? 0)
  const storedHamali = Number(lr?.hamali ?? 0)
  const hamali = Math.max(0, storedHamali - otherCharges)

  const itemsFromMeta = Array.isArray(meta?.items) && meta.items.length > 0
    ? meta.items.map((item) => ({
        ...emptyLrItem(),
        ...item,
        id: item.id || (crypto.randomUUID?.() ?? String(Date.now())),
      }))
    : null

  const fallbackItem = emptyLrItem()
  if (!itemsFromMeta && (lr?.material || lr?.quantity)) {
    fallbackItem.description = lr.material || ''
    const qtyMatch = String(lr.quantity || '').match(/[\d.]+/)
    fallbackItem.qty = qtyMatch ? Number(qtyMatch[0]) : 0
  }

  return {
    ...base,
    bookingId: lr?.bookingId ?? '',
    lrNumber: lr?.lrNumber ?? '',
    lrDate: lr?.lrDate || base.lrDate,
    businessType: lr?.businessType || base.businessType,
    serviceType: meta?.serviceType || base.serviceType,
    consignorId: lr?.consignorId ?? '',
    consigneeId: lr?.consigneeId ?? '',
    consignor: lr?.consignor ?? '',
    consignee: lr?.consignee ?? '',
    billingParty: meta?.billingParty || lr?.customerName || lr?.consignor || '',
    customerName: lr?.customerName || meta?.billingParty || lr?.consignor || '',
    pickupAddress: meta?.pickupAddress || '',
    pickupCity: meta?.pickupCity || lr?.from || '',
    deliveryBranch: meta?.deliveryBranch || '',
    expectedDeliveryDate: meta?.expectedDeliveryDate || base.expectedDeliveryDate,
    expectedDeliveryTime: meta?.expectedDeliveryTime || '',
    from: lr?.from ?? '',
    to: lr?.to ?? '',
    vehicle: lr?.vehicle ?? '',
    driver: lr?.driver ?? '',
    material: lr?.material ?? '',
    quantity: lr?.quantity ?? '',
    items: itemsFromMeta || [fallbackItem],
    freight: Number(lr?.freight ?? 0),
    gst: Number(lr?.gst ?? 0),
    gstPercent: meta?.gstPercent || base.gstPercent,
    hamali,
    loadingCharges: Number(lr?.loadingCharges ?? 0),
    unloadingCharges: Number(lr?.unloadingCharges ?? 0),
    otherCharges,
    insurance: Number(lr?.insurance ?? 0),
    advance: Number(lr?.advance ?? 0),
    balance: Number(lr?.balance ?? 0),
    paymentType: lr?.paymentType || base.paymentType,
    remarks,
    ewayBillNo: meta?.ewayBillNo || '',
  }
}

export function buildLrApiPayload(form) {
  const meta = {
    serviceType: form.serviceType,
    expectedDeliveryDate: form.expectedDeliveryDate,
    expectedDeliveryTime: form.expectedDeliveryTime,
    pickupAddress: form.pickupAddress,
    pickupCity: form.pickupCity,
    deliveryBranch: form.deliveryBranch,
    billingParty: form.billingParty,
    items: form.items,
    gstPercent: form.gstPercent,
    otherCharges: form.otherCharges,
    ewayBillNo: form.ewayBillNo,
  }
  const baseRemarks = (form.remarks || '').split('\n__lr_meta__:')[0].split('__lr_meta__:')[0]
  const remarksExtra = `\n__lr_meta__:${JSON.stringify(meta)}`
  const {
    attachments, items, serviceType, expectedDeliveryDate, expectedDeliveryTime, pickupAddress,
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

/** Map in-progress form to LR print preview shape. */
export function formToPreviewLr(form) {
  return {
    ...form,
    lrNumber: form.lrNumber || 'DRAFT',
    customerName: form.billingParty || form.consignor,
  }
}
