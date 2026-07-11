import { useNavigate } from 'react-router-dom'
import ERPListPage from '../../components/ui/ERPListPage'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { hrApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { importTemplates } from '../../config/importTemplates'

import { employeeTotalPay } from '../../config/employmentNorms'

export default function EmployeeList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search, filter }) =>
      hrApi.employees(buildListParams({ page, pageSize, search, filter, filterKey: 'employmentType' })),
    [],
  )

  const columns = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'employeeType', label: 'Role' },
    { key: 'employmentType', label: 'Employment', render: (r) => <Badge variant="info">{r.employmentType ?? 'Permanent'}</Badge> },
    { key: 'departmentName', label: 'Department' },
    { key: 'designationName', label: 'Designation' },
    {
      key: 'salary',
      label: 'Total Salary',
      render: (r) => formatCurrency(employeeTotalPay(r)),
    },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  return (
    <ERPListPage
      onAdd={() => navigate('/hr/employees/new')}
      module="HR"
      title="Employees"
      searchPlaceholder="Name, code, department..."
      searchKeys={['name', 'employeeCode', 'departmentName', 'employeeType', 'employmentType']}
      filterOptions={['(All)', 'Permanent', 'Contract', 'Daily']}
      filterKey="employmentType"
      columns={columns}
      data={paged.items}
      loading={paged.loading}
      error={paged.error}
      onRefreshExternal={paged.refresh}
      sortKey="name"
      onRowClick={(r) => navigate(`/hr/employees/${r.id}`)}
      onEdit={(r) => navigate(`/hr/employees/${r.id}`)}
      onDelete={async (r) => {
        if (!window.confirm(`Delete employee ${r.name}?`)) return
        try {
          await hrApi.deleteEmployee(r.id)
          toast({ title: 'Deleted', type: 'success' })
          paged.refresh()
        } catch (err) {
          toast({ title: 'Delete failed', message: err.message, type: 'error' })
        }
      }}
      exportFilename="employees-export.csv"
      importTemplate={importTemplates.employees}
      serverMode
      serverTotal={paged.total}
      serverHasMore={paged.hasMore}
      totalIsApproximate={paged.totalIsApproximate}
      serverPage={paged.page}
      onServerPageChange={paged.setPage}
      serverPageSize={paged.pageSize}
      onServerPageSizeChange={paged.setPageSize}
      onServerSearch={paged.setSearch}
      onServerFilter={paged.setFilter}
      searchValue={paged.search}
    />
  )
}
