import "@/mobile/styles/mobile.css";
import { useState, useCallback } from "react";
import { GlassTabBar } from "@/mobile/components/GlassTabBar";
import { StatusHeader } from "@/mobile/components/StatusHeader";
import { MeshGradientBackground } from "@/mobile/components/MeshGradientBackground";
import { HomePage } from "@/mobile/pages/HomePage";
import { NodesPage } from "@/mobile/pages/NodesPage";
import { SettingsPage } from "@/mobile/pages/SettingsPage";
import { ThemePage } from "@/mobile/pages/ThemePage";

type Page = "home" | "nodes" | "settings" | "theme";

export function MobileApp() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [themePageVisible, setThemePageVisible] = useState(false);

  const isSubPage = themePageVisible;

  const handleNavigate = useCallback((page: string) => {
    setThemePageVisible(false);
    setCurrentPage(page as Page);
  }, []);

  const handleOpenTheme = useCallback(() => {
    setThemePageVisible(true);
  }, []);

  const handleBackFromTheme = useCallback(() => {
    setThemePageVisible(false);
  }, []);

  const getHeaderTitle = () => {
    if (themePageVisible) return "外观";
    switch (currentPage) {
      case "home": return undefined;
      case "nodes": return "节点管理";
      case "settings": return "设置";
      default: return undefined;
    }
  };

  const renderPage = () => {
    if (themePageVisible) {
      return <ThemePage onBack={handleBackFromTheme} />;
    }
    switch (currentPage) {
      case "home": return <HomePage />;
      case "nodes": return <NodesPage />;
      case "settings": return <SettingsPage onNavigateToTheme={handleOpenTheme} />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="mobile-app relative flex flex-col h-dvh w-full overflow-hidden">
      <MeshGradientBackground />

      <StatusHeader
        title={getHeaderTitle()}
        showBack={isSubPage}
        onBack={handleBackFromTheme}
      />

      <div className="flex-1 min-h-0 flex flex-col" style={{ animation: "page-enter 0.25s ease-out" }}>
        {renderPage()}
      </div>

      {!isSubPage && (
        <GlassTabBar
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
