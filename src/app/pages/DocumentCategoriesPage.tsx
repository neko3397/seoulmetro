import { ArrowLeft, BookOpen } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { GuideCategory } from "../../types/content";
import { primaryNavButtonTextStyle } from "../constants";

interface DocumentCategoriesPageProps {
  categories: GuideCategory[];
  documentCountByCategory: Record<string, number>;
  onSelectCategory: (categoryId: string) => void;
}

const FALLBACK_IMAGE = "https://via.placeholder.com/480x270/e2e8f0/0f172a?text=Document";

export function DocumentCategoriesPage({
  categories,
  documentCountByCategory,
  onSelectCategory,
}: DocumentCategoriesPageProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">문서</Badge>
        <h2 className="text-3xl font-bold text-slate-900">카테고리별 문서 탐색</h2>
        <p className="text-slate-600">교육영상과 같은 방식으로 문서를 카테고리별로 확인할 수 있습니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <Card
            key={category.id}
            className="overflow-hidden border-0 bg-white/90 shadow-lg shadow-slate-200/50 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <button type="button" onClick={() => onSelectCategory(category.id)} className="block w-full text-left">
              <div className="grid gap-0 md:grid-cols-[200px_1fr]">
                <div className="min-h-40 bg-slate-100">
                  <img
                    src={category.image || FALLBACK_IMAGE}
                    alt={category.title}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
                <div className="flex flex-col justify-between p-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-blue-700" style={primaryNavButtonTextStyle}>
                      {category.subtitle || "문서 카테고리"}
                    </p>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{category.title}</h3>
                    <p className="text-base leading-relaxed text-slate-600">{category.description}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Badge variant="outline">
                      <BookOpen className="mr-1 h-4 w-4" />
                      {documentCountByCategory[category.id] || 0}개 문서
                    </Badge>
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <span>문서 목록 보기</span>
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}
