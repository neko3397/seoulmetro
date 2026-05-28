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

export function DocumentCategoriesPage({
  categories,
  documentCountByCategory,
  onSelectCategory,
}: DocumentCategoriesPageProps) {
  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="space-y-2 border-b border-slate-100 pb-4">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">업무문서</h2>
        <p className="text-slate-500 font-medium">필요한 사내 문서를 카테고리별로 확인하고 학습할 수 있습니다.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((category) => (
          <Card
            key={category.id}
            className="overflow-hidden border-0 premium-card"
          >
            <button type="button" onClick={() => onSelectCategory(category.id)} className="block w-full text-left">
              <div className="flex flex-col justify-between p-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-blue-700" style={primaryNavButtonTextStyle}>
                    문서 카테고리
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{category.title}</h3>
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
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}
