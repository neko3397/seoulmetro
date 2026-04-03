import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import {
  LogOut,
  Menu,
  RefreshCcw,
  X,
} from "lucide-react";
import { UserProgressManagement } from "./UserProgressManagement";
import { VideoManagement } from "./VideoManagement";
import { CategoryManagement } from "./CategoryManagement";
import { AdminManagement } from "./AdminManagement";
import { AuthorizedEmployeeManagement } from "./AuthorizedEmployeeManagement";
import { CommunityManagement } from "./CommunityManagement";
import { GuideManagement } from "./GuideManagement";
import { AISettingsManagement } from "./AISettingsManagement";
import { OperationsOverview } from "./OperationsOverview";
import { PersonalizedRecommendationManagement } from "./PersonalizedRecommendationManagement";
import { useIsMobile } from "./ui/use-mobile";
import seoulMetroLogo from "../assets/logo.png";

interface AdminDashboardProps {
  admin: any;
  onLogout: () => void;
}

type AdminMenuId =
  | "overview"
  | "content"
  | "community"
  | "guides"
  | "ai"
  | "authorized-users"
  | "admins"
  | "user-progress";

interface MenuItem {
  id: AdminMenuId;
  label: string;
  section?: string;
}

const DASHBOARD_SIDEBAR_WIDTH = "17.5rem";
const DEFAULT_DASHBOARD_HEADER_HEIGHT = 73;
const MOBILE_SIDEBAR_ANIMATION_MS = 220;

export function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const isMobile = useIsMobile();
  const headerRef = useRef<HTMLElement | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeMenu, setActiveMenu] = useState<AdminMenuId>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768,
  );
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_DASHBOARD_HEADER_HEIGHT);
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false);

  const menuItems = useMemo<MenuItem[]>(
    () => [
      { id: "overview", label: "운영 개요" },
      { id: "content", label: "교육 콘텐츠" },
      { id: "community", label: "커뮤니티" },
      { id: "guides", label: "가이드북" },
      { id: "ai", label: "AI 챗봇" },
      { id: "authorized-users", label: "로그인 허용 사용자", section: "시스템 관리" },
      { id: "admins", label: "관리자 계정", section: "시스템 관리" },
      { id: "user-progress", label: "사용자 시청 현황", section: "시스템 관리" },
    ],
    [],
  );

  const primaryMenus = menuItems.filter((item) => !item.section);
  const systemMenus = menuItems.filter((item) => item.section === "시스템 관리");

  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const nextHeight = headerRef.current?.offsetHeight ?? DEFAULT_DASHBOARD_HEADER_HEIGHT;
      setHeaderHeight(nextHeight);
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileSidebarVisible(false);
      return;
    }

    if (isSidebarOpen) {
      setIsMobileSidebarVisible(true);
      return;
    }

    if (!isMobileSidebarVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsMobileSidebarVisible(false);
    }, MOBILE_SIDEBAR_ANIMATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isMobile, isSidebarOpen, isMobileSidebarVisible]);

  const handleUpdated = () => {
    setRefreshToken((token) => token + 1);
  };

  const handleSelectMenu = (menuId: AdminMenuId) => {
    setActiveMenu(menuId);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "overview":
        return <OperationsOverview refreshToken={refreshToken} />;
      case "content":
        return (
          <div className="space-y-6">
            <CategoryManagement onStatsUpdate={handleUpdated} />
            <VideoManagement onStatsUpdate={handleUpdated} />
            <PersonalizedRecommendationManagement onUpdated={handleUpdated} />
          </div>
        );
      case "community":
        return <CommunityManagement admin={admin} onUpdated={handleUpdated} />;
      case "guides":
        return <GuideManagement onUpdated={handleUpdated} />;
      case "ai":
        return <AISettingsManagement onUpdated={handleUpdated} />;
      case "authorized-users":
        return <AuthorizedEmployeeManagement onUpdated={handleUpdated} />;
      case "admins":
        return <AdminManagement currentAdmin={admin} />;
      case "user-progress":
        return <UserProgressManagement />;
      default:
        return null;
    }
  };

  const MenuButton = ({ item }: { item: MenuItem }) => (
    <button
      type="button"
      onClick={() => handleSelectMenu(item.id)}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
        activeMenu === item.id
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {item.label}
    </button>
  );

  const adminName = admin?.name || "관리자";
  const adminEmployeeId = admin?.employeeId || "정보 없음";

  const renderSidebar = (topPadding = 0) => (
    <div className="flex h-full min-h-full flex-col bg-white">
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-5" style={{ paddingTop: topPadding }}>
        <div className="space-y-2">
          {primaryMenus.map((item) => (
            <MenuButton key={item.id} item={item} />
          ))}
        </div>

        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold tracking-[0.16em] text-slate-400">시스템 관리</p>
          {systemMenus.map((item) => (
            <MenuButton key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 pb-6 text-slate-900">
      {isMobile && isMobileSidebarVisible && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 bg-slate-950/35 transition-opacity duration-200 md:hidden",
            isSidebarOpen ? "opacity-100" : "opacity-0",
          )}
          style={{ top: headerHeight }}
          onClick={() => setIsSidebarOpen(false)}
        >
          <div
            className={cn(
              "relative z-50 h-full w-[17.5rem] max-w-[85vw] overflow-y-auto border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out will-change-transform",
              isSidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {renderSidebar(16)}
          </div>
        </div>
      )}

      <header ref={headerRef} className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsSidebarOpen((open) => !open)}
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <img src={seoulMetroLogo} alt="서울교통공사" className="h-10 w-10 rounded-xl" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-900">
                관리자 운영 센터 &gt; {menuItems.find((item) => item.id === activeMenu)?.label}
              </h1>
              <p className="truncate text-sm text-slate-500">
                {adminName} ({adminEmployeeId})
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-stretch pt-4 sm:pt-5">
        {!isMobile && isSidebarOpen && (
          <>
            <div className="hidden shrink-0 md:block" style={{ width: DASHBOARD_SIDEBAR_WIDTH }} />
            <aside
              className="fixed left-0 z-30 hidden overflow-hidden border-r border-slate-200 bg-white md:block"
              style={{
                top: headerHeight,
                width: DASHBOARD_SIDEBAR_WIDTH,
                height: `calc(100vh - ${headerHeight}px)`,
              }}
            >
              {renderSidebar(16)}
            </aside>
          </>
        )}

        <div className="min-w-0 flex-1">
          <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:pb-8">
            <div className="min-w-0">{renderContent()}</div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <Button variant="outline" size="sm" onClick={handleUpdated}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
