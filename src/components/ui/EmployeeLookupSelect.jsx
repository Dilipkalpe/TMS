import { useCallback } from 'react'
import LookupSelect from './LookupSelect'
import { hrApi, unwrapList } from '../../services/api'

/**
 * Employee picker for forms that store employeeId (UUID).
 */
export default function EmployeeLookupSelect({
  label = 'Employee',
  employeeId = '',
  employees = [],
  employeeType,
  onEmployeeChange,
  onEmployeesRefresh,
  className = '',
  placeholder = 'Search employee…',
}) {
  const selectedName = employees.find((e) => e.id === employeeId)?.name ?? ''

  const refreshAndResolve = useCallback(async (name, createdId) => {
    let list = employees
    if (onEmployeesRefresh) {
      list = await onEmployeesRefresh()
    } else {
      const res = await hrApi.employees({ search: name, pageSize: 20, employeeType })
      list = unwrapList(res)
    }
    const match = list.find((e) =>
      (createdId && e.id === createdId)
      || e.name?.toLowerCase() === name.toLowerCase(),
    )
    onEmployeeChange?.(match?.id ?? '', match?.name ?? name)
    return list
  }, [employees, employeeType, onEmployeeChange, onEmployeesRefresh])

  return (
    <LookupSelect
      label={label}
      type="employees"
      employeeType={employeeType}
      className={className}
      placeholder={placeholder}
      value={selectedName}
      onChange={(name) => {
        const match = employees.find((e) => e.name?.toLowerCase() === name.toLowerCase())
        onEmployeeChange?.(match?.id ?? '', name)
      }}
      onRecordCreated={async (result) => {
        await refreshAndResolve(result.label, result.id)
      }}
    />
  )
}
