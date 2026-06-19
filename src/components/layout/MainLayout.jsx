import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { PageTitleProvider } from '../../context/PageTitleContext'

export default function MainLayout() {
  return (
    <PageTitleProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3 lg:p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </PageTitleProvider>
  )
}
