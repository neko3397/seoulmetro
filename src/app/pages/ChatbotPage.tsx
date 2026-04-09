import { AlertCircle, Bot, Clock3, FileText, Loader2, MessageSquareWarning, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { apiRequestJson } from "../../lib/api";
import type { ChatQueryResult, ChatSource } from "../../types/content";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";

interface ChatbotPageProps {
  currentUser: { employeeId?: string | null } | null;
  onSelectSource: (source: ChatSource) => void;
}

const STATUS_COPY: Record<ChatQueryResult["status"], { title: string; description: string }> = {
  success: {
    title: "답변이 준비되었습니다.",
    description: "아래 출처와 함께 내용을 확인하세요.",
  },
  no_context: {
    title: "근거가 부족합니다.",
    description: "검색된 문서만으로는 답변할 수 없어 추측 없이 응답을 멈췄습니다.",
  },
  disabled: {
    title: "챗봇이 비활성화되어 있습니다.",
    description: "관리자 설정에서 챗봇 사용 여부를 확인하세요.",
  },
  rate_limited: {
    title: "오늘 질문 가능 횟수를 모두 사용했습니다.",
    description: "한국시간 자정 이후 다시 질문할 수 있습니다.",
  },
  error: {
    title: "질문 처리 중 오류가 발생했습니다.",
    description: "잠시 후 다시 시도하세요.",
  },
};

function formatResetTime(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", { hour12: false });
}

export function ChatbotPage({ currentUser, onSelectSource }: ChatbotPageProps) {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ChatQueryResult | null>(null);
  const [requestError, setRequestError] = useState("");

  const statusCopy = useMemo(() => (result ? STATUS_COPY[result.status] : null), [result]);

  const handleSubmit = async () => {
    if (!question.trim() || submitting) return;

    try {
      setSubmitting(true);
      setRequestError("");
      const nextResult = await apiRequestJson<ChatQueryResult>("/chat/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          employeeId: currentUser?.employeeId || null,
        }),
      });
      setResult(nextResult);
    } catch (error) {
      console.error("Failed to query chatbot:", error);
      setResult(null);
      setRequestError(error instanceof Error ? error.message : "챗봇 응답 생성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary">AI 챗봇</Badge>
          <h2 className="text-3xl font-bold text-slate-900">사내규정과 공지 기반 질의응답</h2>
          <p className="text-slate-600">
            사내규정과 발행된 공지를 근거로만 답변합니다. 근거가 부족하면 추측하지 않고 답변을 멈춥니다.
          </p>
        </div>

        <Card className="border-slate-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bot className="h-5 w-5 text-blue-600" />
              질문하기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={5}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="예: 열차 고장 시 초기 보고 절차는 어떻게 되나요?"
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">질문 횟수는 한국시간 자정 기준으로 초기화됩니다.</p>
              <Button onClick={handleSubmit} disabled={submitting || !question.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    질문 중...
                  </>
                ) : (
                  "질문 보내기"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {requestError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>요청 실패</AlertTitle>
            <AlertDescription>{requestError}</AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <Alert className="border-slate-200 bg-white">
              {result.status === "success" ? (
                <Bot />
              ) : result.status === "no_context" ? (
                <SearchX />
              ) : result.status === "rate_limited" ? (
                <Clock3 />
              ) : (
                <MessageSquareWarning />
              )}
              <AlertTitle>{statusCopy?.title}</AlertTitle>
              <AlertDescription>{statusCopy?.description}</AlertDescription>
            </Alert>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">답변</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {result.answer}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge variant="outline">모델 {result.model}</Badge>
                  <Badge variant="outline">오늘 {result.usage.usedToday}/{result.usage.dailyLimit}회 사용</Badge>
                  <Badge variant="outline">남은 횟수 {result.usage.remainingToday}회</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">근거 문서</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.sources.length ? (
                  result.sources.map((source) => (
                    <button
                      key={`${source.sourceId}-${source.target.id}`}
                      type="button"
                      onClick={() => onSelectSource(source)}
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-white"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{source.sourceType === "guide" ? "사내규정" : "공지"}</Badge>
                        <span className="text-sm text-slate-500">관련도 {source.score.toFixed(3)}</span>
                      </div>
                      <p className="mt-3 font-semibold text-slate-900">{source.title}</p>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{source.snippet}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                    표시할 출처가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      <Card className="h-fit border-slate-200 bg-slate-50/90 shadow-sm lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4 text-blue-600" />
            사용 안내
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p>발행된 사내규정과 공지 문서만 검색합니다.</p>
          <p>근거가 부족한 질문은 답변하지 않습니다.</p>
          <p>
            오늘 남은 질문 횟수는 결과 카드에서 확인할 수 있으며, 다음 초기화 시각은 {formatResetTime(result?.usage.resetsAt || "")}
            입니다.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
