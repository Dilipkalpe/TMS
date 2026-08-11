import { Navigate } from 'react-router-dom'

/** Payroll hub merged into HR & Payroll at /hr */
export default function PayrollHub() {
  return <Navigate to="/hr" replace />
}
