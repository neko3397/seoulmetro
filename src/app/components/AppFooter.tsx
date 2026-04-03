import { Home, LogOut, Settings, User } from "lucide-react";
import { Button } from "../../components/ui/button";

interface AppFooterProps {
  onGoHome: () => void;
  onGoMyPage: () => void;
  onGoAdmin: () => void;
  onLogout: () => void;
}

export function AppFooter({ onGoHome, onGoMyPage, onGoAdmin, onLogout }: AppFooterProps) {
  return (
    <footer className="mb-6 bg-white/80 pb-12 backdrop-blur">
      <div className="app-shell-container container mx-auto flex flex-wrap items-center justify-center gap-3 px-4 py-5">
        <Button variant="outline" size="sm" onClick={onGoHome}>
          <Home className="mr-2 h-4 w-4" />
          메인
        </Button>
        <Button variant="outline" size="sm" onClick={onGoMyPage}>
          <User className="mr-2 h-4 w-4" />
          내 페이지
        </Button>
        <Button variant="outline" size="sm" onClick={onGoAdmin}>
          <Settings className="mr-2 h-4 w-4" />
          관리자
        </Button>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </footer>
  );
}
