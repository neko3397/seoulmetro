import { GuideDetail } from "../../types/content";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { formatDateTime, markdownToPlainText } from "../utils";

interface WikiDetailPageProps {
  guide: GuideDetail | null;
}

export function WikiDetailPage({ guide }: WikiDetailPageProps) {
  if (!guide) return null;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>문서 목차</CardTitle>
          <CardDescription>{guide.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {guide.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                const target = document.getElementById(`guide-section-${section.id}`);
                target?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              style={{ paddingLeft: `${section.depth * 14 + 12}px` }}
            >
              {section.title}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">위키 상세</Badge>
          <h2 className="text-3xl font-bold text-slate-900">{guide.title}</h2>
          <p className="text-slate-600">{guide.description}</p>
          <p className="text-sm text-slate-500">{formatDateTime(guide.updatedAt)}</p>
        </div>

        {guide.sections.map((section) => (
          <Card key={section.id} id={`guide-section-${section.id}`}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                {markdownToPlainText(section.markdownContent)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
