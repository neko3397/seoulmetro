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
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-2 border-b border-slate-100 pb-4">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">{category?.title || "문서"}</h2>
      </div>

      <div className="grid gap-6">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onSelectPost(post)}
            className="premium-card rounded-3xl p-6 text-left border border-slate-100/80 cursor-pointer"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">문서</Badge>
              <span className="text-sm text-slate-500">{formatDateTime(post.updatedAt)}</span>
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">{post.title}</h3>
            <p className="mt-3 line-clamp-3 text-slate-600">{post.content}</p>
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
