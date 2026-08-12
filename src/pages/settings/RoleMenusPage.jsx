import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, RotateCcw, Save, ShieldPlus } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { AddUserRoleTypeModal } from '../../components/settings/UserRoleTypeSelect'
import { roleMenusApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { ADMIN_LOCKED_MENU_KEYS } from '../../config/menuCatalog'
import { USER_ROLE_TYPES } from '../../config/userRoleTypes'

export default function RoleMenusPage() {
  const { toast } = useToast()
  const [role, setRole] = useState('Operator')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [matrix, setMatrix] = useState({})
  const [roleTypes, setRoleTypes] = useState(USER_ROLE_TYPES)
  const [addOpen, setAddOpen] = useState(false)

  const applyRoleTypes = (list) => {
    if (!Array.isArray(list) || !list.length) return
    setRoleTypes(list.map((r) => ({
      code: r.code || r.name || r.label,
      label: r.label || r.name || r.code,
      description: r.description || '',
    })).filter((r) => r.code))
  }

  const load = useCallback(async () => {
    const res = await roleMenusApi.get()
    setMatrix(res?.matrix ?? {})
    if (Array.isArray(res?.roleTypes) && res.roleTypes.length) {
      applyRoleTypes(res.roleTypes)
    }
  }, [])

  useEffect(() => {
    load()
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [load, toast])

  const items = matrix[role] ?? []
  const activeType = roleTypes.find((r) => r.code === role) || { label: role, description: '' }

  const grouped = useMemo(() => {
    const map = new Map()
    for (const i of items) {
      const locked = Boolean(i.locked) || (role === 'Admin' && ADMIN_LOCKED_MENU_KEYS.includes(i.menuKey))
      const row = {
        key: i.menuKey,
        label: i.label,
        isVisible: Boolean(i.isVisible),
        locked,
        group: i.group,
      }
      if (!map.has(i.group)) map.set(i.group, [])
      map.get(i.group).push(row)
    }
    return [...map.entries()].map(([group, rows]) => ({ group, rows }))
  }, [items, role])

  const toggle = (menuKey, next) => {
    setMatrix((prev) => {
      const list = [...(prev[role] || [])]
      const idx = list.findIndex((i) => i.menuKey === menuKey)
      if (idx < 0) return prev
      if (list[idx].locked) return prev
      list[idx] = { ...list[idx], isVisible: next }

      if (next) {
        const parentByGroup = {
          'Shipment hub': '/shipment-management',
          'Delivery hub': '/delivery-management',
          'Operations hub': '/operations',
          'Accounts hub': '/accounting',
          'Reports hub': '/reports',
          'Masters hub': '/masters',
          'Expenses hub': '/expenses',
          'HR & Payroll hub': '/hr',
          'Settings hub': '/settings',
        }
        const parent = parentByGroup[list[idx].group]
        if (parent) {
          const pIdx = list.findIndex((i) => i.menuKey === parent)
          if (pIdx >= 0 && !list[pIdx].locked) {
            list[pIdx] = { ...list[pIdx], isVisible: true }
          }
        }
      }

      return { ...prev, [role]: list }
    })
  }

  const toggleGroup = (rows, next) => {
    setMatrix((prev) => {
      const list = [...(prev[role] || [])]
      for (const row of rows) {
        if (row.locked) continue
        const idx = list.findIndex((i) => i.menuKey === row.key)
        if (idx >= 0) list[idx] = { ...list[idx], isVisible: next }
      }
      return { ...prev, [role]: list }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await roleMenusApi.save({
        role,
        items: (matrix[role] || []).map((i) => ({
          menuKey: i.menuKey,
          isVisible: i.isVisible,
        })),
      })
      setMatrix(res?.matrix ?? matrix)
      toast({
        title: 'Saved',
        message: `Menu visibility updated for User Role Type “${role}”. Users must sign in again to refresh.`,
        type: 'success',
      })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      const res = await roleMenusApi.save({ role, resetToDefaults: true })
      setMatrix(res?.matrix ?? matrix)
      toast({ title: 'Reset', message: `${role} menus restored to defaults.`, type: 'success' })
    } catch (err) {
      toast({ title: 'Reset failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleProvisionAll = async () => {
    if (!window.confirm(
      'Provision default menus for all User Role Types?\n\nRoles that already have saved menus are left unchanged. Use Reset on a role tab to overwrite one role.',
    )) return
    setSaving(true)
    try {
      const res = await roleMenusApi.provision({ overwriteExisting: false })
      setMatrix(res?.matrix?.matrix ?? res?.matrix ?? matrix)
      if (Array.isArray(res?.roleTypes) && res.roleTypes.length) {
        applyRoleTypes(res.roleTypes)
      }
      const seeded = (res?.provisioned || []).filter((p) => p.status === 'seeded-defaults').length
      toast({
        title: 'User Role Types provisioned',
        message: seeded
          ? `Seeded defaults for ${seeded} role type(s). Existing custom matrices were kept.`
          : 'All User Role Types were already provisioned.',
        type: 'success',
      })
      await load()
    } catch (err) {
      toast({ title: 'Provision failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleRoleTypeCreated = async (code) => {
    await load()
    setRole(code)
  }

  if (loading) {
    return (
      <ERPContentPage module="Settings" title="User role types">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="Settings" title="User role types">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Provision and configure menus for each <strong>User Role Type</strong>.
        Assign a User Role Type when creating staff users. Subscription plan features still apply.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {roleTypes.map((r) => (
          <button
            key={r.code}
            type="button"
            onClick={() => setRole(r.code)}
            title={r.description}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              role === r.code
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/50 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add New Role Type
        </button>
      </div>

      {activeType.description ? (
        <p className="mb-4 text-xs text-slate-500">{activeType.description}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="outline" icon={RotateCcw} disabled={saving} onClick={handleReset}>
          Reset this role to defaults
        </Button>
        <Button variant="outline" icon={ShieldPlus} disabled={saving} onClick={handleProvisionAll}>
          Provision all User Role Types
        </Button>
      </div>

      <div className="space-y-4">
        {grouped.map(({ group, rows }) => {
          const editable = rows.filter((r) => !r.locked)
          const allOn = editable.length > 0 && editable.every((r) => r.isVisible)
          return (
            <Card key={group}>
              <CardHeader
                title={group}
                action={editable.length > 0 ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-primary hover:underline"
                    onClick={() => toggleGroup(rows, !allOn)}
                  >
                    {allOn ? 'Hide all' : 'Show all'}
                  </button>
                ) : null}
              />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                  <label
                    key={row.key}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                      row.locked
                        ? 'border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={Boolean(row.isVisible)}
                      disabled={row.locked}
                      onChange={(e) => toggle(row.key, e.target.checked)}
                    />
                    <span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{row.label}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">{row.key}</span>
                      {row.locked ? (
                        <span className="mt-0.5 block text-[11px] text-amber-600">Required for Admin</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <AddUserRoleTypeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingNames={roleTypes.map((r) => r.code)}
        onCreated={handleRoleTypeCreated}
      />
    </ERPContentPage>
  )
}
