import { GuideDetail } from "../../types/content";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { formatDateTime, markdownToHtml } from "../utils";

interface WikiDetailPageProps {
  guide: GuideDetail | null;
}

export function WikiDetailPage({ guide }: WikiDetailPageProps) {
  if (!guide) return null;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <Card className="h-fit border-slate-200 bg-slate-50/90 shadow-sm lg:sticky lg:top-24">
        <CardHeader className="border-b border-slate-200 pb-5">
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

      <div className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <Badge variant="secondary">사내규정</Badge>
          <h2 className="text-3xl font-bold text-slate-900">{guide.title}</h2>
          <p className="text-slate-600">{guide.description}</p>
          <p className="text-sm text-slate-500">{formatDateTime(guide.updatedAt)}</p>
        </div>

        {guide.sections.map((section) => (
          <Card key={section.id} id={`guide-section-${section.id}`} className="scroll-mt-24 border-slate-200 shadow-none">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-2xl text-slate-900">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="space-y-4 text-[15px] leading-8 text-slate-700 [&_a]:break-all [&_blockquote]:my-4 [&_code]:font-mono [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mt-5 [&_h4]:text-lg [&_h4]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_p]:my-4 [&_pre]:my-5 [&_ul]:my-4"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(section.markdownContent) }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
