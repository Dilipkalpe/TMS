import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { payrollApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, CalendarClock, Loader2 } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function ProcessPayroll() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await payrollApi.generate(Number(month), Number(year))
      toast({
        title: 'Payroll generated',
        message: `${result.run?.runCode ?? 'Payroll'} created for ${MONTHS[Number(month) - 1]} ${year}.`,
        type: 'success',
      })
      navigate(`/payroll/runs/${result.id}`)
    } catch (err) {
      toast({ title: 'Generation failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(String)

  return (
    <ERPContentPage
      module="Payroll"
      title="Generate Payroll"
      toolbar={
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/payroll')}>Back</Button>
      }
    >
      <Card className="max-w-xl">
        <CardHeader
          title="Monthly Payroll Generation"
          subtitle="Runs sp_payroll_generate — calculates salary, trip incentive, PF & advance recovery for all active drivers"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Pay Month"
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Select label="Pay Year" options={years} value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Permanent</strong> — full monthly salary, PF, ESI (if eligible), insurance, professional tax</li>
          <li><strong>Contract</strong> — contract amount, reduced allowances, insurance, optional PF</li>
          <li><strong>Daily</strong> — daily wage × attendance days, per-day insurance, no ESI by default</li>
          <li>Statutory rates configurable under Payroll Settings</li>
        </ul>
        <Button
          className="mt-6"
          icon={loading ? Loader2 : CalendarClock}
          disabled={loading}
          onClick={handleGenerate}
        >
          {loading ? 'Generating…' : 'Generate Payroll'}
        </Button>
      </Card>
    </ERPContentPage>
  )
}
