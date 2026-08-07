/**
 * Central registry for application keyboard shortcuts.
 * Single source of truth for help UI, sidebar, and hotkey dispatch.
 */

/** @typedef {'global' | 'navigation' | 'grid' | 'popup' | 'page'} ShortcutScope */

/**
 * @typedef {object} ShortcutDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {string[]} keys - normalized combos e.g. ['ctrl+s', 'f2']
 * @property {ShortcutScope} scope
 * @property {string} [path] - navigation target
 * @property {string} [action] - logical action id
 * @property {boolean} [tallyEnhanced] - extra useful in Tally mode
 * @property {boolean} [standardOnly] - only in standard mode
 */

/** @type {ShortcutDefinition[]} */
export const SHORTCUT_REGISTRY = [
  // Help
  { id: 'help', label: 'Keyboard Help', description: 'Show all shortcuts', keys: ['f1'], scope: 'global', action: 'help:open' },

  // Save & actions
  { id: 'save', label: 'Save', description: 'Save current document', keys: ['ctrl+s', 'f2'], scope: 'page', action: 'page:save', tallyEnhanced: true },
  { id: 'new', label: 'New', description: 'Create new record', keys: ['ctrl+n'], scope: 'page', action: 'page:new', tallyEnhanced: true },
  { id: 'print', label: 'Print', description: 'Print document', keys: ['ctrl+p'], scope: 'page', action: 'page:print' },
  { id: 'preview', label: 'Preview', description: 'Preview document', keys: ['f8'], scope: 'page', action: 'page:preview' },
  { id: 'cancel', label: 'Cancel / Close', description: 'Cancel, close popup, or clear', keys: ['escape'], scope: 'popup', action: 'popup:close' },

  // Search & lookup
  { id: 'search', label: 'Global Search', description: 'Open global search', keys: ['f3', 'ctrl+k'], scope: 'global', action: 'search:open', tallyEnhanced: true },
  { id: 'master-lookup', label: 'Master Lookup', description: 'Open lookup for focused field', keys: ['f4'], scope: 'form', action: 'lookup:open', tallyEnhanced: true },

  // Grid
  { id: 'grid-insert', label: 'Insert Row', description: 'Add new grid row', keys: ['f7'], scope: 'grid', action: 'grid:insert', tallyEnhanced: true },
  { id: 'grid-delete', label: 'Delete Row', description: 'Delete current grid row', keys: ['f6'], scope: 'grid', action: 'grid:delete', tallyEnhanced: true },
  { id: 'grid-duplicate', label: 'Duplicate Row', description: 'Duplicate current row', keys: ['ctrl+d'], scope: 'grid', action: 'grid:duplicate' },
  { id: 'undo', label: 'Undo', description: 'Undo last grid edit', keys: ['ctrl+z'], scope: 'grid', action: 'grid:undo' },
  { id: 'redo', label: 'Redo', description: 'Redo grid edit', keys: ['ctrl+y'], scope: 'grid', action: 'grid:redo' },

  // Navigation — Alt shortcuts
  { id: 'nav-lr', label: 'LR Entry', description: 'Open LR Entry', keys: ['alt+l'], scope: 'navigation', path: '/lr/entry' },
  { id: 'nav-trips', label: 'Trips', description: 'Open Trip Management', keys: ['alt+t'], scope: 'navigation', path: '/trips' },
  { id: 'nav-billing', label: 'Billing', description: 'Open Billing', keys: ['alt+b'], scope: 'navigation', path: '/accounting' },
  { id: 'nav-pod', label: 'POD', description: 'Open Delivery / POD', keys: ['alt+p'], scope: 'navigation', path: '/lr?status=delivered' },
  { id: 'nav-customers', label: 'Customers', description: 'Customer Master', keys: ['alt+c'], scope: 'navigation', path: '/customers' },
  { id: 'nav-vehicles', label: 'Vehicles', description: 'Vehicle Master', keys: ['alt+v'], scope: 'navigation', path: '/vehicles' },
  { id: 'nav-drivers', label: 'Drivers', description: 'Driver Master', keys: ['alt+d'], scope: 'navigation', path: '/masters/drivers' },
  { id: 'nav-invoice', label: 'Invoice', description: 'Freight Invoices', keys: ['alt+i'], scope: 'navigation', path: '/accounting/freight-invoices' },
  { id: 'nav-reports', label: 'Reports', description: 'Reports Hub', keys: ['alt+r', 'f11'], scope: 'navigation', path: '/reports' },
  { id: 'nav-settings', label: 'Settings', description: 'Application Settings', keys: ['alt+s'], scope: 'navigation', path: '/settings' },
  { id: 'nav-home', label: 'Dashboard', description: 'Go to Dashboard', keys: ['alt+h'], scope: 'navigation', path: '/' },

  // Legacy F-keys (backward compatible)
  { id: 'legacy-booking', label: 'New Booking', description: 'Create booking', keys: ['f6'], scope: 'navigation', path: '/bookings/new' },
  { id: 'legacy-loading', label: 'Loading Slip', description: 'Loading pending queue', keys: ['f10'], scope: 'navigation', path: '/lr?status=loading-pending' },
  { id: 'legacy-delivery', label: 'Delivery', description: 'Delivery queue', keys: ['f12'], scope: 'navigation', path: '/lr?status=delivered' },
  { id: 'legacy-vehicles', label: 'Vehicles', description: 'Vehicle list', keys: ['f9'], scope: 'navigation', path: '/vehicles' },

  // Tab navigation
  { id: 'tab-1', label: 'Tab 1', description: 'Switch to tab 1', keys: ['alt+1'], scope: 'global', action: 'tab:1' },
  { id: 'tab-2', label: 'Tab 2', description: 'Switch to tab 2', keys: ['alt+2'], scope: 'global', action: 'tab:2' },
  { id: 'tab-3', label: 'Tab 3', description: 'Switch to tab 3', keys: ['alt+3'], scope: 'global', action: 'tab:3' },
  { id: 'tab-4', label: 'Tab 4', description: 'Switch to tab 4', keys: ['alt+4'], scope: 'global', action: 'tab:4' },
  { id: 'tab-5', label: 'Tab 5', description: 'Switch to tab 5', keys: ['alt+5'], scope: 'global', action: 'tab:5' },
  { id: 'tab-6', label: 'Tab 6', description: 'Switch to tab 6', keys: ['alt+6'], scope: 'global', action: 'tab:6' },
  { id: 'tab-7', label: 'Tab 7', description: 'Switch to tab 7', keys: ['alt+7'], scope: 'global', action: 'tab:7' },
  { id: 'tab-8', label: 'Tab 8', description: 'Switch to tab 8', keys: ['alt+8'], scope: 'global', action: 'tab:8' },
  { id: 'tab-9', label: 'Tab 9', description: 'Switch to tab 9', keys: ['alt+9'], scope: 'global', action: 'tab:9' },

  // Focus navigation (Tally mode)
  { id: 'focus-home', label: 'First Field', description: 'Focus first editable field', keys: ['home'], scope: 'form', action: 'focus:first', tallyEnhanced: true },
  { id: 'focus-end', label: 'Last Field', description: 'Focus last editable field', keys: ['end'], scope: 'form', action: 'focus:last', tallyEnhanced: true },
]

/** Build map: normalized key combo -> definitions (may overlap; handler resolves priority) */
export function buildShortcutMap(registry = SHORTCUT_REGISTRY) {
  /** @type {Map<string, ShortcutDefinition[]>} */
  const map = new Map()
  for (const def of registry) {
    for (const key of def.keys) {
      const list = map.get(key) ?? []
      list.push(def)
      map.set(key, list)
    }
  }
  return map
}

export function shortcutsForHelp({ tallyMode = false } = {}) {
  return SHORTCUT_REGISTRY.filter((s) => {
    if (s.standardOnly && tallyMode) return false
    return true
  })
}

export function formatShortcutKeys(keys) {
  return keys.map((k) =>
    k.split('+').map((p) => {
      if (p === 'ctrl') return 'Ctrl'
      if (p === 'alt') return 'Alt'
      if (p === 'shift') return 'Shift'
      return p.toUpperCase()
    }).join(' + '),
  ).join(' / ')
}
