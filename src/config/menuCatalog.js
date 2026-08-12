import { navigation } from './navigation'
import { accountingCards } from './accountingHub'
import { shipmentManagementCards } from './shipmentManagementHub'
import { deliveryManagementCards } from './deliveryManagementHub'
import { operationsCards } from './operationsHub'
import { reportCards } from './reportsHub'
import { mastersCards } from './mastersHub'
import { expensesCards } from './expensesHub'
import { hrCards, payrollCards } from './hrPayrollHub'
import { settingsCards } from './settingsHub'
import { USER_ROLE_TYPE_CODES } from './userRoleTypes'

/** Admin cannot hide these (prevents lockout). */
export const ADMIN_LOCKED_MENU_KEYS = ['/settings', '/settings/users', '/settings/role-menus']

export const ROLE_MENU_ROLES = USER_ROLE_TYPE_CODES

export { USER_ROLE_TYPES, USER_ROLE_TYPE_CODES } from './userRoleTypes'

/** Hub card group → sidebar parent path. */
export const HUB_GROUP_PARENT = {
  'Shipment hub': '/shipment-management',
  'Delivery hub': '/delivery-management',
  'Operations hub': '/operations',
  'Accounts hub': '/accounting',
  'Reports hub': '/reports',
  'Masters hub': '/masters',
  'Expenses hub': '/expenses',
  'HR & Payroll hub': '/hr',
  'Settings hub': '/settings',
}

/**
 * Flat menu catalog for role show/hide UI.
 * Keys match backend RoleMenuService catalog paths.
 */
export function buildMenuCatalog() {
  const items = []
  const seen = new Set()

  const add = (key, label, group) => {
    if (!key || seen.has(key)) return
    seen.add(key)
    items.push({ key, label, group })
  }

  for (const item of navigation) {
    add(item.path, item.title, 'Sidebar')
  }

  const groups = [
    [shipmentManagementCards, 'Shipment hub'],
    [deliveryManagementCards, 'Delivery hub'],
    [operationsCards, 'Operations hub'],
    [accountingCards, 'Accounts hub'],
    [reportCards, 'Reports hub'],
    [mastersCards, 'Masters hub'],
    [expensesCards, 'Expenses hub'],
    [hrCards, 'HR & Payroll hub'],
    [payrollCards, 'HR & Payroll hub'],
    [settingsCards, 'Settings hub'],
  ]

  for (const [cards, group] of groups) {
    for (const card of cards || []) {
      add(card.path, card.title, group)
    }
  }

  // Ensure Role menus card exists even before settingsHub update is imported elsewhere
  add('/settings/role-menus', 'Role menus', 'Settings hub')

  return items
}

let _catalogCache = null
function catalog() {
  if (!_catalogCache) _catalogCache = buildMenuCatalog()
  return _catalogCache
}

/** Lowercased hub card paths (not sidebar roots). */
export function getHubCardKeySet() {
  return new Set(
    catalog()
      .filter((i) => i.group !== 'Sidebar')
      .map((i) => i.key.toLowerCase()),
  )
}

/** Sidebar parent → child hub card paths (lowercase). */
export function getSidebarChildrenMap() {
  const map = new Map()
  for (const item of catalog()) {
    if (item.group === 'Sidebar') continue
    const parent = HUB_GROUP_PARENT[item.group]
    if (!parent) continue
    const p = parent.toLowerCase()
    if (!map.has(p)) map.set(p, [])
    map.get(p).push(item.key.toLowerCase())
  }
  return map
}

export function groupCatalog(items = buildMenuCatalog()) {
  const map = new Map()
  for (const item of items) {
    if (!map.has(item.group)) map.set(item.group, [])
    map.get(item.group).push(item)
  }
  return [...map.entries()].map(([group, rows]) => ({ group, rows }))
}

function norm(path) {
  if (!path) return '/'
  return String(path).toLowerCase()
}

/** True if path is allowed by menuKeys (null/undefined = allow all / legacy). Case-insensitive. */
export function canAccessMenuKey(path, menuKeys) {
  if (!menuKeys || !Array.isArray(menuKeys)) return true
  if (menuKeys.length === 0) return false
  const p = norm(path)
  for (const key of menuKeys) {
    if (!key) continue
    const k = norm(key)
    if (k === '/') {
      if (p === '/' || p === '') return true
      continue
    }
    if (p === k || p.startsWith(`${k}/`)) return true
  }
  return false
}

function hubKeyCoversPath(hubKey, path) {
  const hk = norm(hubKey)
  const p = norm(path)
  if (p === hk || p.startsWith(`${hk}/`)) return true
  // /operations/in-transit/list covers /operations/in-transit/*
  if (hk.endsWith('/list')) {
    const folder = hk.slice(0, -'/list'.length)
    if (folder && (p === folder || p.startsWith(`${folder}/`))) return true
  }
  return false
}

/**
 * Role-menu gate with hub-card granularity:
 * - Hub cards require their exact key in menuKeys
 * - Sidebar parent is allowed if itself is on OR any of its hub children are on
 * - Deep routes under a hub module require that hub card key (not sibling inheritance)
 */
export function hasRoleMenuAccess(path, menuKeys, navItems = navigation) {
  if (!menuKeys || !Array.isArray(menuKeys)) return true
  if (menuKeys.length === 0) return false

  const p = norm(path)
  const keySet = new Set(menuKeys.map(norm).filter(Boolean))
  const hubKeys = getHubCardKeySet()
  const childrenMap = getSidebarChildrenMap()

  const parentEffectivelyOn = (parentPath) => {
    const parent = norm(parentPath)
    if (keySet.has(parent)) return true
    const kids = childrenMap.get(parent) || []
    return kids.some((c) => keySet.has(c))
  }

  // Exact hub card — must be explicitly allowed (do not inherit from sidebar parent alone)
  if (hubKeys.has(p)) {
    return keySet.has(p)
  }

  // Sidebar root — explicit or any child hub card
  if (childrenMap.has(p) || navItems.some((item) => norm(item.path) === p)) {
    if (keySet.has(p)) return true
    if (childrenMap.has(p) && parentEffectivelyOn(p)) return true
  }

  // Deep route owned by one or more hub cards → require at least one covering card key
  const coveringHubKeys = [...hubKeys].filter((hk) => hubKeyCoversPath(hk, p))
  if (coveringHubKeys.length > 0) {
    return coveringHubKeys.some((hk) => keySet.has(hk))
  }

  // Prefix match against allowed keys (deep links under an allowed key)
  if (canAccessMenuKey(path, menuKeys)) return true

  // Leftover deep routes under a visible sidebar section (uncategorized paths only)
  for (const item of navItems) {
    if (!parentEffectivelyOn(item.path)) continue
    const prefixes = item.matchPrefixes?.length
      ? item.matchPrefixes
      : (item.matchPrefix ? [item.matchPrefix] : [item.path])
    const excludes = [
      ...(item.excludePrefix ? [item.excludePrefix] : []),
      ...(item.excludePrefixes || []),
    ]
    if (excludes.some((prefix) => p === norm(prefix) || p.startsWith(`${norm(prefix)}/`))) {
      continue
    }
    if (prefixes.some((prefix) => {
      const pre = norm(prefix)
      return p === pre || p.startsWith(`${pre}/`) || p === norm(item.path)
    })) {
      return true
    }
  }

  return false
}
