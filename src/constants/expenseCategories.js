/** Fallback when expensesApi.categories() is unavailable. */
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Fuel',
  'Toll',
  'Maintenance',
  'Salary',
  'Office Expense',
  'Hamali',
  'Detention',
  'Miscellaneous',
  'Other',
]

export async function loadExpenseCategories(expensesApi) {
  try {
    const res = await expensesApi.categories()
    const list = Array.isArray(res) ? res : (res?.items ?? res?.categories ?? [])
    const names = list.map((c) => (typeof c === 'string' ? c : c?.name || c?.category)).filter(Boolean)
    return names.length ? names : DEFAULT_EXPENSE_CATEGORIES
  } catch {
    return DEFAULT_EXPENSE_CATEGORIES
  }
}
