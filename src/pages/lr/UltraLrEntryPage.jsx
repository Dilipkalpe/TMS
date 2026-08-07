import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import LrEntryFormLayout, { buildLrApiPayload, emptyLrEntryForm } from '../../components/lr/LrEntryFormLayout'
import { lrApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import LRPrintFormat from '../../components/print/LRPrintFormat'
import { lrProcessPath } from '../../utils/docPath'
import { useKeyboardPageActions, useAutoFocus } from '../../hooks/useKeyboardPageActions'

/** Fast keyboard-first LR entry — minimal fields, same API. */
export default function UltraLrEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [form, setForm] = useState({ ...emptyLrEntryForm(), businessType: 'FTL' })
  const [saving, setSaving] = useState(false)

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      const total = Number(next.freight) + Number(next.gst)
      next.balance = total - Number(next.advance)
      return next
    })
  }

  const handleSave = async (andPrint = false) => {
    if (!form.consignor?.trim() || !form.consignee?.trim() || !form.from?.trim() || !form.to?.trim()) {
      toast({ title: 'Validation', message: 'Consignor, Consignee, From and To are required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const created = await lrApi.create(buildLrApiPayload(form))
      toast({ title: 'LR saved', message: `${created.lrNumber} — Ultra entry saved.`, type: 'success' })
      if (andPrint) {
        const lr = await lrApi.get(created.lrNumber)
        print(<LRPrintFormat lr={lr} company={company} />)
      }
      setForm(emptyLrEntryForm())
      navigate(lrProcessPath(created.lrNumber))
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const formRef = useRef(null)
  useAutoFocus(formRef)
  useKeyboardPageActions({
    onSave: () => handleSave(false),
    onPrint: () => handleSave(true),
    onCancel: () => navigate('/lr/list'),
  }, [form, saving])

  return (
    <ERPContentPage module="LR" title="Bulk LR Entry" fillViewport>
      <div ref={formRef} data-kbd-form-root className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <LrEntryFormLayout
        ultra
        form={form}
        setForm={setForm}
        update={update}
        saving={saving}
        onSave={() => handleSave(false)}
        onSavePrint={() => handleSave(true)}
        onClear={() => setForm(emptyLrEntryForm())}
        onCancel={() => navigate('/lr/list')}
      />
      </div>
    </ERPContentPage>
  )
}
