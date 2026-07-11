import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import { parseCsv, downloadImportTemplate } from '../../utils/importCsv'
import { importApi } from '../../services/api'

export default function ImportModal({ open, onClose, template, onComplete }) {
  const inputRef = useRef(null)
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const reset = () => {
    setRows([])
    setFileName('')
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose?.()
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result ?? ''))
        if (!parsed.length) {
          setError('No data rows found. Use the template and include a header row.')
          setRows([])
          return
        }
        const missing = template.required.filter((col) => !Object.keys(parsed[0]).includes(col))
        if (missing.length) {
          setError(`Missing required columns: ${missing.join(', ')}`)
        }
        setRows(parsed)
        setFileName(file.name)
      } catch (err) {
        setError(err.message ?? 'Failed to parse CSV')
        setRows([])
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!rows.length) return
    setLoading(true)
    setError(null)
    try {
      const res = await importApi.upload(template.entity, rows)
      setResult(res)
      onComplete?.(res)
    } catch (err) {
      setError(err.message ?? 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Import ${template.label}`}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadImportTemplate(template.columns, template.sampleFilename)}>
            Download template
          </Button>
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" icon={Upload} disabled={!rows.length || loading} onClick={handleImport}>
            {loading ? 'Importing…' : `Import ${rows.length || ''} row(s)`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload a CSV file with columns: {template.columns.join(', ')}.
          Required: {template.required.join(', ')}.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
        />
        {fileName && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {fileName} — {rows.length} row(s) ready
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <p>Created: {result.created} · Updated: {result.updated} · Failed: {result.failed}</p>
            {result.errors?.length > 0 && (
              <ul className="mt-2 max-h-32 list-disc overflow-auto pl-5 text-xs">
                {result.errors.slice(0, 10).map((e) => (
                  <li key={`${e.row}-${e.key}`}>Row {e.row}{e.key ? ` (${e.key})` : ''}: {e.error}</li>
                ))}
                {result.errors.length > 10 && <li>…and {result.errors.length - 10} more</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
