import { Loader2, Printer, RotateCcw, Eye, Save, X } from 'lucide-react'
import Button from '../ui/Button'

/**
 * Standard entry-page action order (all entry screens):
 * [workflow prepend] → Save → Cancel → Print → Clear → Preview → [append]
 */
export default function LrEntryActionButtons({
  saving = false,
  saveDisabled = false,
  onClear,
  onCancel,
  onPreview,
  onSave,
  onSavePrint,
  variant = 'footer',
  financialSummary = null,
  prependActions = null,
  appendActions = null,
  printLabel = 'Print',
  saveLabel = 'Save',
  size,
}) {
  const btnSize = size || (variant === 'header' ? 'sm' : undefined)
  const savingLabel = saving ? 'Saving…' : saveLabel
  const disableSave = saving || saveDisabled

  const actions = (
    <>
      {prependActions}
      {onSave ? (
        <Button
          size={btnSize}
          icon={saving ? Loader2 : Save}
          type="button"
          onClick={onSave}
          disabled={disableSave}
          className={variant === 'header' ? 'bg-green-600 hover:bg-green-700' : undefined}
        >
          {savingLabel}
        </Button>
      ) : null}
      {onCancel ? (
        <Button size={btnSize} variant="outline" icon={X} type="button" onClick={onCancel} className="text-red-600">
          Cancel
        </Button>
      ) : null}
      {onSavePrint ? (
        <Button size={btnSize} variant="outline" icon={Printer} type="button" onClick={onSavePrint} disabled={disableSave}>
          {printLabel}
        </Button>
      ) : null}
      {onClear ? (
        <Button size={btnSize} variant="outline" icon={RotateCcw} type="button" onClick={onClear}>
          Clear
        </Button>
      ) : null}
      {onPreview ? (
        <Button
          size={btnSize}
          variant="outline"
          icon={Eye}
          type="button"
          onClick={onPreview}
          data-kbd-grid-before-focus="true"
          data-kbd-focus="true"
        >
          Preview
        </Button>
      ) : null}
      {appendActions}
    </>
  )

  if (variant === 'header') {
    return actions
  }

  return (
    <div className="lr-entry-v2-footer-bar">
      <div className="lr-entry-v2-actions">{actions}</div>
      {financialSummary}
    </div>
  )
}
