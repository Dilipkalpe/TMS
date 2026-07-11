import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { notificationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800'

export default function NotificationSettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState(null)
  const [templates, setTemplates] = useState([])
  const [outbox, setOutbox] = useState([])
  const [tab, setTab] = useState('channels')
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('TMS Pro test notification')

  const load = useCallback(async () => {
    try {
      const [s, t, o] = await Promise.all([
        notificationsApi.channelSettings(),
        notificationsApi.templates(),
        notificationsApi.outbox({ limit: 30 }),
      ])
      setSettings(s)
      setTemplates(t)
      setOutbox(o)
      setTestPhone(s.adminPhone ?? '')
    } catch (e) {
      toast({ title: 'Load failed', message: e.message, type: 'error' })
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const saveSettings = async () => {
    try {
      await notificationsApi.updateChannelSettings(settings)
      toast({ title: 'Settings saved', type: 'success' })
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    }
  }

  const saveTemplate = async (tpl) => {
    try {
      await notificationsApi.updateTemplate(tpl.id, { bodyTemplate: tpl.bodyTemplate, isActive: tpl.isActive })
      toast({ title: 'Template saved', type: 'success' })
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    }
  }

  const sendTest = async () => {
    try {
      const r = await notificationsApi.sendTest({ phone: testPhone, message: testMessage, channel: 'SMS' })
      toast({ title: `Test ${r.status}`, message: r.providerMessageId ?? r.errorMessage ?? '', type: r.status === 'SENT' ? 'success' : 'error' })
      load()
    } catch (e) {
      toast({ title: 'Test failed', message: e.message, type: 'error' })
    }
  }

  if (!settings) {
    return (
      <ERPContentPage module="Settings" title="SMS & WhatsApp">
        <p className="text-sm text-slate-500">Loading…</p>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="Settings" title="SMS & WhatsApp Notifications">
      <p className="mb-4 text-sm text-slate-500">
        Configure MSG91 in <code className="rounded bg-slate-100 px-1">appsettings.Production.json</code> under <strong>Notifications:Msg91:AuthKey</strong>.
        Without a key, messages run in stub mode (logged as SENT).
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {['channels', 'templates', 'outbox'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-primary text-white' : 'border'}`}>{t}</button>
        ))}
        <Link to="/operations/notifications" className="ml-auto text-sm text-primary hover:underline">In-app notifications →</Link>
      </div>

      {tab === 'channels' && (
        <Card className="max-w-lg space-y-3 p-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.smsEnabled} onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })} /> SMS enabled</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.whatsappEnabled} onChange={(e) => setSettings({ ...settings, whatsappEnabled: e.target.checked })} /> WhatsApp enabled</label>
          <input placeholder="Admin / fleet manager phone" value={settings.adminPhone ?? ''} onChange={(e) => setSettings({ ...settings, adminPhone: e.target.value })} className={inputClass} />
          <input placeholder="Country code" value={settings.defaultCountryCode ?? '91'} onChange={(e) => setSettings({ ...settings, defaultCountryCode: e.target.value })} className={inputClass} />
          <Button onClick={saveSettings}>Save channel settings</Button>
          <hr className="my-2 border-slate-200" />
          <p className="text-sm font-medium">Send test SMS</p>
          <input placeholder="Phone" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className={inputClass} />
          <input placeholder="Message" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} className={inputClass} />
          <Button variant="secondary" onClick={sendTest}>Send test</Button>
        </Card>
      )}

      {tab === 'templates' && (
        <div className="space-y-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="p-4">
              <p className="mb-2 text-sm font-semibold">{tpl.code} · {tpl.channel}</p>
              <textarea
                rows={2}
                value={tpl.bodyTemplate}
                onChange={(e) => setTemplates((rows) => rows.map((r) => r.id === tpl.id ? { ...r, bodyTemplate: e.target.value } : r))}
                className={inputClass}
              />
              <div className="mt-2 flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tpl.isActive} onChange={(e) => setTemplates((rows) => rows.map((r) => r.id === tpl.id ? { ...r, isActive: e.target.checked } : r))} /> Active</label>
                <Button size="sm" onClick={() => saveTemplate(templates.find((r) => r.id === tpl.id))}>Save</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'outbox' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Channel</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Provider ID</th>
              </tr>
            </thead>
            <tbody>
              {outbox.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-2">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">{o.channel}</td>
                  <td className="px-4 py-2">{o.recipientPhone}</td>
                  <td className="px-4 py-2">{o.status}</td>
                  <td className="px-4 py-2 text-xs">{o.providerMessageId ?? o.errorMessage ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </ERPContentPage>
  )
}
