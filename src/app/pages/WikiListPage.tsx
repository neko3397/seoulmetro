import { GuideDetail } from "../../types/content";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { formatDateTime } from "../utils";

interface WikiListPageProps {
  guides: GuideDetail[];
  wikiLoading: boolean;
  onRefresh: () => void;
  onSelectGuide: (guide: GuideDetail) => void;
}

export function WikiListPage({ guides, wikiLoading, onRefresh, onSelectGuide }: WikiListPageProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">사내규정</h2>
          <p className="mt-2 text-slate-500 font-medium">회사의 주요 규정과 안전 지침, 비상 대책 업무 매뉴얼을 확인하세요.</p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={wikiLoading} className="rounded-full shadow-sm hover:bg-slate-50">
          {wikiLoading ? "불러오는 중..." : "새로고침"}
        </Button>
      </div>
      <div className="grid gap-6">
        {guides.map((guide) => (
          <button
            key={guide.id}
            type="button"
            onClick={() => onSelectGuide(guide)}
            className="premium-card rounded-3xl p-6 text-left border border-slate-100/80 cursor-pointer"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">v{guide.version}</Badge>
              <span className="text-sm text-slate-500">{formatDateTime(guide.updatedAt)}</span>
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">{guide.title}</h3>
            <p className="mt-3 line-clamp-3 text-slate-600">{guide.description}</p>
            <p className="mt-4 text-sm font-medium text-blue-700">문서 읽기</p>
          </button>
        ))}
      </div>
    </div>
  );
}
