import { ArrowLeft } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Video } from "../../types/video";
import { Category } from "../types";
import { primaryNavButtonClassName, primaryNavButtonTextStyle } from "../constants";

interface EducationVideosPageProps {
  categories: Category[];
  videosByCategory: Record<string, Video[]>;
  onSelectCategory: (categoryId: string) => void;
}

export function EducationVideosPage({
  categories,
  videosByCategory,
  onSelectCategory,
}: EducationVideosPageProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">교육영상</Badge>
        <h2 className="text-3xl font-bold text-slate-900">주제별 교육 영상 탐색</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className={`${primaryNavButtonClassName} group w-full flex-col items-start p-5`}
            style={primaryNavButtonTextStyle}
          >
            <div className="flex w-full items-start justify-between gap-4">
              <div className="min-w-0 space-y-0">
                <p className="text-sm font-medium" style={primaryNavButtonTextStyle}>
                  {category.subtitle}
                </p>
                <h3 className="text-xl font-semibold" style={primaryNavButtonTextStyle}>
                  {category.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-700" style={primaryNavButtonTextStyle}>
                  {category.description}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {videosByCategory[category.id]?.length || 0}개 영상
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium" style={primaryNavButtonTextStyle}>
              <span>영상 목록 보기</span>
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
