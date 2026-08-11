import { apiRequest } from './api'

let configCache = null
let loadPromise = null

export const printTemplateApi = {
  getAll: () => apiRequest('/print-templates'),
  save: (moduleCode, templateCode) =>
    apiRequest('/print-templates', { method: 'PUT', body: { moduleCode, templateCode } }),
  saveBulk: (configs) =>
    apiRequest('/print-templates/bulk', { method: 'PUT', body: { configs } }),
}

/** Load all module template selections (cached). */
export async function loadPrintTemplateConfig(force = false) {
  if (!force && configCache) return configCache
  if (!force && loadPromise) return loadPromise
  loadPromise = printTemplateApi.getAll()
    .then((res) => {
      configCache = res
      return res
    })
    .finally(() => { loadPromise = null })
  return loadPromise
}

export function invalidatePrintTemplateConfig() {
  configCache = null
}

/** Resolve selected template for a module (defaults to T1). */
export async function resolveTemplateCode(moduleCode) {
  const cfg = await loadPrintTemplateConfig()
  const row = cfg?.modules?.find((m) => m.moduleCode === moduleCode)
  const code = row?.templateCode ?? 'T1'
  return String(code).toUpperCase()
}

export function resolveTemplateCodeSync(moduleCode) {
  const row = configCache?.modules?.find((m) => m.moduleCode === moduleCode)
  return String(row?.templateCode ?? 'T1').toUpperCase()
}
