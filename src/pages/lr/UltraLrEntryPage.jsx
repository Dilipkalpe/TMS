import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import LrEntryFormLayout, { buildLrApiPayload, emptyLrEntryForm } from '../../components/lr/LrEntryFormLayout'
import LrEntryActionButtons from '../../components/lr/LrEntryActionButtons'
import { lrApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import { printModuleDocument } from '../../services/printService'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { lrProcessPath } from '../../utils/docPath'
import { useKeyboardPageActions, useAutoFocus } from '../../hooks/useKeyboardPageActions'

/** Bulk / fast LR entry — save resets form for the next LR without leaving the page. */
export default function UltraLrEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [form, setForm] = useState({ ...emptyLrEntryForm(), businessType: 'FTL' })
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      const total = Number(next.freight || 0) + Number(next.gst || 0) + Number(next.hamali || 0)
        + Number(next.loadingCharges || 0) + Number(next.unloadingCharges || 0) + Number(next.insurance || 0)
        + Number(next.otherCharges || 0)
      next.balance = total - Number(next.advance || 0)
      return next
    })
  }

  const handleSave = useCallback(async (andPrint = false, openProcess = false) => {
    if (!form.consignor?.trim() && !form.consignorId) {
      toast({ title: 'Validation', message: 'Consignor is required.', type: 'warning' })
      return
    }
    if (!form.consignee?.trim() && !form.consigneeId) {
      toast({ title: 'Validation', message: 'Consignee is required.', type: 'warning' })
      return
    }
    if (!form.from?.trim() || !form.to?.trim()) {
      toast({ title: 'Validation', message: 'From and To are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const created = await lrApi.create(buildLrApiPayload(form))
      setLastSaved(created.lrNumber)
      toast({
        title: 'LR saved',
        message: `${created.lrNumber} saved — form cleared for next LR.`,
        type: 'success',
      })
      if (andPrint) {
        const lr = await lrApi.get(created.lrNumber)
        await printModuleDocument({
          moduleCode: PRINT_MODULE_CODES.LR_LIST,
          company,
          print,
          documentData: { lr },
        })
      }
      setForm({ ...emptyLrEntryForm(), businessType: form.businessType || 'FTL' })
      if (openProcess) {
        navigate(lrProcessPath(created.lrNumber))
      }
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [form, company, navigate, print, toast])

  const handleClear = useCallback(() => setForm(emptyLrEntryForm()), [])
  const handleCancel = useCallback(() => navigate('/lr/list'), [navigate])

  const headerToolbar = useMemo(() => (
    <LrEntryActionButtons
      variant="header"
      saving={saving}
      onClear={handleClear}
      onSave={() => handleSave(false)}
      onSavePrint={() => handleSave(true)}
      onCancel={handleCancel}
    />
  ), [saving, handleClear, handleSave, handleCancel])

  const formRef = useRef(null)
  useAutoFocus(formRef)
  useKeyboardPageActions({
    onSave: () => handleSave(false),
    onPrint: () => handleSave(true),
    onCancel: () => navigate('/lr/list'),
    onNew: () => setForm(emptyLrEntryForm()),
  }, [form, saving, handleSave, navigate])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="LR"
        title="Bulk LR Entry"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'LR', path: '/lr/list' },
          { label: 'Bulk LR Entry' },
        ]}
        toolbar={headerToolbar}
      />
      <div ref={formRef} data-kbd-form-root className="flex min-h-0 flex-1 flex-col overflow-hidden p-1 sm:p-2">
        {lastSaved && (
          <p className="mb-1 shrink-0 rounded border border-green-200 bg-green-50 px-2 py-1 text-[10px] text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
            Last saved: <strong>{lastSaved}</strong> · Save again to create another LR, or open it from LR List.
          </p>
        )}
        <LrEntryFormLayout
          ultra
          form={form}
          setForm={setForm}
          update={update}
        />
      </div>
    </div>
  )
}
