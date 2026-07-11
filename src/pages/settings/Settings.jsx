import { useEffect, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Tabs from '../../components/ui/Tabs'
import { useTheme } from '../../context/ThemeContext'
import { usePrint } from '../../context/PrintContext'
import { settingsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { getStoredPrintLogoUrl, resolveCompanyLogoUrl } from '../../utils/printLogo'
import { Save, Download, Shield, Building2, Loader2, Upload, X, ImageIcon, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { refreshCompany } = usePrint()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    settingsApi.get()
      .then((s) => setSettings({ ...s, printLogoUrl: s.logoUrl || getStoredPrintLogoUrl() }))
      .catch(() => setSettings({ printLogoUrl: getStoredPrintLogoUrl() }))
      .finally(() => setLoading(false))
  }, [])

  const update = (key, value) => setSettings((s) => ({ ...s, [key]: value }))

  const saveSettings = async (fields) => {
    setSaving(true)
    try {
      await settingsApi.update(fields)
      toast({ title: 'Saved', message: 'Settings updated successfully.', type: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <ERPContentPage module="Settings" title="Settings">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  const savePrintLogo = () => {
    try {
      const url = (settings.printLogoUrl ?? '').trim()
      if (url) localStorage.setItem('tms-print-logo-url', url)
      else localStorage.removeItem('tms-print-logo-url')
      refreshCompany()
      toast({ title: 'Logo saved', message: 'Print logo URL updated.', type: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const result = await settingsApi.uploadLogo(file)
      update('logoUrl', result.logoUrl)
      update('printLogoUrl', result.logoUrl)
      refreshCompany()
      toast({ title: 'Logo uploaded', message: 'Company logo saved for payslips, LR, and reports.', type: 'success' })
    } catch (err) {
      toast({ title: 'Upload failed', message: err.message, type: 'error' })
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const removeLogo = async () => {
    try {
      await settingsApi.deleteLogo()
      update('logoUrl', '')
      update('printLogoUrl', '')
      refreshCompany()
      toast({ title: 'Logo removed', type: 'success' })
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    }
  }

  const logoPreview = resolveCompanyLogoUrl(settings.logoUrl || settings.printLogoUrl)

  const tabs = [
    {
      id: 'company',
      label: 'Company Profile',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company Name" value={settings.companyName ?? ''} onChange={(e) => update('companyName', e.target.value)} />
          <Input label="GSTIN" value={settings.gstin ?? ''} onChange={(e) => update('gstin', e.target.value)} />
          <Input label="PAN" value={settings.pan ?? ''} onChange={(e) => update('pan', e.target.value)} />
          <Input label="Phone" value={settings.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
          <Input label="Email" value={settings.email ?? ''} onChange={(e) => update('email', e.target.value)} />
          <Input label="Transport License No." value={settings.transportLicenseNo ?? ''} onChange={(e) => update('transportLicenseNo', e.target.value)} />
          <Input label="Fleet Size" type="number" value={settings.fleetSize ?? ''} onChange={(e) => update('fleetSize', e.target.value)} />
          <div className="sm:col-span-2"><Textarea label="Address" value={settings.address ?? ''} onChange={(e) => update('address', e.target.value)} /></div>
          <div className="sm:col-span-2 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-600">
            <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Company Logo (Payslips, LR, Reports)</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-white p-2">
                {logoPreview ? (
                  <img src={logoPreview} alt="Company logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? 'Uploading…' : 'Upload Logo'}
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" disabled={uploadingLogo} onChange={handleLogoUpload} />
                </label>
                {(settings.logoUrl || settings.printLogoUrl) && (
                  <Button variant="outline" size="sm" icon={X} onClick={removeLogo}>Remove Logo</Button>
                )}
                <p className="text-xs text-slate-500">PNG, JPG, SVG or WebP · max 2 MB</p>
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Print Logo URL (optional override)"
              value={settings.printLogoUrl ?? ''}
              onChange={(e) => update('printLogoUrl', e.target.value)}
              placeholder="External URL — leave blank when using uploaded logo"
            />
          </div>
          <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={() => saveSettings({
            companyName: settings.companyName, gstin: settings.gstin, pan: settings.pan,
            address: settings.address, phone: settings.phone, email: settings.email,
            transportLicenseNo: settings.transportLicenseNo, fleetSize: settings.fleetSize ? Number(settings.fleetSize) : null,
          })}>Save Profile</Button>
          <Button variant="outline" icon={Save} onClick={savePrintLogo}>Save Logo URL Override</Button>
        </div>
      ),
    },
    {
      id: 'financial',
      label: 'Financial Year',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Current Financial Year" options={['2025-26', '2024-25', '2023-24']} value={settings.financialYear ?? '2025-26'} onChange={(e) => update('financialYear', e.target.value)} />
          <Input label="Year Start" type="date" value={settings.yearStart ?? '2025-04-01'} onChange={(e) => update('yearStart', e.target.value)} />
          <Input label="Year End" type="date" value={settings.yearEnd ?? '2026-03-31'} onChange={(e) => update('yearEnd', e.target.value)} />
          <Button icon={Save} onClick={() => saveSettings({ financialYear: settings.financialYear })}>Update Financial Year</Button>
        </div>
      ),
    },
    {
      id: 'gst',
      label: 'GST Details',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="GSTIN" value={settings.gstin ?? ''} onChange={(e) => update('gstin', e.target.value)} />
          <Select label="GST Type" options={['Regular', 'Composition', 'Unregistered']} value={settings.gstType ?? 'Regular'} onChange={(e) => update('gstType', e.target.value)} />
          <Input label="State Code" value={settings.stateCode ?? ''} onChange={(e) => update('stateCode', e.target.value)} />
          <Input label="GST Rate (%)" type="number" value={settings.gstRate ?? 18} onChange={(e) => update('gstRate', e.target.value)} />
          <Button icon={Save} onClick={() => saveSettings({ gstin: settings.gstin, gstRate: settings.gstRate })}>Save GST Details</Button>
        </div>
      ),
    },
    {
      id: 'roles',
      label: 'User Roles',
      content: (
        <div className="space-y-3">
          {['Super Admin', 'Accountant', 'Operations Manager', 'Driver Coordinator', 'Viewer'].map((role) => (
            <div key={role} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">{role}</span>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'theme',
      label: 'Theme',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => setTheme('light')} className={`rounded-xl border-2 p-4 text-left transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="font-semibold">Light Mode</p>
            <p className="text-sm text-slate-500">Clean enterprise light theme</p>
          </button>
          <button type="button" onClick={() => setTheme('dark')} className={`rounded-xl border-2 p-4 text-left transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="font-semibold">Dark Mode</p>
            <p className="text-sm text-slate-500">Easy on the eyes dark theme</p>
          </button>
        </div>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Current Password" type="password" />
          <Input label="New Password" type="password" />
          <Input label="Confirm Password" type="password" />
          <Select label="Session Timeout" options={['15 minutes', '30 minutes', '1 hour', '4 hours']} />
          <Button icon={Shield}>Update Security</Button>
        </div>
      ),
    },
    {
      id: 'backup',
      label: 'Backup',
      content: (
        <div className="space-y-4">
          <Card className="!p-4 border-dashed">
            <div className="flex items-center gap-4">
              <Building2 className="h-10 w-10 text-primary" />
              <div>
                <p className="font-medium">Last Backup: 17 Jun 2026, 11:30 PM</p>
                <p className="text-sm text-slate-500">Automatic daily backup enabled</p>
              </div>
            </div>
          </Card>
          <div className="flex gap-2">
            <Button icon={Download}>Download Backup</Button>
            <Button variant="outline">Restore Backup</Button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <ERPContentPage module="Settings" title="Settings">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          to="/settings/portal-users"
          className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <Shield className="h-4 w-4" />
          Portal user access
        </Link>
        <Link
          to="/settings/branches"
          className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <Building2 className="h-4 w-4" />
          Branch locations
        </Link>
        <Link
          to="/settings/notifications"
          className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <Bell className="h-4 w-4" />
          SMS & WhatsApp notifications
        </Link>
      </div>
      <Card className="!p-2.5 sm:!p-3">
        <Tabs tabs={tabs} />
      </Card>
    </ERPContentPage>
  )
}
