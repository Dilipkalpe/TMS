import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import Tabs from '../../components/ui/Tabs'
import Badge from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { platformApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useCompany } from '../../context/CompanyContext'
import { useToast } from '../../context/ToastContext'
import { Building2, Shield } from 'lucide-react'

const emptyCompanyForm = {
  code: '',
  name: '',
  legalName: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  planCode: 'starter',
  adminUsername: '',
  adminPassword: '',
  adminName: '',
}

export default function PlatformHub() {
  const { user } = useAuth()
  const { setSelectedCompanyId } = useCompany()
  const location = useLocation()
  const { toast } = useToast()
  const [companies, setCompanies] = useState([])
  const [plans, setPlans] = useState([])
  const [billing, setBilling] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyCompanyForm)
  const [saving, setSaving] = useState(false)
  const [planEdits, setPlanEdits] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [companyRows, planRows, billingRows] = await Promise.all([
        platformApi.companies(),
        platformApi.plans(),
        platformApi.billing(),
      ])
      setCompanies(companyRows ?? [])
      setPlans(planRows ?? [])
      setBilling(billingRows ?? [])
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.isPlatformAdmin) load()
  }, [user?.isPlatformAdmin])

  if (!user?.isPlatformAdmin) {
    return <Navigate to="/" replace />
  }

  const createCompany = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: 'Validation', message: 'Company code and name are required.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      await platformApi.createCompany(form)
      toast({ title: 'Company created', message: `${form.name} is ready.`, type: 'success' })
      setForm(emptyCompanyForm)
      await load()
    } catch (err) {
      toast({ title: 'Create failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const changePlan = async (companyId) => {
    const planCode = planEdits[companyId]
    if (!planCode) return
    try {
      await platformApi.changePlan(companyId, { planCode })
      toast({ title: 'Plan updated', type: 'success' })
      await load()
    } catch (err) {
      toast({ title: 'Update failed', message: err.message, type: 'error' })
    }
  }

  const enterTenant = (companyId) => {
    setSelectedCompanyId(companyId)
    window.location.href = '/'
  }

  const selectCompanyHint = location.state?.reason === 'select-company'

  const planOptions = plans.map((p) => ({
    value: p.code,
    label: `${p.name} — ${formatCurrency(p.priceInr)}/mo`,
  }))

  const tabs = [
    {
      id: 'companies',
      label: 'Companies',
      content: (
        <Card className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Company</th>
                  <th className="px-4 py-2 text-left">City</th>
                  <th className="px-4 py-2 text-left">Plan</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Change plan</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2 font-medium">{c.code}</td>
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2">{c.city ?? '—'}</td>
                    <td className="px-4 py-2">{c.plan ?? '—'}</td>
                    <td className="px-4 py-2">
                      <Badge variant={c.isActive ? 'success' : 'default'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex min-w-[220px] items-center gap-2">
                        <Select
                          selectClassName="py-1.5 text-xs"
                          value={planEdits[c.id] ?? plans.find((p) => p.name === c.plan)?.code ?? 'starter'}
                          onChange={(e) => setPlanEdits((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          options={planOptions.length ? planOptions : [{ value: 'starter', label: 'Starter' }]}
                        />
                        <Button variant="secondary" className="shrink-0 px-2 py-1 text-xs" onClick={() => changePlan(c.id)}>
                          Save
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button className="px-2 py-1 text-xs" onClick={() => enterTenant(c.id)}>
                        Open tenant
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ),
    },
    {
      id: 'billing',
      label: 'Billing',
      content: (
        <Card className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left">Company</th>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Plan</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Started</th>
                </tr>
              </thead>
              <tbody>
                {billing.map((row, i) => (
                  <tr key={`${row.companyCode}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2">{row.company}</td>
                    <td className="px-4 py-2 font-medium">{row.companyCode}</td>
                    <td className="px-4 py-2">{row.plan}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(row.amountInr)}</td>
                    <td className="px-4 py-2">{row.startedAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ),
    },
    {
      id: 'create',
      label: 'New company',
      content: (
        <Card className="max-w-2xl space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Building2 className="h-4 w-4 text-primary" />
            Onboard tenant
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Company code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="ACME" />
            <Input label="Company name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Legal name" value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />
            <Select
              label="Subscription plan"
              value={form.planCode}
              onChange={(e) => setForm((f) => ({ ...f, planCode: e.target.value }))}
              options={planOptions.length ? planOptions : [{ value: 'starter', label: 'Starter' }]}
            />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            <Input label="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            <Input label="Admin username" value={form.adminUsername} onChange={(e) => setForm((f) => ({ ...f, adminUsername: e.target.value }))} />
            <Input label="Admin password" type="password" value={form.adminPassword} onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))} />
            <Input label="Admin full name" value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} className="sm:col-span-2" />
          </div>
          <Button onClick={createCompany} disabled={saving}>
            {saving ? 'Creating…' : 'Create company'}
          </Button>
        </Card>
      ),
    },
  ]

  return (
    <ERPContentPage module="Platform" title="Platform Admin">
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-600 dark:text-slate-300">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          Manage SaaS tenants, subscription plans, and billing. Select <strong>Open tenant</strong> on a company to view only that company&apos;s menus and data.
        </p>
      </div>
      {selectCompanyHint && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Choose a company below and click <strong>Open tenant</strong> to access operational modules.
        </div>
      )}
      <Tabs tabs={tabs} defaultTab="companies" />
    </ERPContentPage>
  )
}
