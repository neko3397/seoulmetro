import { ArrowLeft } from "lucide-react";
import logo from "../../assets/logo.png";
import { Button } from "../../components/ui/button";

interface AppHeaderProps {
  canGoBack: boolean;
  onBack: () => void;
}

export function AppHeader({ canGoBack, onBack }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white md:border-white/70 md:bg-white/85 md:backdrop-blur">
      <div className="app-shell-container container mx-auto flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          {canGoBack ? (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <img src={logo} alt="동대문승무사업소 불안제로" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-lg font-bold">동대문승무사업소 불안제로</h1>
          </div>
        </div>
      </div>
    </header>
  );
}
