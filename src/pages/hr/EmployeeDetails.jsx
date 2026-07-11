import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { hrApi, vehiclesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, Loader2, Save } from 'lucide-react'

import { EMPLOYMENT_TYPES, applyEmploymentNorms, employeeTotalPay } from '../../config/employmentNorms'

const EMP_TYPES = ['Driver', 'Staff', 'Office', 'Mechanic', 'Loader']
const STATUSES = ['Active', 'On Leave', 'Resigned', 'Terminated']

export default function EmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isNew = !id || id === 'new'
  const [form, setForm] = useState({
    employeeCode: '', name: '', employeeType: 'Staff', employmentType: 'Permanent',
    departmentId: '', designationId: '', driverId: '',
    email: '', phone: '', dateOfJoining: '', dateOfBirth: '', contractEndDate: '',
    gender: '', address: '', bankAccount: '', bankIfsc: '', pan: '',
    basicSalary: 0, dailyWage: 0, hra: 0, da: 0, conveyance: 0, otherAllowance: 0,
    advance: 0, pfApplicable: true, esiApplicable: true, insuranceApplicable: true,
    insuranceAmount: 500, status: 'Active',
    licenseNumber: '', licenseExpiry: '', assignedVehicleId: '',
    routeAllowance: 0, fuelAllowance: 0, loadingAllowance: 0,
    haltingAllowance: 0, driverBhatta: 0,
  })
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const onEmploymentTypeChange = (type) => {
    const norms = applyEmploymentNorms(type)
    setForm((p) => ({
      ...p,
      employmentType: type,
      pfApplicable: norms.pfApplicable,
      esiApplicable: norms.esiApplicable,
      insuranceApplicable: norms.insuranceApplicable,
      insuranceAmount: norms.insuranceAmount,
    }))
  }

  const normsHint = applyEmploymentNorms(form.employmentType).hint

  const load = useCallback(async () => {
    if (isNew) return
    setLoading(true)
    try {
      const [emp, depts, desigs] = await Promise.all([
        hrApi.getEmployee(id),
        hrApi.departments(),
        hrApi.designations(),
      ])
      setDepartments(depts)
      setDesignations(desigs)
      setForm({
        employeeCode: emp.employeeCode,
        name: emp.name,
        employeeType: emp.employeeType,
        employmentType: emp.employmentType ?? 'Permanent',
        departmentId: emp.departmentId ?? '',
        designationId: emp.designationId ?? '',
        driverId: emp.driverId ?? '',
        email: emp.email ?? '',
        phone: emp.phone ?? '',
        dateOfJoining: emp.dateOfJoining ?? '',
        dateOfBirth: emp.dateOfBirth ?? '',
        contractEndDate: emp.contractEndDate ?? '',
        gender: emp.gender ?? '',
        address: emp.address ?? '',
        bankAccount: emp.bankAccount ?? '',
        bankIfsc: emp.bankIfsc ?? '',
        pan: emp.pan ?? '',
        basicSalary: emp.basicSalary,
        dailyWage: emp.dailyWage ?? 0,
        hra: emp.hra,
        da: emp.da,
        conveyance: emp.conveyance,
        otherAllowance: emp.otherAllowance,
        advance: emp.advance,
        pfApplicable: emp.pfApplicable,
        esiApplicable: emp.esiApplicable ?? false,
        insuranceApplicable: emp.insuranceApplicable ?? true,
        insuranceAmount: emp.insuranceAmount ?? 0,
        status: emp.status,
        licenseNumber: emp.licenseNumber ?? '',
        licenseExpiry: emp.licenseExpiry ?? '',
        assignedVehicleId: emp.assignedVehicleId ?? '',
        routeAllowance: emp.routeAllowance ?? 0,
        fuelAllowance: emp.fuelAllowance ?? 0,
        loadingAllowance: emp.loadingAllowance ?? 0,
        haltingAllowance: emp.haltingAllowance ?? 0,
        driverBhatta: emp.driverBhatta ?? 0,
      })
    } catch (err) {
      toast({ title: 'Load failed', message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id, isNew, toast])

  useEffect(() => {
    hrApi.departments().then(setDepartments).catch(() => {})
    hrApi.designations().then(setDesignations).catch(() => {})
    vehiclesApi.list().then((res) => setVehicles(Array.isArray(res) ? res : res?.items ?? [])).catch(() => {})
    load()
  }, [load])

  const totalSalary = employeeTotalPay(form)

  const handleSave = async () => {
    const missing = []
    if (!form.employeeCode?.trim()) missing.push('Employee code')
    if (!form.name?.trim()) missing.push('Name')
    if (missing.length) {
      toast({
        title: 'Required fields missing',
        message: `Please fill: ${missing.join(', ')}`,
        type: 'error',
      })
      return
    }

    setSaving(true)
    try {
      const body = {
        ...form,
        id: isNew ? null : id,
        departmentId: form.departmentId || null,
        designationId: form.designationId || null,
        driverId: form.driverId || null,
        basicSalary: Number(form.basicSalary),
        dailyWage: Number(form.dailyWage),
        hra: Number(form.hra),
        da: Number(form.da),
        conveyance: Number(form.conveyance),
        otherAllowance: Number(form.otherAllowance),
        advance: Number(form.advance),
        insuranceAmount: Number(form.insuranceAmount),
        routeAllowance: Number(form.routeAllowance),
        fuelAllowance: Number(form.fuelAllowance),
        loadingAllowance: Number(form.loadingAllowance),
        haltingAllowance: Number(form.haltingAllowance),
        driverBhatta: Number(form.driverBhatta),
        licenseNumber: form.licenseNumber || null,
        licenseExpiry: form.licenseExpiry || null,
        assignedVehicleId: form.assignedVehicleId || null,
      }
      await hrApi.saveEmployee(body)
      toast({ title: 'Saved', message: 'Employee saved successfully.', type: 'success' })
      navigate('/hr/employees')
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const isFleetRole = ['Driver', 'Loader', 'Mechanic'].includes(form.employeeType)

  if (loading) {
    return (
      <ERPContentPage module="HR" title="Employee">
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      </ERPContentPage>
    )
  }

  return (
    <ERPContentPage module="HR" title={isNew ? 'New Employee' : form.name}>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/hr/employees" className="text-slate-500 hover:text-primary"><ArrowLeft className="h-5 w-5" /></Link>
        {!isNew && <Badge variant={statusVariant(form.status)}>{form.status}</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Personal & Employment" />
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Employee Code" value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} />
            <Input label="Full Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Select label="Job Role" options={EMP_TYPES} value={form.employeeType} onChange={(e) => set('employeeType', e.target.value)} />
            <Select
              label="Employment Type"
              options={EMPLOYMENT_TYPES}
              value={form.employmentType}
              onChange={(e) => onEmploymentTypeChange(e.target.value)}
            />
            {form.employmentType === 'Contract' && (
              <Input label="Contract End Date" type="date" value={form.contractEndDate} onChange={(e) => set('contractEndDate', e.target.value)} />
            )}
            <Select label="Department" options={[{ value: '', label: '(None)' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)} />
            <Select label="Designation" options={[{ value: '', label: '(None)' }, ...designations.map((d) => ({ value: d.id, label: d.name }))]} value={form.designationId} onChange={(e) => set('designationId', e.target.value)} />
            <Input label="Driver ID (if driver)" value={form.driverId} onChange={(e) => set('driverId', e.target.value)} />
            <Input label="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Input label="Date of Joining" type="date" value={form.dateOfJoining} onChange={(e) => set('dateOfJoining', e.target.value)} />
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            <Select label="Gender" options={['', 'Male', 'Female', 'Other']} value={form.gender} onChange={(e) => set('gender', e.target.value)} />
            <Select label="Status" options={STATUSES} value={form.status} onChange={(e) => set('status', e.target.value)} />
            <Input label="PAN" value={form.pan} onChange={(e) => set('pan', e.target.value)} className="sm:col-span-2" />
            <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} className="sm:col-span-3" />
          </div>
        </Card>

        <Card>
          <CardHeader title={form.employmentType === 'Daily' ? 'Daily Wage' : 'Salary Structure'} />
          <div className="space-y-3 p-4">
            {form.employmentType === 'Daily' ? (
              <Input label="Daily Wage (₹)" type="number" value={form.dailyWage} onChange={(e) => set('dailyWage', e.target.value)} />
            ) : (
              <>
                <Input label="Basic / Contract Amount" type="number" value={form.basicSalary} onChange={(e) => set('basicSalary', e.target.value)} />
                <Input label="HRA" type="number" value={form.hra} onChange={(e) => set('hra', e.target.value)} />
                <Input label="DA" type="number" value={form.da} onChange={(e) => set('da', e.target.value)} />
                <Input label="Conveyance" type="number" value={form.conveyance} onChange={(e) => set('conveyance', e.target.value)} />
                <Input label="Other Allowance" type="number" value={form.otherAllowance} onChange={(e) => set('otherAllowance', e.target.value)} />
              </>
            )}
            <Input label="Advance Balance" type="number" value={form.advance} onChange={(e) => set('advance', e.target.value)} />
            <Input label="Insurance Amount (₹/month or override)" type="number" value={form.insuranceAmount} onChange={(e) => set('insuranceAmount', e.target.value)} />
            <div className="space-y-2 border-t pt-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.pfApplicable} onChange={(e) => set('pfApplicable', e.target.checked)} />
                PF Applicable
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.esiApplicable} onChange={(e) => set('esiApplicable', e.target.checked)} />
                ESI Applicable
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.insuranceApplicable} onChange={(e) => set('insuranceApplicable', e.target.checked)} />
                Insurance Applicable
              </label>
            </div>
            <p className="text-xs text-slate-500">{normsHint}</p>
            <p className="border-t pt-3 text-sm font-semibold text-primary">
              {form.employmentType === 'Daily' ? 'Daily Rate' : 'Monthly Total'}: {formatCurrency(totalSalary)}
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Bank Details" />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Input label="Bank Account" value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} />
            <Input label="IFSC" value={form.bankIfsc} onChange={(e) => set('bankIfsc', e.target.value)} />
          </div>
        </Card>

        {isFleetRole && (
          <Card className="lg:col-span-3">
            <CardHeader title="TMS Transport — Fleet & Allowances" subtitle="Applied automatically during payroll generation" />
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Driving License No." value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} />
              <Input label="License Expiry" type="date" value={form.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} />
              <Select
                label="Assigned Vehicle"
                options={[{ value: '', label: '(None)' }, ...vehicles.map((v) => ({ value: v.id, label: `${v.number}${v.type ? ` — ${v.type}` : ''}` }))]}
                value={form.assignedVehicleId}
                onChange={(e) => set('assignedVehicleId', e.target.value)}
              />
              <Input label="Route Allowance (₹/month)" type="number" value={form.routeAllowance} onChange={(e) => set('routeAllowance', e.target.value)} />
              <Input label="Fuel Allowance (₹/month fixed)" type="number" value={form.fuelAllowance} onChange={(e) => set('fuelAllowance', e.target.value)} />
              <Input label="Driver Bhatta (₹/day on road)" type="number" value={form.driverBhatta} onChange={(e) => set('driverBhatta', e.target.value)} />
              <Input label="Loading Allowance (₹/month)" type="number" value={form.loadingAllowance} onChange={(e) => set('loadingAllowance', e.target.value)} />
              <Input label="Halting Allowance (₹/trip share)" type="number" value={form.haltingAllowance} onChange={(e) => set('haltingAllowance', e.target.value)} />
            </div>
          </Card>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save Employee'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/hr/employees')}>Cancel</Button>
      </div>
    </ERPContentPage>
  )
}
