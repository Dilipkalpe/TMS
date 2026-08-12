/** System User Role Types (fallback). Live list comes from GET /api/user-role-types. */
export const USER_ROLE_TYPES = [
  {
    code: 'Admin',
    label: 'Admin',
    description: 'Full company access including users and role menus',
  },
  {
    code: 'Branch Manager',
    label: 'Branch Manager',
    description: 'Branch operations with limited settings',
  },
  {
    code: 'Accountant',
    label: 'Accountant',
    description: 'Accounts, finance reports, and customer/vendor masters',
  },
  {
    code: 'Operator',
    label: 'Operator',
    description: 'Shipment, delivery, billing, and day-to-day operations',
  },
]

export const USER_ROLE_TYPE_CODES = USER_ROLE_TYPES.map((r) => r.code)

/** @deprecated Prefer USER_ROLE_TYPE_CODES */
export const ROLE_MENU_ROLES = USER_ROLE_TYPE_CODES

/** Client-side rules mirrored by UserRoleTypeSelect / AddUserRoleTypeModal */
export function validateNewRoleTypeName(name, existingNames = USER_ROLE_TYPE_CODES) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return { ok: false, error: 'User Role Type is required.' }
  const dup = existingNames.some((n) => String(n).toLowerCase() === trimmed.toLowerCase())
  if (dup) return { ok: false, error: `User Role Type “${trimmed}” already exists.` }
  return { ok: true, name: trimmed }
}
