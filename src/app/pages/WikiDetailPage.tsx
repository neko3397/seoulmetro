import { useEffect } from "react";
import { GuideDetail, ChatSource } from "../../types/content";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { MarkdownContent } from "../../components/MarkdownContent";
import { formatDateTime, extractHighlightText } from "../utils";

interface WikiDetailPageProps {
  guide: GuideDetail | null;
  highlightSource?: ChatSource | null;
}

export function WikiDetailPage({ guide, highlightSource }: WikiDetailPageProps) {
  if (!guide) return null;

  useEffect(() => {
    if (!guide || !highlightSource) return;

    // 1. sectionId가 지정되어 있다면 해당 섹션으로 스크롤
    if (highlightSource.sectionId) {
      const target = document.getElementById(`guide-section-${highlightSource.sectionId}`);
      if (target) {
        const timer = setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
        return () => clearTimeout(timer);
      }
    }

    // 2. sectionId가 없거나 매칭 실패 시, snippet 텍스트와 매칭되는 섹션을 찾아 스크롤
    if (highlightSource.snippet) {
      const cleanSnippet = extractHighlightText(highlightSource.snippet).replace(/\s+/g, "").toLowerCase();
      if (cleanSnippet.length >= 4) {
        for (const section of guide.sections) {
          const cleanContent = section.markdownContent.replace(/\s+/g, "").toLowerCase();
          if (cleanContent.includes(cleanSnippet) || cleanSnippet.includes(cleanContent.slice(0, 30))) {
            const target = document.getElementById(`guide-section-${section.id}`);
            if (target) {
              const timer = setTimeout(() => {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 200);
              return () => clearTimeout(timer);
            }
          }
        }
      }
    }
  }, [guide, highlightSource]);

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start animate-fade-in-up">
      <Card className="h-fit premium-card border-slate-100 lg:sticky lg:top-24">
        <CardHeader className="border-b border-slate-100 pb-5">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">문서 목차</CardTitle>
          <CardDescription className="text-sm text-slate-600">{guide.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-5">
          {guide.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                const target = document.getElementById(`guide-section-${section.id}`);
                target?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="group block w-full rounded-xl border border-transparent px-4 py-3 text-left text-base font-semibold text-slate-700 underline decoration-slate-300 decoration-2 underline-offset-4 transition hover:border-blue-200 hover:bg-white hover:text-blue-700 hover:decoration-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              style={{ paddingLeft: `${section.depth * 18 + 16}px` }}
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500/70 transition group-hover:scale-125 group-hover:bg-blue-600" />
                <span>{section.title}</span>
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6 rounded-[28px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-100/50 sm:p-8">
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">{guide.title}</h2>
          <p className="text-sm text-slate-500">{formatDateTime(guide.updatedAt)}</p>
        </div>

        {guide.sections.map((section) => {
          const isHighlighted = highlightSource && (
            section.id === highlightSource.sectionId ||
            (highlightSource.snippet && 
             section.markdownContent.replace(/\s+/g, "").toLowerCase().includes(
               extractHighlightText(highlightSource.snippet).replace(/\s+/g, "").toLowerCase().slice(0, 15)
             ))
          );

          return (
            <Card 
              key={section.id} 
              id={`guide-section-${section.id}`} 
              className={`scroll-mt-24 border-slate-200 shadow-none transition-all duration-500 ${
                isHighlighted 
                  ? "ring-2 ring-amber-500/80 bg-amber-50/5 shadow-md shadow-amber-500/5" 
                  : ""
              }`}
            >
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-2xl text-slate-900">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownContent 
                  value={section.markdownContent} 
                  highlightSource={isHighlighted ? highlightSource : null} 
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
