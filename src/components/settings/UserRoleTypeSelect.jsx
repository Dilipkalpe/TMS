import { useCallback, useEffect, useMemo, useState } from 'react'
import Input, { Select } from '../ui/Input'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { userRoleTypesApi } from '../../services/api'
import { USER_ROLE_TYPES, validateNewRoleTypeName } from '../../config/userRoleTypes'
import { useToast } from '../../context/ToastContext'

export const ADD_ROLE_TYPE_VALUE = '__add_new_role_type__'

function normalizeList(res) {
  const raw = res?.roleTypes || res?.items || res || []
  if (!Array.isArray(raw)) return USER_ROLE_TYPES.map((r) => ({ code: r.code, label: r.label, description: r.description }))
  return raw.map((r) => ({
    code: r.code || r.name || r.label,
    label: r.label || r.name || r.code,
    description: r.description || '',
    isSystem: Boolean(r.isSystem),
  })).filter((r) => r.code)
}

export function AddUserRoleTypeModal({
  open,
  onClose,
  onCreated,
  existingNames = [],
}) {
  const { toast } = useToast()
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setNewName('')
    setNewDescription('')
    setError('')
  }, [open])

  const handleCreate = async () => {
    const check = validateNewRoleTypeName(newName, existingNames)
    if (!check.ok) {
      setError(check.error)
      return
    }
    const name = check.name

    setSaving(true)
    setError('')
    try {
      const created = await userRoleTypesApi.create({
        name,
        description: newDescription.trim() || null,
      })
      const code = created?.code || created?.name || name
      onCreated?.(code, created)
      onClose?.()
      toast({ title: 'User Role Type added', message: `“${code}” is ready to use.`, type: 'success' })
    } catch (err) {
      setError(err.message || 'Failed to create User Role Type.')
      toast({ title: 'Create failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Add New Role Type"
      size="sm"
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleCreate}>
            {saving ? 'Saving…' : 'Save Role Type'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-3 p-1">
        <Input
          label="User Role Type"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Dispatcher"
          error={error || undefined}
          autoFocus
        />
        <Input
          label="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Short description"
        />
      </div>
    </Modal>
  )
}

/**
 * User Role Type dropdown with “+ Add New Role Type” (shared by Users + Role menus).
 */
export default function UserRoleTypeSelect({
  label = 'User Role Type',
  value,
  onChange,
  className = '',
  disabled = false,
  includeAddNew = true,
  onRoleTypesLoaded,
}) {
  const { toast } = useToast()
  const [roleTypes, setRoleTypes] = useState(USER_ROLE_TYPES)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await userRoleTypesApi.list({ activeOnly: true })
    const list = normalizeList(res)
    setRoleTypes(list.length ? list : USER_ROLE_TYPES)
    onRoleTypesLoaded?.(list.length ? list : USER_ROLE_TYPES)
    return list
  }, [onRoleTypesLoaded])

  useEffect(() => {
    load()
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [load, toast])

  const options = useMemo(() => {
    const opts = roleTypes.map((r) => ({ value: r.code, label: r.label }))
    if (includeAddNew) {
      opts.push({ value: ADD_ROLE_TYPE_VALUE, label: '+ Add New Role Type' })
    }
    return opts
  }, [roleTypes, includeAddNew])

  const handleSelect = (e) => {
    const next = e.target.value
    if (next === ADD_ROLE_TYPE_VALUE) {
      setModalOpen(true)
      return
    }
    onChange?.(next)
  }

  return (
    <>
      <Select
        label={label}
        value={value}
        onChange={handleSelect}
        options={options}
        className={className}
        disabled={disabled || loading}
      />
      <AddUserRoleTypeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        existingNames={roleTypes.map((r) => r.code)}
        onCreated={async (code) => {
          await load()
          onChange?.(code)
        }}
      />
    </>
  )
}
