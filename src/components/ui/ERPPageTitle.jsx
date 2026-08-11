import { useEffect } from 'react'
import { usePageTitle } from '../../context/PageTitleContext'

/**
 * Registers page heading + optional ERP mockup header (breadcrumb, shortcuts) in the top navbar.
 */
export default function ERPPageTitle({
  module,
  title,
  breadcrumb = null,
  shortcuts = null,
  headerStyle = 'erp',
  toolbar = null,
}) {
  const { setPageTitle, resetPageTitle } = usePageTitle()

  useEffect(() => {
    setPageTitle(module, title, { breadcrumb, shortcuts, headerStyle, toolbar })
    return () => resetPageTitle()
  }, [module, title, breadcrumb, shortcuts, headerStyle, toolbar, setPageTitle, resetPageTitle])

  return null
}
