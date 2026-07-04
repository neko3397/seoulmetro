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
    <section className="space-y-6 animate-fade-in-up">
      <div className="space-y-2 border-b border-slate-100 pb-4">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">교육영상</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className="premium-card group w-full flex flex-col items-start rounded-3xl p-6 text-left cursor-pointer border border-slate-100"
          >
            <div className="flex w-full items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-bold text-blue-600 tracking-wide uppercase">
                  {category.subtitle}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {category.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 font-normal">
                  {category.description}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100/50 rounded-full px-3 py-1 font-semibold text-xs">
                {videosByCategory[category.id]?.length || 0}개 영상
              </Badge>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
              <span>영상 목록 보기</span>
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
