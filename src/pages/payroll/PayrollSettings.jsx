import { useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useApiResource } from '../../hooks/useApiResource'
import { payrollApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Loader2, Save, Settings2 } from 'lucide-react'

const LABELS = {
  pf_rate: 'PF Rate (%)',
  esi_rate: 'ESI Rate (%)',
  esi_wage_ceiling: 'ESI Wage Ceiling (₹)',
  insurance_permanent: 'Insurance — Permanent (₹/month)',
  insurance_contract: 'Insurance — Contract (₹/month)',
  insurance_daily_per_day: 'Insurance — Daily (₹/day worked)',
  contract_pf_applicable: 'PF for Contract (0=No, 1=Yes)',
  daily_pf_applicable: 'PF for Daily (0=No, 1=Yes)',
  trip_bonus_per_trip: 'Trip Bonus per Trip (₹)',
  trip_bonus_max: 'Max Trip Bonus (₹)',
  overtime_rate_per_hour: 'Overtime Rate per Hour (₹)',
  professional_tax: 'Professional Tax (₹)',
  working_days_per_month: 'Working Days per Month',
  route_allowance_default: 'Route Allowance Default (₹/month)',
  fuel_allowance_per_trip: 'Fuel Allowance per Trip (₹)',
  loading_unloading_allowance: 'Loading/Unloading Allowance (₹/month)',
  halting_allowance_per_trip: 'Halting Allowance per Trip (₹)',
  driver_bhatta_per_day: 'Driver Bhatta per Day (₹)',
  tms_safety_bonus: 'TMS Safety Bonus (₹/month)',
  license_expiry_alert_days: 'License Expiry Alert (days)',
}

export default function PayrollSettings() {
  const { toast } = useToast()
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const { data: settings, loading, error, refresh } = useApiResource(async () => {
    const s = await payrollApi.settings()
    const map = Object.fromEntries(s.map((x) => [x.key, x.value]))
    setValues(map)
    return s
  }, [])

  const handleSave = async (key) => {
    setSaving(true)
    try {
      await payrollApi.updateSetting(key, values[key])
      toast({ title: 'Saved', message: `${LABELS[key] ?? key} updated.`, type: 'success' })
      refresh()
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="Payroll" title="Payroll Settings">
      <Card>
        <CardHeader title="Pay Calculation Rules" subtitle="Used when generating monthly payroll" />
        {loading ? (
          <p className="p-4 text-slate-500">Loading…</p>
        ) : error ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        ) : (
          <div className="divide-y">
            {(settings ?? []).map((s) => (
              <div key={s.key} className="flex flex-wrap items-end gap-4 p-4">
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{LABELS[s.key] ?? s.key}</p>
                  {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                </div>
                <Input
                  type="number"
                  value={values[s.key] ?? s.value}
                  onChange={(e) => setValues((p) => ({ ...p, [s.key]: e.target.value }))}
                  className="w-36"
                />
                <Button size="sm" icon={saving ? Loader2 : Save} disabled={saving} onClick={() => handleSave(s.key)}>
                  Save
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </ERPContentPage>
  )
}
