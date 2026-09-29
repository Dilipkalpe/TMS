import { useState } from 'react'
import NewRecordForm from '../../components/forms/NewRecordForm'
import ExpenseAttachmentField from '../../components/expenses/ExpenseAttachmentField'
import { expensesApi } from '../../services/api'

export default function NewExpense() {
  const [pendingFiles, setPendingFiles] = useState([])

  return (
    <NewRecordForm
      module="Expenses"
      title="Add New Record"
      listPath="/expenses/management"
      saveLabel="Save Expense"
      onAfterReset={() => setPendingFiles([])}
      onSubmit={async (form) => {
        const created = await expensesApi.create({
          date: form.date,
          category: form.category,
          description: form.description,
          vehicle: form.vehicle,
          vendor: form.vendor,
          amount: Number(form.amount) || 0,
          paymentMode: form.paymentmode,
          status: 'Approved',
        })
        if (created?.id && pendingFiles.length) {
          for (const file of pendingFiles) {
            await expensesApi.uploadAttachment(created.id, file)
          }
        }
        setPendingFiles([])
        return created
      }}
      fields={[
        { name: 'date', label: 'Expense Date', type: 'date', defaultValue: new Date().toISOString().slice(0, 10) },
        { name: 'category', label: 'Category', type: 'select', options: ['Fuel', 'Toll', 'Maintenance', 'Salary', 'Office Expense', 'Miscellaneous'] },
        { name: 'description', label: 'Description', placeholder: 'Expense details' },
        { name: 'vehicle', label: 'Vehicle', placeholder: 'MH-12-AB-1234' },
        { name: 'vendor', label: 'Vendor', placeholder: 'Vendor name' },
        { name: 'amount', label: 'Amount (₹)', type: 'number', placeholder: '0' },
        { name: 'paymentmode', label: 'Payment Mode', type: 'select', options: ['Cash', 'Bank Transfer', 'FASTag', 'UPI'] },
      ]}
    >
      <ExpenseAttachmentField
        pendingFiles={pendingFiles}
        onPendingChange={setPendingFiles}
      />
    </NewRecordForm>
  )
}
