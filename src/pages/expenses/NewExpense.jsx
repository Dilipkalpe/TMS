import NewRecordForm from '../../components/forms/NewRecordForm'
import { expenseCategories } from '../../data/expenses'

export default function NewExpense() {
  return (
    <NewRecordForm
      module="Expenses"
      title="Add New Record"
      listPath="/expenses"
      saveLabel="Save Expense"
      fields={[
        { label: 'Date', type: 'date' },
        { label: 'Category', type: 'select', options: expenseCategories },
        { label: 'Description', placeholder: 'Expense description' },
        { label: 'Vehicle', placeholder: 'Vehicle number (optional)' },
        { label: 'Vendor', placeholder: 'Vendor name' },
        { label: 'Amount (₹)', type: 'number', placeholder: '0' },
        { label: 'Payment Mode', type: 'select', options: ['Cash', 'Bank Transfer', 'FASTag', 'Cheque'] },
      ]}
    />
  )
}
