import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Input, { Select, Textarea } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { OpsFooter, OpsGrid, OpsPageHeader, OpsSection, OpsStatusPanel } from '../../components/ops/OpsFormParts'
import { PackageCheck, MapPin, User, Camera } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export default function PodEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState({
    podNo: 'POD250500101', lrNo: 'LR250500101', tripNo: 'TRP25050045',
    deliveryDate: '2025-05-08', deliveryTime: '16:35',
    consignee: 'Techno Electricals', mobile: '9812345678', address: 'Plot 45, Sector-8, Bawal',
    deliveryAddress: 'Plot 45, Sector-8, Bawal', landmark: 'Near NH-48', location: 'Bawal, Haryana',
    packages: 12, actualWeight: 980, chargedWeight: 1200,
    condition: 'Good', deliveryStatus: 'Delivered',
    remarks: 'Delivered in good condition. Receiver verified.',
    receiverName: 'Amit Deshmukh', designation: 'Store Manager', receiverMobile: '9898989898',
  })
  const u = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <ERPContentPage module="Operations" title="POD (Proof of Delivery)" fillViewport>
      <div className="lr-entry-shell lr-entry-compact" data-kbd-form-root>
        <OpsPageHeader title="POD (Proof of Delivery)" breadcrumb="Home / Delivery / POD" status="DELIVERED" />

        <div className="grid shrink-0 gap-1 lg:grid-cols-[1fr_11rem]">
          <OpsSection title="POD Information" icon={PackageCheck}>
            <OpsGrid cols={5}>
              <Input label="POD No." value={form.podNo} readOnly />
              <Input label="LR No." value={form.lrNo} onChange={(e) => u('lrNo', e.target.value)} />
              <Input label="Trip No." value={form.tripNo} onChange={(e) => u('tripNo', e.target.value)} />
              <Input label="Delivery Date" type="date" value={form.deliveryDate} onChange={(e) => u('deliveryDate', e.target.value)} />
              <Input label="Delivery Time" type="time" value={form.deliveryTime} onChange={(e) => u('deliveryTime', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsStatusPanel status="DELIVERED" rows={[
            { label: 'Delivered On', value: '08/05/2025 04:35 PM' },
            { label: 'Delivered By', value: 'Amit Deshmukh' },
          ]} />
        </div>

        <OpsGrid cols={2}>
          <OpsSection title="Customer / Consignee" icon={User}>
            <OpsGrid cols={2}>
              <Input label="Consignee Name" value={form.consignee} onChange={(e) => u('consignee', e.target.value)} />
              <Input label="Mobile" value={form.mobile} onChange={(e) => u('mobile', e.target.value)} />
              <Input label="Address" className="sm:col-span-2" value={form.address} onChange={(e) => u('address', e.target.value)} />
            </OpsGrid>
          </OpsSection>
          <OpsSection title="Delivery Location" icon={MapPin}>
            <OpsGrid cols={2}>
              <Input label="Delivery Address" value={form.deliveryAddress} onChange={(e) => u('deliveryAddress', e.target.value)} />
              <Input label="Landmark" value={form.landmark} onChange={(e) => u('landmark', e.target.value)} />
              <Input label="Location" className="sm:col-span-2" value={form.location} onChange={(e) => u('location', e.target.value)} />
            </OpsGrid>
          </OpsSection>
        </OpsGrid>

        <OpsSection title="Package & Delivery Details">
          <OpsGrid cols={5}>
            <Input label="No. of Packages" type="number" value={form.packages} onChange={(e) => u('packages', e.target.value)} />
            <Input label="Actual Weight (Kg)" type="number" value={form.actualWeight} onChange={(e) => u('actualWeight', e.target.value)} />
            <Input label="Charged Weight (Kg)" type="number" value={form.chargedWeight} onChange={(e) => u('chargedWeight', e.target.value)} />
            <Select label="Condition" options={['Good', 'Damaged', 'Partial']} value={form.condition} onChange={(e) => u('condition', e.target.value)} />
            <Select label="Delivery Status" options={['Delivered', 'Partial', 'Refused']} value={form.deliveryStatus} onChange={(e) => u('deliveryStatus', e.target.value)} />
          </OpsGrid>
          <Textarea label={`Remarks (${form.remarks.length}/200)`} rows={1} maxLength={200} value={form.remarks} onChange={(e) => u('remarks', e.target.value)} className="mt-1" />
        </OpsSection>

        <OpsGrid cols={2}>
          <OpsSection title="Receiver Details">
            <OpsGrid cols={3}>
              <Input label="Receiver Name" value={form.receiverName} onChange={(e) => u('receiverName', e.target.value)} />
              <Input label="Designation" value={form.designation} onChange={(e) => u('designation', e.target.value)} />
              <Input label="Mobile" value={form.receiverMobile} onChange={(e) => u('receiverMobile', e.target.value)} />
            </OpsGrid>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <div className="rounded border border-dashed border-slate-300 p-2 text-center text-[10px] dark:border-slate-600">
                <p className="font-medium">Receiver Signature</p>
                <p className="italic text-slate-500">Amit Deshmukh</p>
                <button type="button" className="text-primary">Clear</button>
              </div>
              <div className="rounded border border-dashed border-slate-300 p-2 text-center text-[10px] dark:border-slate-600">
                <p className="font-medium">Receiver Seal</p>
                <p className="text-slate-500">Techno Electricals</p>
              </div>
            </div>
          </OpsSection>
          <OpsSection title="Attachments & Photos" icon={Camera}>
            <p className="text-[10px] text-slate-500">Delivery Note.pdf · Challan Copy.xlsx</p>
            <Button size="sm" variant="outline" className="mt-1">+ Upload More</Button>
            <p className="mt-2 text-[10px] font-semibold text-primary">Delivery Photos</p>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-16 rounded bg-slate-200 dark:bg-slate-700" />
              ))}
              <Button size="sm" variant="outline">+ Add</Button>
            </div>
          </OpsSection>
        </OpsGrid>

        <OpsSection title="POD History">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-1 py-1 text-left">POD No.</th>
                <th className="px-1 py-1 text-left">LR No.</th>
                <th className="px-1 py-1 text-left">Date</th>
                <th className="px-1 py-1 text-left">Delivered By</th>
                <th className="px-1 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-1 py-0.5">POD250500101</td>
                <td className="px-1 py-0.5">LR250500101</td>
                <td className="px-1 py-0.5">08/05/2025</td>
                <td className="px-1 py-0.5">Amit Deshmukh</td>
                <td className="px-1 py-0.5"><Badge variant="Paid">Delivered</Badge></td>
              </tr>
            </tbody>
          </table>
        </OpsSection>

        <OpsFooter
          onCancel={() => navigate('/lr?status=delivered')}
          onSave={() => toast({ title: 'POD saved', type: 'success' })}
          onSavePrint={() => toast({ title: 'Saved & Print', type: 'success' })}
        />
      </div>
    </ERPContentPage>
  )
}
