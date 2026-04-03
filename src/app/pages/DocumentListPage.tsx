import { Badge } from "../../components/ui/badge";
import { GuideCategory, GuideDetail } from "../../types/content";
import { formatDateTime } from "../utils";

interface DocumentListPageProps {
  category: GuideCategory | null;
  guides: GuideDetail[];
  onSelectGuide: (guide: GuideDetail) => void;
}

export function DocumentListPage({ category, guides, onSelectGuide }: DocumentListPageProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">문서 목록</Badge>
        <h2 className="text-3xl font-bold text-slate-900">{category?.title || "문서"}</h2>
        <p className="text-slate-600">{category?.description || "카테고리에 속한 문서를 확인하세요."}</p>
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

      {guides.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-white px-6 py-12 text-center text-slate-500">
          등록된 문서가 없습니다.
        </div>
      ) : null}
    </div>
  );
}
