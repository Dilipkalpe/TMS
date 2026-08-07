import ERPContentPage from '../../components/ui/ERPContentPage'
import LrListPageContent from '../../components/lr/LrListPageContent'

export default function LrListPage() {
  return (
    <ERPContentPage module="LR" title="LR List" fillViewport>
      <LrListPageContent />
    </ERPContentPage>
  )
}
