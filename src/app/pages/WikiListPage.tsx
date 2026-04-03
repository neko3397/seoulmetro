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
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">위키문서</Badge>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">위키 문서</h2>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={wikiLoading}>
          {wikiLoading ? "불러오는 중..." : "새로고침"}
        </Button>
      </div>
      <div className="grid gap-4">
        {guides.map((guide) => (
          <button
            key={guide.id}
            type="button"
            onClick={() => onSelectGuide(guide)}
            className="rounded-[24px] border bg-white p-6 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
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
