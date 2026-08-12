import { useCallback, useEffect, useMemo, useState } from 'react'
import { History, PackageCheck, Printer, Send, Truck, Unlink, Warehouse } from 'lucide-react'
import ERPListPage from '../../components/ui/ERPListPage'
import ERPPageTitle from '../../components/ui/ERPPageTitle'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import SlideDrawer from '../../components/ui/SlideDrawer'
import OpsListActionBar from '../../components/ops/OpsListActionBar'
import LrListKpiCards from '../../components/lr/LrListKpiCards'
import LrListTableToolbar from '../../components/lr/LrListTableToolbar'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { hubTransferApi, branchesApi, vehiclesApi, driversApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { usePrint } from '../../context/PrintContext'
import { PRINT_MODULE_CODES } from '../../config/printModules'
import { printModuleDocument } from '../../services/printService'
import { statusBadgeVariant } from '../../utils/opsWorkflowUtils'

const EMPTY_FILTERS = {
  lrNo: '', dateFrom: '', dateTo: '', hubBranchId: '', destination: '',
  status: '', vehicleNo: '', manifestNo: '', customer: '',
}

const COLUMNS = [
  { key: 'lrNumber', label: 'LR No' },
  { key: 'lrDate', label: 'LR Date' },
  { key: 'consignor', label: 'Consignor' },
  { key: 'consignee', label: 'Consignee' },
  { key: 'originalFrom', label: 'Original From' },
  { key: 'finalDestination', label: 'Final Destination' },
  { key: 'currentLocation', label: 'Current Location' },
  { key: 'currentHub', label: 'Current Hub' },
  { key: 'previousVehicle', label: 'Previous Vehicle' },
  { key: 'currentStatus', label: 'Current Status', badge: true },
  { key: 'nextDestination', label: 'Next Destination' },
  { key: 'currentManifestNo', label: 'Current Manifest' },
  { key: 'nextManifestNo', label: 'Next Manifest' },
  { key: 'packages', label: 'Packages' },
  { key: 'weight', label: 'Weight' },
]

function countActiveFilters(f) {
  return Object.entries(f).filter(([, v]) => v).length
}

export default function HubTransferPage() {
  const { toast } = useToast()
  const { company, print } = usePrint()
  const [summary, setSummary] = useState({})
  const [branches, setBranches] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [kpi, setKpi] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [columnsSignal, setColumnsSignal] = useState(0)
  const [selected, setSelected] = useState(() => new Set())

  const [receiveOpen, setReceiveOpen] = useState(false)
  const [unloadOpen, setUnloadOpen] = useState(false)
  const [reManifestOpen, setReManifestOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const [receiveForm, setReceiveForm] = useState({
    loadingSheetNo: '', vehicleNo: '', hubBranchId: '', remarks: '',
  })
  const [inboundPreview, setInboundPreview] = useState(null)
  const [inboundSelected, setInboundSelected] = useState(() => new Set())

  const [reManifestForm, setReManifestForm] = useState({
    hubBranchId: '', toDestination: '', vehicleId: '', driverId: '', remarks: '',
  })
  const [history, setHistory] = useState(null)
  const [dispatchManifestId, setDispatchManifestId] = useState(null)
  const [dispatchManifest, setDispatchManifest] = useState(null)

  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => {
      const params = buildListParams({ page, pageSize, search })
      Object.entries(appliedFilters).forEach(([k, v]) => { if (v) params[k] = v })
      if (kpi) params.kpi = kpi
      return hubTransferApi.listLrs(params)
    },
    [appliedFilters, kpi],
  )

  const reloadSummary = useCallback(() => {
    const params = {}
    if (appliedFilters.hubBranchId) params.hubBranchId = appliedFilters.hubBranchId
    hubTransferApi.summary(params).then(setSummary).catch(() => {})
  }, [appliedFilters.hubBranchId])

  useEffect(() => { reloadSummary() }, [paged.items.length, reloadSummary])

  useEffect(() => {
    branchesApi.list(true).then((r) => setBranches(Array.isArray(r) ? r : r.items || [])).catch(() => {})
    vehiclesApi.list({ pageSize: 200 }).then((r) => setVehicles(r.items || r || [])).catch(() => {})
    driversApi.list({ pageSize: 200 }).then((r) => setDrivers(r.items || r || [])).catch(() => {})
  }, [])

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters })
    paged.setPage(1)
    setFilterOpen(false)
  }, [draftFilters, paged])

  const clearFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setKpi('')
    paged.setPage(1)
    setFilterOpen(false)
  }, [paged])

  const refreshList = useCallback(() => {
    paged.refresh()
    reloadSummary()
    setSelected(new Set())
  }, [paged, reloadSummary])

  const rows = paged.items

  const toggleRow = (lrNumber) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(lrNumber)) next.delete(lrNumber)
      else next.add(lrNumber)
      return next
    })
  }

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.lrNumber)), [rows, selected])

  const kpiCards = useMemo(() => [
    { label: 'Total LR at Hub', count: summary.totalAtHub ?? 0, icon: 'Warehouse', color: 'violet', onClick: () => { setKpi('at-hub'); paged.setPage(1) } },
    { label: 'Ready for Re-Manifest', count: summary.readyForReManifest ?? 0, icon: 'PackageCheck', color: 'teal', onClick: () => { setKpi('ready'); paged.setPage(1) } },
    { label: 'Manifest Created', count: summary.manifestCreated ?? 0, icon: 'FileText', color: 'blue', onClick: () => { setKpi('manifestCreated'); paged.setPage(1) } },
    { label: 'Ready for Dispatch', count: summary.readyForDispatch ?? 0, icon: 'Send', color: 'orange', onClick: () => { setKpi('readyForDispatch'); paged.setPage(1) } },
    { label: 'In Transit', count: summary.inTransit ?? 0, icon: 'Truck', color: 'orange', onClick: () => { setKpi('inTransit'); paged.setPage(1) } },
    { label: 'Delivered', count: summary.delivered ?? 0, icon: 'CheckCircle2', color: 'green', onClick: () => { setKpi('delivered'); paged.setPage(1) } },
  ], [summary, paged])

  const columns = useMemo(() => [
    {
      key: '_sel',
      label: '',
      render: (r) => (
        <input type="checkbox" checked={selected.has(r.lrNumber)} onChange={() => toggleRow(r.lrNumber)} onClick={(e) => e.stopPropagation()} />
      ),
    },
    ...COLUMNS.map((col) => ({
      key: col.key,
      label: col.label,
      render: (r) => {
        const val = r[col.key]
        if (col.badge) return <Badge variant={statusBadgeVariant(val)}>{val || '—'}</Badge>
        if (col.key === 'lrDate' && val) return String(val).slice(0, 10)
        return val ?? '—'
      },
    })),
  ], [selected])

  const loadInboundPreview = async () => {
    setBusy(true)
    try {
      const data = await hubTransferApi.inboundPreview({
        loadingSheetNo: receiveForm.loadingSheetNo || undefined,
        vehicleNo: receiveForm.vehicleNo || undefined,
      })
      setInboundPreview(data)
      setInboundSelected(new Set((data.lines || []).filter((l) => l.canReceive).map((l) => l.lrNumber)))
    } catch (err) {
      toast({ title: 'Error', message: err.message || 'Preview failed', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const confirmReceive = async () => {
    if (!receiveForm.hubBranchId && !branches.length) {
      toast({ title: 'Error', message: 'Select a hub branch', type: 'error' })
      return
    }
    const hub = branches.find((b) => b.id === receiveForm.hubBranchId)
    setBusy(true)
    try {
      await hubTransferApi.receive({
        lrNumbers: [...inboundSelected],
        hubBranchId: receiveForm.hubBranchId || null,
        hubName: hub?.name || hub?.city,
        vehicleNumber: receiveForm.vehicleNo || inboundPreview?.vehicleNumber,
        sourceLoadingSheetId: inboundPreview?.sourceLoadingSheetId,
        loadingSheetNo: receiveForm.loadingSheetNo || null,
        remarks: receiveForm.remarks || null,
      })
      toast({ title: 'Success', message: 'Hub receipt saved', type: 'success' })
      setReceiveOpen(false)
      setInboundPreview(null)
      setReceiveForm({ loadingSheetNo: '', vehicleNo: '', hubBranchId: '', remarks: '' })
      setInboundSelected(new Set())
      refreshList()
    } catch (err) {
      toast({ title: 'Error', message: err.message || 'Receive failed', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const confirmUnload = async () => {
    if (!selected.size) {
      toast({ title: 'Error', message: 'Select LR rows to unload', type: 'error' })
      return
    }
    setBusy(true)
    try {
      await hubTransferApi.unload({ lrNumbers: [...selected] })
      toast({ title: 'Success', message: 'Unload confirmed — available for re-manifest', type: 'success' })
      setUnloadOpen(false)
      refreshList()
    } catch (err) {
      toast({ title: 'Error', message: err.message || 'Unload failed', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const confirmReManifest = async () => {
    if (!selected.size) {
      toast({ title: 'Error', message: 'Select LR rows', type: 'error' })
      return
    }
    if (!reManifestForm.toDestination.trim()) {
      toast({ title: 'Error', message: 'Destination is required', type: 'error' })
      return
    }
    const hub = branches.find((b) => b.id === reManifestForm.hubBranchId)
    const vehicle = vehicles.find((v) => v.id === reManifestForm.vehicleId)
    const driver = drivers.find((d) => d.id === reManifestForm.driverId)
    setBusy(true)
    try {
      const manifest = await hubTransferApi.reManifest({
        lrNumbers: [...selected],
        hubBranchId: reManifestForm.hubBranchId || null,
        hubName: hub?.name || selectedRows[0]?.currentHub,
        toDestination: reManifestForm.toDestination.trim(),
        vehicleId: vehicle?.id || null,
        vehicleNumber: vehicle?.number || null,
        vehicleType: vehicle?.type || null,
        driverId: driver?.id || null,
        driverName: driver?.name || null,
        driverMobile: driver?.phone || null,
        remarks: reManifestForm.remarks || null,
      })
      toast({ title: 'Success', message: `Re-manifest ${manifest.manifestNo} created`, type: 'success' })
      setReManifestOpen(false)
      setReManifestForm({ hubBranchId: '', toDestination: '', vehicleId: '', driverId: '', remarks: '' })
      refreshList()
      if (manifest.id && vehicle) {
        setDispatchManifestId(manifest.id)
        setDispatchManifest(manifest)
        setDispatchOpen(true)
      }
    } catch (err) {
      toast({ title: 'Error', message: err.message || 'Re-manifest failed', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const confirmDispatch = async () => {
    if (!dispatchManifestId) return
    setBusy(true)
    try {
      let mid = dispatchManifestId
      if (dispatchManifest && !dispatchManifest.vehicleNumber && reManifestForm.vehicleId) {
        await hubTransferApi.assignVehicle(mid, {
          vehicleId: reManifestForm.vehicleId,
          driverId: reManifestForm.driverId || null,
        })
      }
      const result = await hubTransferApi.dispatch(mid, {})
      toast({ title: 'Success', message: `Manifest ${result.manifestNo} dispatched`, type: 'success' })
      setDispatchOpen(false)
      setDispatchManifestId(null)
      refreshList()
    } catch (err) {
      toast({ title: 'Error', message: err.message || 'Dispatch failed', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const openHistory = async (row) => {
    try {
      const data = await hubTransferApi.movements(row.lrNumber)
      setHistory(data)
      setHistoryOpen(true)
    } catch (err) {
      toast({ title: 'Error', message: err.message || 'Failed to load history', type: 'error' })
    }
  }

  const printManifest = async (manifestId) => {
    try {
      const data = await hubTransferApi.manifestPrint(manifestId)
      await printModuleDocument({
        moduleCode: PRINT_MODULE_CODES.HUB_MANIFEST,
        company,
        print,
        documentData: { manifest: data },
      })
    } catch (err) {
      toast({ title: 'Error', message: err.message || 'Print failed', type: 'error' })
    }
  }

  const printReceive = async (manifestId) => {
    if (!manifestId) return
    try {
      const data = await hubTransferApi.receiveReport(manifestId)
      await printModuleDocument({
        moduleCode: PRINT_MODULE_CODES.HUB_RECEIVING,
        company,
        print,
        documentData: data,
      })
    } catch (err) {
      toast({ title: 'Error', message: err.message || 'Print failed', type: 'error' })
    }
  }

  const rowActions = useMemo(() => [
    { id: 'history', icon: History, label: 'Movement History', onClick: openHistory },
    {
      id: 'printManifest',
      icon: Printer,
      label: 'Print Manifest',
      onClick: (r) => {
        const id = r.nextManifestId || r.currentManifestId
        if (!id) { toast({ title: 'Error', message: 'No manifest on this LR', type: 'error' }); return }
        printManifest(id)
      },
    },
  ], [toast])

  const tableToolbar = (
    <LrListTableToolbar
      pageSize={paged.pageSize}
      onPageSizeChange={paged.setPageSize}
      totalRecords={paged.total}
      onManageColumns={() => setColumnsSignal((n) => n + 1)}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ERPPageTitle
        module="Shipment Management"
        title="Hub Transfer / Re-Manifest"
        breadcrumb={[
          { label: 'Home', path: '/' },
          { label: 'Shipment Management', path: '/shipment-management' },
          { label: 'Hub Transfer' },
        ]}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-2 sm:p-3">
          <OpsListActionBar
            newLabel="Receive at Hub"
            activeFilterCount={countActiveFilters(appliedFilters) + (kpi ? 1 : 0)}
            onNew={() => { setReceiveOpen(true); setInboundPreview(null) }}
            onSearch={() => setFilterOpen(true)}
            onFilter={() => setFilterOpen(true)}
            onRefresh={refreshList}
            onExport={() => {}}
            onPrint={() => {}}
            onManageColumns={() => setColumnsSignal((n) => n + 1)}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setUnloadOpen(true)} disabled={!selected.size}>
              <Unlink className="h-3.5 w-3.5" /> Unload at Hub
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const hubId = selectedRows[0]?.currentHubBranchId || appliedFilters.hubBranchId || ''
              setReManifestForm((f) => ({
                ...f,
                hubBranchId: hubId,
                toDestination: selectedRows.length === 1 ? (selectedRows[0].finalDestination || '') : '',
              }))
              setReManifestOpen(true)
            }} disabled={!selected.size}>
              <Truck className="h-3.5 w-3.5" /> Create Re-Manifest
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const id = selectedRows.find((r) => r.nextManifestId)?.nextManifestId
                || selectedRows.find((r) => r.currentManifestId)?.currentManifestId
              if (!id) { toast({ title: 'Error', message: 'Select an LR with a manifest', type: 'error' }); return }
              hubTransferApi.getManifest(id).then((m) => {
                setDispatchManifestId(id)
                setDispatchManifest(m)
                setDispatchOpen(true)
              }).catch((e) => toast({ title: 'Error', message: e.message, type: 'error' }))
            }}>
              <Send className="h-3.5 w-3.5" /> Dispatch
            </Button>
          </div>
          <LrListKpiCards cards={kpiCards} />
          {kpi && (
            <div className="text-xs text-slate-600">
              Filtered by KPI: <strong>{kpi}</strong>{' '}
              <button type="button" className="text-primary underline" onClick={() => setKpi('')}>Clear</button>
            </div>
          )}

          <SlideDrawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Hub Transfer" width="md">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="LR No" value={draftFilters.lrNo} onChange={(e) => setDraftFilters((f) => ({ ...f, lrNo: e.target.value }))} />
              <Input label="Customer" value={draftFilters.customer} onChange={(e) => setDraftFilters((f) => ({ ...f, customer: e.target.value }))} />
              <Input label="Date From" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <Input label="Date To" type="date" value={draftFilters.dateTo} onChange={(e) => setDraftFilters((f) => ({ ...f, dateTo: e.target.value }))} />
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Current Hub</span>
                <select className="w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900" value={draftFilters.hubBranchId} onChange={(e) => setDraftFilters((f) => ({ ...f, hubBranchId: e.target.value }))}>
                  <option value="">All</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.city ? ` (${b.city})` : ''}</option>)}
                </select>
              </label>
              <Input label="Destination" value={draftFilters.destination} onChange={(e) => setDraftFilters((f) => ({ ...f, destination: e.target.value }))} />
              <Input label="Status" value={draftFilters.status} onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value }))} placeholder="e.g. Hub Received" />
              <Input label="Vehicle No" value={draftFilters.vehicleNo} onChange={(e) => setDraftFilters((f) => ({ ...f, vehicleNo: e.target.value }))} />
              <Input label="Manifest No" value={draftFilters.manifestNo} onChange={(e) => setDraftFilters((f) => ({ ...f, manifestNo: e.target.value }))} />
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
              <Button onClick={applyFilters}>Search</Button>
              <Button variant="outline" onClick={clearFilters}>Reset</Button>
            </div>
          </SlideDrawer>

          <ERPListPage
            module="Shipment"
            listVariant="lr"
            hideToolbar
            showAdd={false}
            openColumnsSignal={columnsSignal}
            tableToolbar={tableToolbar}
            columns={columns}
            data={rows}
            loading={paged.loading}
            error={paged.error}
            onRefreshExternal={refreshList}
            rowActions={rowActions}
            exportFilename="hub-transfer"
            serverMode
            serverTotal={paged.total}
            serverHasMore={paged.hasMore}
            totalIsApproximate={paged.totalIsApproximate}
            serverPage={paged.page}
            onServerPageChange={paged.setPage}
            serverPageSize={paged.pageSize}
            onServerPageSizeChange={paged.setPageSize}
            onServerSearch={paged.setSearch}
            searchValue={paged.search}
          />
        </div>
      </div>

      {/* Receive at Hub */}
      <Modal open={receiveOpen} onClose={() => setReceiveOpen(false)} title="Receive at Hub" size="lg"
        footer={(
          <>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={confirmReceive} disabled={busy || !inboundSelected.size}>Confirm Hub Receipt</Button>
          </>
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Loading Sheet No" value={receiveForm.loadingSheetNo} onChange={(e) => setReceiveForm((f) => ({ ...f, loadingSheetNo: e.target.value }))} />
          <Input label="Vehicle No" value={receiveForm.vehicleNo} onChange={(e) => setReceiveForm((f) => ({ ...f, vehicleNo: e.target.value }))} />
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-600">Hub (Branch)</span>
            <select className="w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900" value={receiveForm.hubBranchId} onChange={(e) => setReceiveForm((f) => ({ ...f, hubBranchId: e.target.value }))}>
              <option value="">Select hub…</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>)}
            </select>
          </label>
          <Input label="Remarks" value={receiveForm.remarks} onChange={(e) => setReceiveForm((f) => ({ ...f, remarks: e.target.value }))} className="sm:col-span-2" />
        </div>
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={loadInboundPreview} disabled={busy}>
            <Warehouse className="h-3.5 w-3.5" /> Load Manifest / LR List
          </Button>
        </div>
        {inboundPreview && (
          <div className="mt-3 max-h-64 overflow-auto rounded border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="p-2" />
                  <th className="p-2">LR</th>
                  <th className="p-2">From → Final</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Pkgs</th>
                </tr>
              </thead>
              <tbody>
                {(inboundPreview.lines || []).map((l) => (
                  <tr key={l.lrNumber} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        disabled={!l.canReceive}
                        checked={inboundSelected.has(l.lrNumber)}
                        onChange={() => {
                          setInboundSelected((prev) => {
                            const next = new Set(prev)
                            if (next.has(l.lrNumber)) next.delete(l.lrNumber)
                            else next.add(l.lrNumber)
                            return next
                          })
                        }}
                      />
                    </td>
                    <td className="p-2 font-semibold">{l.lrNumber}</td>
                    <td className="p-2">{l.originalFrom} → {l.finalDestination}</td>
                    <td className="p-2">{l.status}</td>
                    <td className="p-2">{l.packages ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Unload */}
      <Modal open={unloadOpen} onClose={() => setUnloadOpen(false)} title="Unload at Hub"
        footer={(
          <>
            <Button variant="outline" onClick={() => setUnloadOpen(false)}>Cancel</Button>
            <Button onClick={confirmUnload} disabled={busy}>
              <PackageCheck className="h-3.5 w-3.5" /> Confirm Unload
            </Button>
          </>
        )}
      >
        <p className="mb-2 text-sm text-slate-600">Confirm unloading for {selected.size} selected LR(s). Status will become Available for Re-Manifest.</p>
        <ul className="max-h-48 list-inside list-disc overflow-auto text-sm">
          {selectedRows.map((r) => (
            <li key={r.lrNumber}>{r.lrNumber} — {r.packages ?? '—'} pkgs — {r.finalDestination} — {r.previousVehicle || '—'}</li>
          ))}
        </ul>
      </Modal>

      {/* Re-Manifest */}
      <Modal open={reManifestOpen} onClose={() => setReManifestOpen(false)} title="Create Re-Manifest" size="lg"
        footer={(
          <>
            <Button variant="outline" onClick={() => setReManifestOpen(false)}>Cancel</Button>
            <Button onClick={confirmReManifest} disabled={busy}>Create Re-Manifest</Button>
          </>
        )}
      >
        <p className="mb-2 text-sm text-slate-600">{selected.size} LR(s) selected. Original destinations are not changed.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">From Hub</span>
            <select className="w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900" value={reManifestForm.hubBranchId} onChange={(e) => setReManifestForm((f) => ({ ...f, hubBranchId: e.target.value }))}>
              <option value="">Select…</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <Input label="To Destination" value={reManifestForm.toDestination} onChange={(e) => setReManifestForm((f) => ({ ...f, toDestination: e.target.value }))} />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Vehicle</span>
            <select className="w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900" value={reManifestForm.vehicleId} onChange={(e) => setReManifestForm((f) => ({ ...f, vehicleId: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.number}{v.type ? ` (${v.type})` : ''}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Driver</span>
            <select className="w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900" value={reManifestForm.driverId} onChange={(e) => setReManifestForm((f) => ({ ...f, driverId: e.target.value }))}>
              <option value="">Select driver…</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}{d.phone ? ` — ${d.phone}` : ''}</option>)}
            </select>
          </label>
          <Input label="Remarks" value={reManifestForm.remarks} onChange={(e) => setReManifestForm((f) => ({ ...f, remarks: e.target.value }))} className="sm:col-span-2" />
        </div>
        <ul className="mt-3 max-h-40 list-inside list-disc overflow-auto text-xs">
          {selectedRows.map((r) => <li key={r.lrNumber}>{r.lrNumber} → {r.finalDestination}</li>)}
        </ul>
      </Modal>

      {/* Dispatch */}
      <Modal open={dispatchOpen} onClose={() => setDispatchOpen(false)} title="Dispatch from Hub"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
            {dispatchManifestId && (
              <Button variant="outline" onClick={() => printManifest(dispatchManifestId)}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            )}
            <Button onClick={confirmDispatch} disabled={busy}>
              <Send className="h-3.5 w-3.5" /> Dispatch
            </Button>
          </>
        )}
      >
        {dispatchManifest ? (
          <div className="space-y-2 text-sm">
            <p><strong>Manifest:</strong> {dispatchManifest.manifestNo}</p>
            <p><strong>From:</strong> {dispatchManifest.fromHubName} → <strong>{dispatchManifest.toDestination}</strong></p>
            <p><strong>Vehicle:</strong> {dispatchManifest.vehicleNumber || '—'} | <strong>Driver:</strong> {dispatchManifest.driverName || '—'}</p>
            <p><strong>LR count:</strong> {dispatchManifest.totalLr} | Pkgs: {dispatchManifest.totalPackages} | Wt: {dispatchManifest.totalWeight}</p>
            <ul className="max-h-40 list-inside list-disc overflow-auto text-xs">
              {(dispatchManifest.lines || []).map((l) => <li key={l.lrNumber}>{l.lrNumber}</li>)}
            </ul>
          </div>
        ) : <p className="text-sm">Loading…</p>}
      </Modal>

      {/* Movement History */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="LR Movement History" size="lg"
        footer={<Button onClick={() => setHistoryOpen(false)}>Close</Button>}
      >
        {history ? (
          <div className="space-y-3 text-sm">
            <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
              <p className="font-semibold">{history.lrNumber}</p>
              <p>Original route: {history.originalFrom} → {history.originalTo}</p>
              <p>Current: {history.currentLocation} — <Badge variant={statusBadgeVariant(history.currentStatus)}>{history.currentStatus}</Badge></p>
            </div>
            {(history.legs || []).map((leg) => (
              <div key={leg.id} className="rounded border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-semibold">Leg {leg.movementNo}: {leg.fromLocation} → {leg.toLocation}</p>
                <p className="text-xs text-slate-600">
                  Manifest: {leg.manifestNo || '—'} | Vehicle: {leg.vehicleNumber || '—'} | Status: {leg.status}
                </p>
                <p className="text-xs text-slate-600">
                  Dispatch: {leg.dispatchAt ? new Date(leg.dispatchAt).toLocaleString() : '—'}
                  {' | '}Received: {leg.hubReceivedAt ? new Date(leg.hubReceivedAt).toLocaleString() : '—'}
                  {' | '}Unload: {leg.unloadAt ? new Date(leg.unloadAt).toLocaleString() : '—'}
                </p>
              </div>
            ))}
            {history.legs?.some((l) => l.manifestId) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => printReceive(history.legs.find((l) => l.manifestId)?.manifestId)}
              >
                Print Hub Receiving
              </Button>
            )}
          </div>
        ) : <p>Loading…</p>}
      </Modal>
    </div>
  )
}
