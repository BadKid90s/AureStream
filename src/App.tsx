import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { Dashboard } from '@/pages/Dashboard'
import { Providers } from '@/pages/Providers'
import { Settings } from '@/pages/Settings'
import { useAppStore, useProxyStore } from '@/stores/appStore'
import { Toaster } from '@/components/ui/sonner'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const { theme } = useAppStore()
  const loadProviders = useProxyStore((s) => s.loadProviders)
  const initAutoUpdateTimers = useProxyStore((s) => s.initAutoUpdateTimers)

  useEffect(() => {
    loadProviders().then(() => initAutoUpdateTimers())
  }, [loadProviders, initAutoUpdateTimers])

  const openProviders = () => setCurrentPage('providers')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard onOpenProviders={openProviders} />
        )
      case 'providers':
        return <Providers />
      case 'settings':
        return <Settings />
      default:
        return (
          <Dashboard onOpenProviders={openProviders} />
        )
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden gap-3 pr-3">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <MainContent>{renderPage()}</MainContent>
      <Toaster richColors />
    </div>
  )
}

export default App
