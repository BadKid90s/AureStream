import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { Dashboard } from '@/pages/Dashboard'
import { Providers } from '@/pages/Providers'
import { Settings } from '@/pages/Settings'
import { useAppStore } from '@/stores/appStore'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const { theme } = useAppStore()

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
        return <Dashboard />
      case 'providers':
        return <Providers />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <MainContent>{renderPage()}</MainContent>
    </div>
  )
}

export default App
