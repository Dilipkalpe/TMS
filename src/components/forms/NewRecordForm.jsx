import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import { Save, ArrowLeft } from 'lucide-react'

export default function NewRecordForm({ module, title, fields, listPath, saveLabel }) {
  const navigate = useNavigate()

  return (
    <ERPContentPage module={module} title={title}>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) =>
            field.type === 'select' ? (
              <Select key={field.label} label={field.label} options={field.options} />
            ) : (
              <Input key={field.label} label={field.label} type={field.type} placeholder={field.placeholder} />
            ),
          )}
        </div>
        <div className="mt-6 flex gap-2">
          <Button icon={Save}>{saveLabel}</Button>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(listPath)}>Cancel</Button>
        </div>
      </Card>
    </ERPContentPage>
  )
}
