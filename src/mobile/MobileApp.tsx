import "@/mobile/styles/mobile.css";
import { useState, useCallback } from "react";
import { GlassTabBar } from "@/mobile/components/GlassTabBar";
import { MeshGradientBackground } from "@/mobile/components/MeshGradientBackground";
import { HomePage } from "@/mobile/pages/HomePage";
import { ProvidersPage } from "@/mobile/pages/ProvidersPage";
import { AddProviderPage } from "@/mobile/pages/AddProviderPage";
import { SettingsPage } from "@/mobile/pages/SettingsPage";
import { ThemePage } from "@/mobile/pages/ThemePage";

type Page = "home" | "providers" | "settings" | "theme" | "add_provider";

export function MobileApp() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [themePageVisible, setThemePageVisible] = useState(false);

  const isSubPage = themePageVisible || currentPage === "add_provider";

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

  const renderPage = () => {
    if (themePageVisible) {
      return <ThemePage onBack={handleBackFromTheme} />;
    }
    switch (currentPage) {
      case "home": return <HomePage />;
      case "providers":
        return <ProvidersPage onAddProvider={() => setCurrentPage("add_provider")} />;
      case "settings": return <SettingsPage onNavigateToTheme={handleOpenTheme} />;
      case "add_provider":
        return <AddProviderPage onBack={() => setCurrentPage("providers")} />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="mobile-app relative flex flex-col h-dvh w-full overflow-hidden">
      <MeshGradientBackground />

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
