import "@/mobile/styles/mobile.css";
import { useState, useCallback } from "react";
import { Plus, QrCode } from "lucide-react";
import { GlassTabBar } from "@/mobile/components/GlassTabBar";
import { MobileNavBar } from "@/mobile/components/MobileNavBar";
import { MeshGradientBackground } from "@/mobile/components/MeshGradientBackground";
import { HomePage } from "@/mobile/pages/HomePage";
import { ProvidersPage } from "@/mobile/pages/ProvidersPage";
import { AddProviderPage } from "@/mobile/pages/AddProviderPage";
import { SettingsPage } from "@/mobile/pages/SettingsPage";
import { ThemePage } from "@/mobile/pages/ThemePage";

type Page = "home" | "providers" | "settings" | "theme" | "add_provider";

// Shared icon-button style used in the nav bar
const NAV_BTN =
  "w-9 h-9 rounded-full bg-[var(--mg-glass-bg)] border border-[var(--mg-glass-border)] flex items-center justify-center text-[var(--mg-text-primary)] active:scale-90 transition-transform shadow-[var(--mg-glass-shadow)]";

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

  // ── NavBar config per page ──────────────────────────────────────
  const navConfig = (): { title: string; left?: React.ReactNode; right?: React.ReactNode } => {
    if (themePageVisible) {
      return {
        title: "外观",
        left: (
          <button
            type="button"
            className={NAV_BTN}
            aria-label="返回"
            onClick={handleBackFromTheme}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8L10 13" />
            </svg>
          </button>
        ),
      };
    }
    if (currentPage === "add_provider") {
      return {
        title: "添加订阅",
        left: (
          <button
            type="button"
            className={NAV_BTN}
            aria-label="返回"
            onClick={() => setCurrentPage("providers")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8L10 13" />
            </svg>
          </button>
        ),
      };
    }

    switch (currentPage) {
      case "home":
        return { title: "AureStream" };

      case "providers":
        return {
          title: "服务商",
          left: (
            <button
              type="button"
              className={NAV_BTN}
              aria-label="扫描二维码"
              onClick={() => {/* TODO: QR scan */}}
            >
              <QrCode className="w-[18px] h-[18px]" />
            </button>
          ),
          right: (
            <button
              type="button"
              className={NAV_BTN}
              aria-label="添加服务商"
              onClick={() => setCurrentPage("add_provider")}
            >
              <Plus className="w-[18px] h-[18px]" />
            </button>
          ),
        };

      case "settings":
        return { title: "设置" };

      default:
        return { title: "AureStream" };
    }
  };

  const { title, left, right } = navConfig();

  // ── Page content ────────────────────────────────────────────────
  const renderPage = () => {
    if (themePageVisible) {
      return <ThemePage />;
    }
    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "providers":
        return <ProvidersPage />;
      case "settings":
        return <SettingsPage onNavigateToTheme={handleOpenTheme} />;
      case "add_provider":
        return <AddProviderPage onBack={() => setCurrentPage("providers")} />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="mobile-app relative flex flex-col h-dvh w-full overflow-hidden">
      <MeshGradientBackground />

      <div className="flex-1 min-h-0 flex flex-col" style={{ animation: "page-enter 0.25s ease-out" }}>
        {/* Top nav bar — shown on all pages */}
        <MobileNavBar title={title} leftAction={left} rightAction={right} />

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
