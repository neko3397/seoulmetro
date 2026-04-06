import { Badge } from "../../components/ui/badge";
import { CommunityPost, GuideCategory } from "../../types/content";
import { formatDateTime } from "../utils";

interface DocumentListPageProps {
  category: GuideCategory | null;
  posts: CommunityPost[];
  onSelectPost: (post: CommunityPost) => void;
}

export function DocumentListPage({ category, posts, onSelectPost }: DocumentListPageProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">문서 목록</Badge>
        <h2 className="text-3xl font-bold text-slate-900">{category?.title || "문서"}</h2>
        <p className="text-slate-600">카테고리에 속한 문서를 확인하세요.</p>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onSelectPost(post)}
            className="rounded-[24px] border bg-white p-6 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">문서</Badge>
              <span className="text-sm text-slate-500">{formatDateTime(post.updatedAt)}</span>
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">{post.title}</h3>
            <p className="mt-3 line-clamp-3 text-slate-600">{post.summary || post.content}</p>
            <p className="mt-4 text-sm font-medium text-blue-700">문서 읽기</p>
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-white px-6 py-12 text-center text-slate-500">
          등록된 문서가 없습니다.
        </div>
      ) : null}
    </div>
  );
}
