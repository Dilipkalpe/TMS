import { Mail, MessageCircle } from 'lucide-react'
import Button from '../ui/Button'
import { formatCurrency } from '../ui/ReportFilters'
import LrEntryActionButtons from '../lr/LrEntryActionButtons'

export default function BillingInvoiceActionBar({
  saving = false,
  saveDisabled = false,
  grandTotal = null,
  amountInWords = '',
  onPreview,
  onSaveDraft,
  onSavePrint,
  onSave,
  onEmail,
  onWhatsApp,
  onCancel,
}) {
  const disabled = saving || saveDisabled
  const appendActions = (
    <>
      {onSaveDraft ? (
        <Button variant="outline" type="button" onClick={onSaveDraft} disabled={disabled}>
          Draft
        </Button>
      ) : null}
      {onEmail ? (
        <Button variant="outline" icon={Mail} type="button" onClick={onEmail}>
          Email
        </Button>
      ) : null}
      {onWhatsApp ? (
        <Button variant="outline" icon={MessageCircle} type="button" onClick={onWhatsApp}>
          WhatsApp
        </Button>
      ) : null}
    </>
  )

  return (
    <LrEntryActionButtons
      saving={saving}
      saveDisabled={saveDisabled}
      onSave={onSave}
      onCancel={onCancel}
      onSavePrint={onSavePrint}
      onPreview={onPreview}
      printLabel="Save & Print"
      appendActions={appendActions}
      financialSummary={
        grandTotal != null ? (
          <div className="hidden min-w-[12rem] text-right sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Grand total</p>
            <p className="text-lg font-bold tabular-nums text-emerald-600">{formatCurrency(grandTotal)}</p>
            {amountInWords ? (
              <p className="max-w-[16rem] truncate text-[10px] italic text-slate-500" title={amountInWords}>
                {amountInWords}
              </p>
            ) : null}
          </div>
        ) : null
      }
    />
  )
}
