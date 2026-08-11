import { useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useToast } from '../../context/ToastContext'
import {
  buildMasterInitialForm,
  getLookupMasterConfig,
  validateMasterForm,
} from '../../config/lookupMasterConfig'
import { focusNextEditable } from '../../keyboard/keyUtils'

/**
 * Inline Add Master dialog opened from lookup "Record Not Found" flow.
 */
export default function LookupMasterAddModal({
  open,
  onClose,
  lookupKey,
  employeeType,
  searchText = '',
  returnFocusRef,
  onSaved,
}) {
  const formRootRef = useRef(null)
  const { toast } = useToast()
  const config = lookupKey ? getLookupMasterConfig(lookupKey, { employeeType }) : null

  const [form, setForm] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [duplicate, setDuplicate] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !config) return
    setForm(buildMasterInitialForm(config, searchText))
    setFieldErrors({})
    setFormError('')
    setDuplicate(null)
    setSaving(false)
  }, [open, config, searchText, lookupKey])

  if (!config) return null

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    setFormError('')
    setDuplicate(null)
  }

  const finish = (result, { advanceFocus = true } = {}) => {
    onSaved?.(result)
    onClose()
    if (advanceFocus && returnFocusRef?.current) {
      requestAnimationFrame(() => focusNextEditable(returnFocusRef.current))
    }
  }

  const handleSelectDuplicate = () => {
    if (!duplicate) return
    finish({
      id: config.toId(duplicate),
      label: config.toLabel(duplicate),
      record: duplicate,
      created: false,
      duplicate: true,
    })
    toast({
      title: 'Existing record selected',
      message: config.toLabel(duplicate),
      type: 'info',
    })
  }

  const handleSave = async () => {
    const errors = validateMasterForm(config, form)
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setFormError('Please complete the required fields.')
      return
    }

    setSaving(true)
    setFormError('')
    setDuplicate(null)

    try {
      const nameValue = form[config.nameField]?.trim()
      const existing = await config.findDuplicate(nameValue)
      if (existing) {
        setDuplicate(existing)
        setFormError(`"${nameValue}" already exists. Select the existing record or change the name.`)
        setSaving(false)
        return
      }

      const record = await config.create(form)
      const label = config.toLabel(record)
      finish({
        id: config.toId(record),
        label,
        record,
        created: true,
        duplicate: false,
      })
      toast({
        title: `${config.entityLabel} added`,
        message: label,
        type: 'success',
      })
    } catch (err) {
      setFormError(err.message || 'Could not save master record.')
    } finally {
      setSaving(false)
    }
  }

  const handleFormKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    const tag = e.target?.tagName
    if (tag === 'TEXTAREA') return
    if (e.target instanceof HTMLButtonElement) return
    e.preventDefault()
    handleSave()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={config.addTitle}
      size="md"
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          {duplicate ? (
            <Button size="sm" variant="outline" onClick={handleSelectDuplicate} disabled={saving}>
              Select Existing
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    >
      <div ref={formRootRef} data-kbd-form-root onKeyDown={handleFormKeyDown}>
        {formError ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            {formError}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={config.nameLabel}
            value={form[config.nameField] ?? ''}
            onChange={(e) => update(config.nameField, e.target.value)}
            error={fieldErrors[config.nameField]}
            autoFocus
            data-kbd-focus="true"
          />
          {config.fields.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              type={field.type ?? 'text'}
              value={form[field.key] ?? ''}
              onChange={(e) => update(field.key, e.target.value)}
              error={fieldErrors[field.key]}
              placeholder={field.placeholder}
              className={field.key === 'address' ? 'sm:col-span-2' : ''}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}
