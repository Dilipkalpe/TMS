import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Tabs from '../../components/ui/Tabs'
import { useTheme } from '../../context/ThemeContext'
import { Save, Download, Shield, Building2 } from 'lucide-react'

export default function Settings() {
  const { theme, setTheme } = useTheme()

  const tabs = [
    {
      id: 'company',
      label: 'Company Profile',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company Name" defaultValue="TMS Transport Pvt. Ltd." />
          <Input label="GSTIN" defaultValue="27AABCT1234F1Z5" />
          <Input label="PAN" defaultValue="AABCT1234F" />
          <Input label="Phone" defaultValue="+91 22 1234 5678" />
          <Input label="Email" defaultValue="info@tmstransport.com" />
          <div className="sm:col-span-2"><Textarea label="Address" defaultValue="123, Transport Nagar, Andheri East, Mumbai - 400069" /></div>
          <Button icon={Save}>Save Profile</Button>
        </div>
      ),
    },
    {
      id: 'financial',
      label: 'Financial Year',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Current Financial Year" options={['2025-26', '2024-25', '2023-24']} />
          <Input label="Year Start" type="date" defaultValue="2025-04-01" />
          <Input label="Year End" type="date" defaultValue="2026-03-31" />
          <Button icon={Save}>Update Financial Year</Button>
        </div>
      ),
    },
    {
      id: 'gst',
      label: 'GST Details',
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="GSTIN" defaultValue="27AABCT1234F1Z5" />
          <Select label="GST Type" options={['Regular', 'Composition', 'Unregistered']} />
          <Input label="State Code" defaultValue="27 - Maharashtra" />
          <Input label="Registration Date" type="date" defaultValue="2020-04-01" />
          <Button icon={Save}>Save GST Details</Button>
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
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <p className="font-semibold">Light Mode</p>
            <p className="text-sm text-slate-500">Clean enterprise light theme</p>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}
          >
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
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !p-2.5 sm:!p-3">
        <Tabs fill tabs={tabs} />
      </Card>
    </ERPContentPage>
  )
}
