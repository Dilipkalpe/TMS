/** Shared UOM options (no UOM master table). */
export const UOM_OPTIONS = ['Nos', 'Kg', 'MT', 'Bags', 'Boxes', 'Litre', 'CFT', 'Trip', 'Other']

export const UOM_SELECT_OPTIONS = UOM_OPTIONS.map((u) => ({ value: u, label: u }))
