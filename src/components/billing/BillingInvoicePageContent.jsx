import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2, FileText, MapPin, Package, Percent, Landmark, Paperclip, ClipboardList, ShieldCheck,
} from 'lucide-react'
import ERPPageTitle from '../ui/ERPPageTitle'
import Input, { Select, Textarea } from '../ui/Input'
import SlideDrawer from '../ui/SlideDrawer'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import PartyMasterSelect from '../masters/PartyMasterSelect'
import OpsWorkflowFlowBanner from '../ops/OpsWorkflowFlowBanner'
import BillingSectionCard from './entry/BillingSectionCard'
import BillingCustomerCreditSummary from './entry/BillingCustomerCreditSummary'
import BillingSourceSection from './entry/BillingSourceSection'
import BillingLineItemsSection from './entry/BillingLineItemsSection'
import BillingInvoiceActionBar from './BillingInvoiceActionBar'
import BillingExistingInvoiceAlert from './BillingExistingInvoiceAlert'
import { statusBadgeVariant } from '../../utils/opsWorkflowUtils'
import { customersApi, freightRatesApi, lrOperationsApi, lrProcessApi } from '../../services/api'
import { formatCurrency } from '../ui/ReportFilters'
import { amountToWords } from '../../utils/amountWords'
import {
  SUPPORTED_BILL_TYPES,
  PAYMENT_MODES,
  PAYMENT_TERMS,
  buildInvoicePayload,
  calcInvoiceSummary,
  dueDateFromTerms,
  emptyLine,
  financialYear,
  gstRateForBillType,
  isInterstateGst,
  linesFromLr,
  linesFromLrs,
  printBillFromResult,
  validateGstin,
} from '../../utils/billingInvoiceUtils'
import { useAuth } from '../../context/AuthContext'
import { usePrint } from '../../context/PrintContext'
import { useToast } from '../../context/ToastContext'
import { useKeyboardPageActions } from '../../hooks/useKeyboardPageActions'
import { useGridKeyboard } from '../../hooks/useGridKeyboard'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { buildListParams } from '../../hooks/usePagedApiResource'

const DRAFT_KEY = 'billing-invoice-draft'
const LINE_KEYS = ['particulars', 'hsn', 'description', 'lrRef', 'qty', 'unit', 'rate', 'gstPct']

function lrAdvance(lr) {
  return Number(lr?.advance ?? 0)
}

function loadingTotal(lrs) {
  return (lrs || []).reduce((s, lr) => s + Number(lr.loadingCharges || 0), 0)
}

function unloadingTotal(lrs) {
  return (lrs || []).reduce((s, lr) => s + Number(lr.unloadingCharges || 0), 0)
}

export default function BillingInvoicePageContent({
  lrNumber: primaryLrNumber,
  lr: primaryLr,
  process,
  saving,
  runSave,
  onBack,
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const { user } = useAuth()
  const existingInvoice = process?.invoice

  const [form, setForm] = useState(() => ({
    invoiceDate: new Date().toISOString().slice(0, 10),
    branchName: user?.branchName || primaryLr?.branchName || '',
    invoiceType: 'FC',
    invoiceSeries: '',
    paymentTerms: '30 Days',
    dueDate: dueDateFromTerms(new Date().toISOString().slice(0, 10), '30 Days'),
    currency: 'INR - Indian Rupee',
    placeOfSupply: primaryLr?.to || '',
    billTo: primaryLr?.customerName || primaryLr?.consignor || '',
    serviceLocation: primaryLr ? `${primaryLr.from || ''} → ${primaryLr.to || ''}` : '',
    billToAddress: '',
    billToGstin: '',
    billToState: '',
    billToStateCode: '',
    paymentMode: 'NEFT',
    bankAccount: '',
    accountName: '',
    ifsc: '',
    bankBranch: '',
    discount: 0,
    adjustment: 0,
    detentionCharges: 0,
    otherCharges: 0,
    roundOff: 0,
    remarks: '',
    terms: '',
    eInvoiceStatus: 'Not Generated',
    ewayBillNo: primaryLr?.ewayBillNo || '',
    ewayStatus: 'Not Generated',
    status: 'Draft',
  }))

  const [customerId, setCustomerId] = useState('')
  const [customer, setCustomer] = useState(null)
  const [credit, setCredit] = useState(null)
  const [queueRows, setQueueRows] = useState([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [selectedLrs, setSelectedLrs] = useState(() => new Set(primaryLrNumber ? [primaryLrNumber] : []))
  const [lineItems, setLineItems] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [sourceSearch, setSourceSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState({ dateFrom: '', dateTo: '', branch: '', customer: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const draftLoadedRef = useRef(false)

  const u = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v }
    if (k === 'paymentTerms' || k === 'invoiceDate') {
      next.dueDate = dueDateFromTerms(k === 'invoiceDate' ? v : f.invoiceDate, k === 'paymentTerms' ? v : f.paymentTerms)
    }
    if (k === 'invoiceType') {
      const rate = gstRateForBillType(v)
      setLineItems((prev) => (prev || []).map((row) => ({ ...row, gstPct: rate })))
    }
    return next
  })

  const isInterstate = useMemo(
    () => isInterstateGst(company?.gst || company?.gstin, form.billToGstin),
    [company?.gst, company?.gstin, form.billToGstin],
  )

  const loadQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const params = buildListParams({ page: 1, pageSize: 100, search: sourceSearch })
      if (draftFilters.dateFrom) params.dateFrom = draftFilters.dateFrom
      if (draftFilters.dateTo) params.dateTo = draftFilters.dateTo
      const res = await lrOperationsApi.queue('pod-uploaded', params)
      const rows = res?.items ?? (Array.isArray(res) ? res : [])
      setQueueRows(rows.map((r) => ({
        ...r,
        billingStatus: ['Invoice Generated', 'Expense Added', 'Expense Approved', 'Closed'].includes(r.status)
          ? 'Billed'
          : (r.billingStatus || 'Unbilled'),
      })))
    } catch {
      setQueueRows([])
    } finally {
      setQueueLoading(false)
    }
  }, [sourceSearch, draftFilters])

  useEffect(() => { loadQueue() }, [loadQueue])

  const loadCustomer = useCallback(async (id) => {
    if (!id) { setCustomer(null); setCredit(null); return }
    try {
      const c = await customersApi.get(id)
      setCustomer(c)
      setCredit({
        customerName: c.name,
        creditLimit: c.creditLimit,
        outstanding: c.outstanding,
        overdue: c.overdue ?? 0,
      })
      const stateCode = c.gst ? String(c.gst).slice(0, 2) : ''
      setForm((f) => ({
        ...f,
        billTo: c.name,
        billToAddress: c.address || '',
        billToGstin: c.gst || '',
        billToStateCode: stateCode,
        placeOfSupply: c.state || f.placeOfSupply,
      }))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!primaryLr) return
    setSelectedLrs(new Set([primaryLrNumber]))
    setLineItems((prev) => prev?.length ? prev : linesFromLrs([primaryLr], form.invoiceType))
    setForm((f) => ({
      ...f,
      billTo: primaryLr.customerName || primaryLr.consignor || f.billTo,
      serviceLocation: `${primaryLr.from || ''} → ${primaryLr.to || ''}`,
      placeOfSupply: primaryLr.to || f.placeOfSupply,
      ewayBillNo: primaryLr.ewayBillNo || f.ewayBillNo,
    }))
    const cid = process?.customerId || primaryLr.customerId
    if (cid && !customerId) {
      setCustomerId(cid)
      loadCustomer(cid)
    }
  }, [primaryLrNumber, primaryLr, process?.customerId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (draftLoadedRef.current || !primaryLrNumber) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.primaryLrNumber !== primaryLrNumber) return
      if (draft.form) setForm((f) => ({ ...f, ...draft.form }))
      if (draft.lineItems?.length) setLineItems(draft.lineItems)
      if (draft.selectedLrs?.length) setSelectedLrs(new Set(draft.selectedLrs))
      draftLoadedRef.current = true
      toast({ title: 'Draft restored', type: 'info' })
    } catch { /* ignore */ }
  }, [primaryLrNumber, toast])

  const selectedLrRows = useMemo(() => {
    const map = new Map(queueRows.map((r) => [r.lrNumber, r]))
    if (primaryLr && primaryLrNumber) map.set(primaryLrNumber, primaryLr)
    return [...selectedLrs].map((n) => map.get(n)).filter(Boolean)
  }, [selectedLrs, queueRows, primaryLr, primaryLrNumber])

  useEffect(() => {
    if (!selectedLrRows.length) return
    setLineItems(linesFromLrs(selectedLrRows, form.invoiceType))
  }, [selectedLrRows.map((r) => r.lrNumber).join(','), form.invoiceType]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = lineItems?.length ? lineItems : (primaryLr ? linesFromLr(primaryLr, form.invoiceType) : [])
  const totalAdvance = useMemo(
    () => selectedLrRows.reduce((s, lr) => s + lrAdvance(lr), 0),
    [selectedLrRows],
  )

  const summary = useMemo(() => {
    const base = calcInvoiceSummary({
      rows,
      form,
      billType: form.invoiceType,
      advance: totalAdvance,
      isInterstate,
    })
    return { ...base, amountInWords: amountToWords(base.grand) }
  }, [rows, form, totalAdvance, isInterstate])

  const [rateInfo, setRateInfo] = useState(null)
  useEffect(() => {
    const lr = selectedLrRows[0] || primaryLr
    if (!lr?.from || !lr?.to) return
    freightRatesApi.lookup({ from: lr.from, to: lr.to })
      .then((res) => setRateInfo(res))
      .catch(() => setRateInfo(null))
  }, [selectedLrRows, primaryLr])

  const addLine = useCallback(() => {
    setLineItems((prev) => [...(prev || rows), emptyLine(selectedLrRows[0] || primaryLr, form.invoiceType)])
  }, [rows, selectedLrRows, primaryLr, form.invoiceType])

  const { containerRef: gridRef } = useGridKeyboard({
    rows,
    setRows: setLineItems,
    createEmptyRow: () => emptyLine(selectedLrRows[0] || primaryLr, form.invoiceType),
    fieldKeys: LINE_KEYS,
    enabled: !existingInvoice,
  })

  const validate = (opts = {}) => {
    const errors = {}
    if (!form.invoiceDate) errors.invoiceDate = 'Invoice date is required.'
    if (!form.branchName?.trim()) errors.branchName = 'Branch is required.'
    if (!form.billTo?.trim()) errors.billTo = 'Customer / Bill To is required.'
    if (!form.placeOfSupply?.trim()) errors.placeOfSupply = 'Place of supply is required.'
    if (!selectedLrs.size && !primaryLrNumber) errors.source = 'Select at least one billable LR.'
    if (form.dueDate && form.invoiceDate && form.dueDate < form.invoiceDate) {
      errors.dueDate = 'Due date cannot be before invoice date.'
    }
    if (form.billToGstin && !validateGstin(form.billToGstin)) {
      errors.billToGstin = 'Invalid GSTIN format.'
    }
    if (existingInvoice && !opts.preview) errors.invoice = 'An active invoice already exists for this LR.'

    const billed = selectedLrRows.filter((r) => String(r.billingStatus).toLowerCase() === 'billed')
    if (billed.length) errors.source = `Already billed: ${billed.map((r) => r.lrNumber).join(', ')}`

    setFieldErrors(errors)
    const first = Object.values(errors)[0]
    if (first) {
      toast({ title: 'Validation', message: first, type: 'warning' })
      return false
    }
    return true
  }

  const handleSave = async (andPrint = false) => {
    if (!validate()) return
    const targets = [...selectedLrs]
    if (!targets.length && primaryLrNumber) targets.push(primaryLrNumber)

    await runSave(
      targets.length > 1
        ? `${targets.length} invoices created (one per LR)`
        : 'Invoice saved',
      async () => {
        const results = []
        for (const lrNum of targets) {
          const lr = selectedLrRows.find((r) => r.lrNumber === lrNum) || primaryLr
          const payload = buildInvoicePayload({
            form,
            rows: linesFromLr(lr, form.invoiceType),
            summary: { amountInWords: amountToWords(summary.grand) },
            lr,
          })
          const res = await lrProcessApi.createInvoice(lrNum, payload)
          results.push({ lrNum, res, lr })
        }
        localStorage.removeItem(DRAFT_KEY)
        if (andPrint && results[0]) {
          const { res, lr } = results[0]
          await printModuleDocument({
            moduleCode: PRINT_MODULE_CODES.BILLING,
            company,
            print,
            documentData: {
              bill: printBillFromResult({ inv: res, form, company, summary, rows: linesFromLr(lr, form.invoiceType), lr }),
              lr,
            },
          })
        }
        navigate('/operations/billing/list')
      },
    )
  }

  const handlePreview = () => {
    if (!validate({ preview: true })) return
    printModuleDocument({
      moduleCode: PRINT_MODULE_CODES.BILLING,
      company,
      print,
      documentData: {
        bill: printBillFromResult({
          inv: { invoiceNo: existingInvoice?.invoiceNo || existingInvoice?.InvoiceNo || 'DRAFT' },
          form,
          company,
          summary,
          rows,
          lr: primaryLr,
        }),
        lr: primaryLr,
      },
    })
  }

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        primaryLrNumber,
        form,
        lineItems: rows,
        selectedLrs: [...selectedLrs],
      }))
      toast({ title: 'Draft saved locally', type: 'success' })
    } catch (e) {
      toast({ title: 'Draft save failed', message: e.message, type: 'error' })
    }
  }

  useKeyboardPageActions({
    onSave: () => handleSave(false),
    onPrint: () => handleSave(true),
    onPreview: handlePreview,
    onCancel: () => (onBack ? onBack() : navigate('/operations/billing/list')),
    onAddRow: addLine,
    onSearch: () => document.getElementById('billing-section-customer')?.scrollIntoView({ behavior: 'smooth' }),
    enabled: !existingInvoice,
  }, [handleSave, handlePreview, addLine, navigate, onBack, existingInvoice])

  const toggleLr = (num) => {
    const row = queueRows.find((r) => r.lrNumber === num) || (primaryLrNumber === num ? primaryLr : null)
    if (row && String(row.billingStatus).toLowerCase() === 'billed') {
      toast({ title: 'Already billed', message: `${num} cannot be selected.`, type: 'warning' })
      return
    }
    setSelectedLrs((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  const filterCount = Object.values(draftFilters).filter(Boolean).length
  const invoiceLocked = Boolean(existingInvoice)
  const gstHalf = summary.gstRate / 2

  const statusLabel = invoiceLocked
    ? (existingInvoice?.status || 'Issued')
    : (form.status || 'Draft')

  return (
    <div className="loading-slip-page billing-v2-page flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Billing"
        title="New Billing Invoice"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Operations', path: '/operations' },
          { label: 'Billing', path: '/operations/billing/list' },
          { label: primaryLrNumber || 'New Invoice' },
        ]}
      />

      <div className="loading-slip-scroll billing-v2-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4" data-kbd-form-root>
        <div className="loading-slip-hero mb-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Billing</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  New Billing Invoice
                </h1>
                <Badge variant={statusBadgeVariant(statusLabel)}>{statusLabel}</Badge>
                {primaryLrNumber ? (
                  <Badge variant="info">{selectedLrs.size} LR selected</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {primaryLrNumber ? (
                  <>
                    LR: <span className="font-semibold text-primary">{primaryLrNumber}</span>
                  </>
                ) : 'Select unbilled LRs below to build the invoice'}
                {form.billTo ? (
                  <> · Bill to: <span className="font-medium">{form.billTo}</span></>
                ) : null}
                {form.serviceLocation ? (
                  <> · {form.serviceLocation}</>
                ) : null}
                {' · '}
                <span className="font-semibold text-emerald-600">{formatCurrency(summary.grand)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => (onBack ? onBack() : navigate('/operations/billing/list'))}>
                Back to list
              </Button>
              <Button size="sm" type="button" onClick={() => handleSave(false)} disabled={saving || invoiceLocked}>
                Save Invoice
              </Button>
            </div>
          </div>
        </div>

        {primaryLrNumber ? (
          <div className="mb-1 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <OpsWorkflowFlowBanner lrNumber={primaryLrNumber} lr={primaryLr} process={process} currentStep="billing" />
          </div>
        ) : null}

        {invoiceLocked ? <BillingExistingInvoiceAlert invoice={existingInvoice} /> : null}
        <BillingCustomerCreditSummary credit={credit} />

        <BillingSectionCard
          title="Invoice information"
          subtitle="Numbering, dates and payment terms"
          icon={FileText}
          id="billing-section-info"
          className="mb-1"
        >
          <div className="billing-v2-grid billing-v2-grid--3">
            <Input label="Invoice No." value={existingInvoice?.invoiceNo || existingInvoice?.InvoiceNo || 'AUTO'} readOnly />
            <Input label="Invoice Date *" type="date" value={form.invoiceDate} onChange={(e) => u('invoiceDate', e.target.value)} error={fieldErrors.invoiceDate} disabled={invoiceLocked} />
            <Input label="Branch *" value={form.branchName} onChange={(e) => u('branchName', e.target.value)} error={fieldErrors.branchName} disabled={invoiceLocked} />
            <Select label="Invoice Type *" options={SUPPORTED_BILL_TYPES} value={form.invoiceType} onChange={(e) => u('invoiceType', e.target.value)} disabled={invoiceLocked} />
            <Input label="Invoice Series" value={form.invoiceSeries} placeholder="PUN-FRT" onChange={(e) => u('invoiceSeries', e.target.value)} disabled={invoiceLocked} />
            <Input label="Financial Year" value={financialYear(form.invoiceDate)} readOnly />
            <Select label="Payment Terms *" options={PAYMENT_TERMS} value={form.paymentTerms} onChange={(e) => u('paymentTerms', e.target.value)} disabled={invoiceLocked} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => u('dueDate', e.target.value)} error={fieldErrors.dueDate} disabled={invoiceLocked} />
            <Input label="Currency" value={form.currency} readOnly />
            <Input label="Place of Supply *" value={form.placeOfSupply} onChange={(e) => u('placeOfSupply', e.target.value)} error={fieldErrors.placeOfSupply} disabled={invoiceLocked} />
          </div>
        </BillingSectionCard>

        <BillingSectionCard
          title="Customer / billing party"
          subtitle="Who will be billed for this invoice"
          icon={Building2}
          id="billing-section-customer"
          className="mb-1"
        >
          <div className="billing-v2-customer-row">
            <PartyMasterSelect
              label={false}
              api={customersApi}
              valueId={customerId}
              displayValue={form.billTo}
              placeholder="Search customer by Name / GSTIN / Mobile…"
              disabled={invoiceLocked}
              onSelect={(row) => {
                setCustomerId(row.id)
                loadCustomer(row.id)
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" type="button" disabled={invoiceLocked} onClick={() => { setCustomerId(''); setCustomer(null); setCredit(null) }}>
                Change Customer
              </Button>
              <Link to="/customers/new">
                <Button size="sm" variant="outline" type="button">+ New Customer</Button>
              </Link>
            </div>
          </div>
          {fieldErrors.billTo ? <p className="mt-1 text-xs text-red-600">{fieldErrors.billTo}</p> : null}
          {customer ? (
            <div className="billing-v2-party-details mt-3">
              <p className="font-semibold">{customer.name}</p>
              <p>{customer.address}</p>
              <div className="billing-v2-party-meta">
                {customer.gst ? <span>GSTIN: {customer.gst}</span> : null}
                {form.billToStateCode ? <span>State Code: {form.billToStateCode}</span> : null}
                {customer.phone ? <span>Mobile: {customer.phone}</span> : null}
                {customer.email ? <span>Email: {customer.email}</span> : null}
              </div>
            </div>
          ) : null}
        </BillingSectionCard>

        <BillingSectionCard
          title="Bill to / service details"
          subtitle="Billing address and place of supply"
          icon={MapPin}
          className="mb-1"
        >
          <div className="billing-v2-grid billing-v2-grid--3">
            <Input label="Bill To" value={form.billTo} onChange={(e) => u('billTo', e.target.value)} error={fieldErrors.billTo} disabled={invoiceLocked} />
            <Input label="Service / Ship To" value={form.serviceLocation} onChange={(e) => u('serviceLocation', e.target.value)} disabled={invoiceLocked} />
            <Input label="Address" value={form.billToAddress} onChange={(e) => u('billToAddress', e.target.value)} disabled={invoiceLocked} />
            <Input label="Place of Supply" value={form.placeOfSupply} onChange={(e) => u('placeOfSupply', e.target.value)} disabled={invoiceLocked} />
            <Input label="State" value={form.billToState} onChange={(e) => u('billToState', e.target.value)} disabled={invoiceLocked} />
            <Input label="State Code" value={form.billToStateCode} onChange={(e) => u('billToStateCode', e.target.value)} disabled={invoiceLocked} />
            <Input label="GSTIN" value={form.billToGstin} onChange={(e) => u('billToGstin', e.target.value)} error={fieldErrors.billToGstin} disabled={invoiceLocked} />
          </div>
        </BillingSectionCard>

        <BillingSourceSection
          queueRows={queueRows.filter((r) => !sourceSearch || JSON.stringify(r).toLowerCase().includes(sourceSearch.toLowerCase()))}
          loading={queueLoading}
          selected={selectedLrs}
          onToggle={toggleLr}
          onToggleAll={() => {
            const unbilled = queueRows.filter((r) => String(r.billingStatus).toLowerCase() !== 'billed')
            if (selectedLrs.size === unbilled.length) setSelectedLrs(new Set())
            else setSelectedLrs(new Set(unbilled.map((r) => r.lrNumber)))
          }}
          onOpenFilter={() => setFilterOpen(true)}
          search={sourceSearch}
          onSearchChange={setSourceSearch}
          filterCount={filterCount}
        />
        {fieldErrors.source ? <p className="-mt-2 mb-2 text-xs text-red-600">{fieldErrors.source}</p> : null}

        {rateInfo ? (
          <BillingSectionCard title="Rate / contract" subtitle="Matched route rate from Rate Master" icon={Percent} className="mb-1">
            <div className="billing-v2-rate-banner">
              Route rate: {formatCurrency(rateInfo.rate ?? rateInfo.amount ?? rateInfo.rateAmount ?? 0)}
              {' · '}{rateInfo.rateType || rateInfo.rateUnit || 'Per Trip'}
              {rateInfo.validFrom ? ` · From ${rateInfo.validFrom}` : ''}
            </div>
          </BillingSectionCard>
        ) : selectedLrRows.length ? (
          <div className="billing-v2-rate-warn">Rate not found for selected route — verify freight manually or check Rate Master.</div>
        ) : null}

        <BillingLineItemsSection
          rows={rows}
          onChange={setLineItems}
          onAddLine={addLine}
          gridRef={gridRef}
          billType={form.invoiceType}
          isInterstate={isInterstate}
        />

        <div className="billing-v2-charges-tax mb-1">
          <BillingSectionCard title="Charges & adjustments" subtitle="Extra charges, discount and advance" icon={Package}>
            <div className="billing-v2-grid billing-v2-grid--3">
              <Input label="Freight Charges" readOnly value={formatCurrency(summary.freight)} />
              <Input label="Loading Charges" readOnly value={formatCurrency(loadingTotal(selectedLrRows))} />
              <Input label="Unloading Charges" readOnly value={formatCurrency(unloadingTotal(selectedLrRows))} />
              <Input label="Detention Charges" type="number" value={form.detentionCharges || ''} onChange={(e) => u('detentionCharges', e.target.value || 0)} disabled={invoiceLocked} />
              <Input label="Other Charges" type="number" value={form.otherCharges || ''} onChange={(e) => u('otherCharges', e.target.value || 0)} disabled={invoiceLocked} />
              <Input label="Discount" type="number" value={form.discount || ''} onChange={(e) => u('discount', e.target.value || 0)} disabled={invoiceLocked} />
              <Input label="Adjustment" type="number" value={form.adjustment || ''} onChange={(e) => u('adjustment', e.target.value || 0)} disabled={invoiceLocked} />
              {totalAdvance > 0 ? (
                <Input label="Advance (from LR/booking)" readOnly value={formatCurrency(totalAdvance)} />
              ) : null}
            </div>
            <div className="billing-v2-readout-row mt-3">
              <span>Total Taxable</span><strong>{formatCurrency(summary.sub)}</strong>
              <span>Adjusted Taxable</span><strong>{formatCurrency(summary.adjusted)}</strong>
            </div>
          </BillingSectionCard>

          <BillingSectionCard title="GST / tax summary" subtitle="Tax breakup and payable amount" icon={Percent}>
            <div className="billing-v2-tax-summary">
              <div className="billing-v2-readout"><span>Taxable Amount</span><strong>{formatCurrency(summary.adjusted)}</strong></div>
              {summary.isRcm ? (
                <div className="billing-v2-readout"><span>GST @ {summary.gstRate}% (RCM — payable by recipient)</span><strong>{formatCurrency(summary.gst)}</strong></div>
              ) : summary.isInterstate ? (
                <div className="billing-v2-readout"><span>IGST @ {summary.gstRate}%</span><strong>{formatCurrency(summary.igst)}</strong></div>
              ) : (
                <>
                  <div className="billing-v2-readout"><span>CGST @ {gstHalf}%</span><strong>{formatCurrency(summary.cgst)}</strong></div>
                  <div className="billing-v2-readout"><span>SGST @ {gstHalf}%</span><strong>{formatCurrency(summary.sgst)}</strong></div>
                </>
              )}
              <div className="billing-v2-readout"><span>Round Off</span><strong>{formatCurrency(summary.roundOff)}</strong></div>
              {summary.advance > 0 ? (
                <div className="billing-v2-readout"><span>Less: Advance</span><strong className="text-green-700">- {formatCurrency(summary.advance)}</strong></div>
              ) : null}
              <div className="billing-v2-readout billing-v2-readout--grand"><span>GRAND TOTAL</span><strong>{formatCurrency(summary.grand)}</strong></div>
              <p className="billing-v2-words">{summary.amountInWords}</p>
              <p className="billing-v2-tax-note">Final amounts are calculated by the server from LR/booking data on save.</p>
            </div>
          </BillingSectionCard>
        </div>

        <BillingSectionCard
          title="Payment & bank details"
          subtitle="How this invoice will be settled"
          icon={Landmark}
          className="mb-1"
          collapsible
          defaultOpen
        >
          <div className="billing-v2-grid billing-v2-grid--3">
            <Select label="Payment Mode" options={PAYMENT_MODES} value={form.paymentMode} onChange={(e) => u('paymentMode', e.target.value)} disabled={invoiceLocked} />
            <Input label="Bank Account" value={form.bankAccount} onChange={(e) => u('bankAccount', e.target.value)} placeholder="Enter or select from company master" disabled={invoiceLocked} />
            <Input label="Account Name" value={form.accountName} onChange={(e) => u('accountName', e.target.value)} disabled={invoiceLocked} />
            <Input label="IFSC Code" value={form.ifsc} onChange={(e) => u('ifsc', e.target.value)} disabled={invoiceLocked} />
            <Input label="Bank Branch" value={form.bankBranch} onChange={(e) => u('bankBranch', e.target.value)} disabled={invoiceLocked} />
          </div>
        </BillingSectionCard>

        <BillingSectionCard
          title="GST / e-invoice / e-way"
          subtitle="Compliance fields (integrations optional)"
          icon={ShieldCheck}
          className="mb-1"
          collapsible
          defaultOpen={false}
        >
          <div className="billing-v2-grid billing-v2-grid--3">
            <Input label="GSTIN" value={form.billToGstin} readOnly />
            <Input label="Place of Supply" value={form.placeOfSupply} readOnly />
            <Input label="Supply Type" value={isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'} readOnly />
            <Input label="E-Invoice Status" value={form.eInvoiceStatus} readOnly />
            <Input label="E-Way Bill No." value={form.ewayBillNo} onChange={(e) => u('ewayBillNo', e.target.value)} disabled={invoiceLocked} />
            <Input label="E-Way Bill Status" value={form.ewayStatus} readOnly />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" type="button" disabled title="Integration not configured">Generate E-Invoice</Button>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => {
                const lr = primaryLrNumber || ''
                navigate(lr
                  ? `/operations/eway-bill?tab=register&lr=${encodeURIComponent(lr)}`
                  : '/operations/eway-bill')
              }}
            >
              Open E-Way Module
            </Button>
          </div>
        </BillingSectionCard>

        <BillingSectionCard
          title="Documents"
          subtitle="Supporting files for this invoice"
          icon={Paperclip}
          className="mb-1"
          collapsible
          defaultOpen={attachments.length > 0}
        >
          <label className={`billing-v2-attach-btn ${invoiceLocked ? 'pointer-events-none opacity-50' : ''}`}>
            + Attach Document
            <input type="file" multiple className="hidden" disabled={invoiceLocked} onChange={(e) => setAttachments((a) => [...a, ...Array.from(e.target.files || [])])} />
          </label>
          {attachments.length > 0 && (
            <ul className="billing-v2-doc-list">
              {attachments.map((f, i) => (
                <li key={`${f.name}-${i}`} className="billing-v2-doc-item">
                  <span>{f.name} ({Math.round(f.size / 1024)} KB)</span>
                  <button type="button" className="text-red-500" onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </BillingSectionCard>

        <BillingSectionCard
          title="Invoice notes"
          subtitle="Remarks and terms printed on the invoice"
          icon={ClipboardList}
          className="mb-1"
          collapsible
          defaultOpen={Boolean(form.remarks || form.terms)}
        >
          <Textarea label={`Remarks (${(form.remarks || '').length}/500)`} rows={3} maxLength={500} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} disabled={invoiceLocked} />
          <Textarea label="Terms & Conditions" rows={3} value={form.terms} onChange={(e) => u('terms', e.target.value)} placeholder="Company invoice terms" className="mt-3" disabled={invoiceLocked} />
        </BillingSectionCard>

        <BillingSectionCard
          title="Approval & audit"
          subtitle="Created by and current status"
          icon={ShieldCheck}
          collapsible
          defaultOpen={false}
        >
          <div className="billing-v2-grid billing-v2-grid--3 text-sm">
            <div><p className="text-xs text-slate-500">Created By</p><p>{user?.name || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Created Date</p><p>{form.invoiceDate}</p></div>
            <div><p className="text-xs text-slate-500">Status</p><p className="font-semibold text-primary">{statusLabel}</p></div>
          </div>
        </BillingSectionCard>
      </div>

      <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Billing Source" width="md">
        <div className="grid gap-3">
          <Input label="Date From" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
          <Input label="Date To" type="date" value={draftFilters.dateTo} onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))} />
          <Input label="Branch" value={draftFilters.branch} onChange={(e) => setDraftFilters((f) => ({ ...f, branch: e.target.value }))} />
          <Input label="Customer" value={draftFilters.customer} onChange={(e) => setDraftFilters((f) => ({ ...f, customer: e.target.value }))} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => { loadQueue(); setFilterOpen(false) }}>Apply</Button>
          <Button variant="outline" onClick={() => setDraftFilters({ dateFrom: '', dateTo: '', branch: '', customer: '' })}>Reset</Button>
        </div>
      </SlideDrawer>

      <footer className="lr-entry-v2-footer billing-v2-footer shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 sm:px-3 dark:border-slate-700 dark:bg-slate-900">
        <BillingInvoiceActionBar
          saving={saving}
          grandTotal={summary.grand}
          amountInWords={summary.amountInWords}
          onPreview={handlePreview}
          onSaveDraft={handleSaveDraft}
          onSavePrint={() => handleSave(true)}
          onSave={() => handleSave(false)}
          onEmail={() => toast({ title: 'Email', message: 'Email integration coming soon.', type: 'info' })}
          onWhatsApp={() => toast({ title: 'WhatsApp', message: 'WhatsApp integration coming soon.', type: 'info' })}
          onCancel={() => (onBack ? onBack() : navigate('/operations/billing/list'))}
          saveDisabled={invoiceLocked}
        />
      </footer>
    </div>
  )
}
