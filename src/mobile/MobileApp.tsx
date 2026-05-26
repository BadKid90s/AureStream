import { useState, useEffect } from 'react';
import { BottomTabBar } from './components/BottomTabBar';
import { HomePage } from './pages/HomePage';
import { NodesPage } from './pages/NodesPage';
import { DataPage } from './pages/DataPage';
import { ProfilePage } from './pages/ProfilePage';
import { useAppStore, useProxyStore } from '@/stores/appStore';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { MobilePage } from './components/BottomTabBar';
import './mobile.css';

export function MobileApp() {
  const [page, setPage] = useState<MobilePage>('home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await Promise.allSettled([
        useAppStore.getState().loadSettings(),
        useProxyStore.getState().loadCache(),
      ]);
      applyTheme(useAppStore.getState().theme);
      await useProxyStore.getState().loadProviders();
      useProxyStore.getState().initAutoUpdateTimers();
      setLoading(false);
    };
    init();
  }, []);

  return (
    <>
      <div className="mob-bg fixed inset-0 flex flex-col overflow-hidden z-50">
        <div className="relative flex-1 flex flex-col min-h-0">
          {page === 'home' && <HomePage onNavigate={setPage} />}
          {page === 'nodes' && <NodesPage />}
          {page === 'data' && <DataPage />}
          {page === 'profile' && <ProfilePage />}
        </div>
        <BottomTabBar currentPage={page} onNavigate={setPage} />
      </div>
      <LoadingScreen visible={loading} />
    </>
  );
}

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  } else if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
