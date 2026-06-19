import { useEffect } from 'react'
import { usePageTitle } from '../../context/PageTitleContext'

/** Registers page heading in the top navbar; does not render in-page. */
export default function ERPPageTitle({ module, title }) {
  const { setPageTitle } = usePageTitle()

  useEffect(() => {
    setPageTitle(module, title)
  }, [module, title, setPageTitle])

  return null
}
