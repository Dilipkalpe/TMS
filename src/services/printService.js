import { resolveTemplateCode } from './printTemplateService'
import { renderPrintNode } from './printTemplateRegistry'
import { moduleLabel } from '../config/printModules'
import { formatPrintDate } from '../utils/printUtils'

/**
 * Print a module list using the user's configured template.
 */
export async function printModuleList({
  moduleCode,
  company,
  print,
  toast,
  columns,
  rows,
  documentTitle,
  documentSubtitle,
  summary,
}) {
  if (!rows?.length) {
    toast?.({ title: 'Nothing to print', message: 'No records match current filters', type: 'warning' })
    return false
  }

  let templateCode = 'T1'
  try {
    templateCode = await resolveTemplateCode(moduleCode)
  } catch {
    /* fall back to T1 */
  }

  const node = renderPrintNode({
    moduleCode,
    templateCode,
    kind: 'list',
    company,
    columns,
    rows,
    documentTitle: documentTitle ?? moduleLabel(moduleCode),
    documentSubtitle: documentSubtitle ?? `${moduleLabel(moduleCode)} · Printed ${formatPrintDate(new Date())}`,
    summary,
  })

  print(node)
  return true
}

/**
 * Print a single document for a module using configured template.
 */
export async function printModuleDocument({
  moduleCode,
  company,
  print,
  documentData,
  documentTitle,
}) {
  let templateCode = 'T1'
  try {
    templateCode = await resolveTemplateCode(moduleCode)
  } catch {
    /* fall back to T1 */
  }

  const node = renderPrintNode({
    moduleCode,
    templateCode,
    kind: 'document',
    company,
    documentData,
    documentTitle,
  })

  print(node)
  return true
}

/**
 * Preview an individual document template (sample transport record).
 */
export async function previewModuleTemplate({
  moduleCode,
  templateCode,
  company,
  print,
}) {
  const node = renderPrintNode({
    moduleCode,
    templateCode,
    kind: 'document',
    company,
  })
  print(node)
}
