import { AlertCircle, Bot, Clock3, Loader2, MessageSquareWarning, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiBase, apiRequestJson, authHeaders } from "../../lib/api";
import { normalizeChatHistoryEntries, normalizeChatQueryResult } from "../../lib/chat";
import type { ChatHistoryEntry, ChatQueryResult, ChatSource, GuideCategory } from "../../types/content";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { MarkdownContent } from "../../components/MarkdownContent";
import { Separator } from "../../components/ui/separator";
import { Textarea } from "../../components/ui/textarea";

interface ChatbotPageProps {
  currentUser: { employeeId?: string | null } | null;
  onSelectSource: (source: ChatSource) => void;
}

const STATUS_COPY: Record<ChatQueryResult["status"], { title: string; description: string }> = {
  success: {
    title: "답변이 준비되었습니다.",
    description: "아래 내용을 확인하세요.",
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
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

export function ChatbotPage({ currentUser, onSelectSource: _onSelectSource }: ChatbotPageProps) {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ChatQueryResult | null>(null);
  const [requestError, setRequestError] = useState("");
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const statusCopy = useMemo(() => (result ? STATUS_COPY[result.status] : null), [result]);
  const loadHistory = async () => {
    if (!currentUser?.employeeId) {
      setHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      const response = await apiRequestJson<{ history?: unknown[] }>(
        `/chat/history?employeeId=${encodeURIComponent(currentUser.employeeId)}`,
      );
      setHistory(normalizeChatHistoryEntries(response.history));
    } catch (error) {
      console.error("Failed to load chat history:", error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiRequestJson<{ categories?: GuideCategory[] }>("/document-categories");
      setCategories(response.categories || []);
    } catch (error) {
      console.error("Failed to load document categories:", error);
    }
  };

  useEffect(() => {
    void loadHistory();
    void loadCategories();
  }, [currentUser?.employeeId]);

  const handleSubmit = async () => {
    if (!question.trim() || submitting) return;

    try {
      setSubmitting(true);
      setRequestError("");
      setResult(null);

      const response = await fetch(`${apiBase}/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          question: question.trim(),
          employeeId: currentUser?.employeeId || null,
          stream: true,
          categoryId: selectedCategoryId || null, // 카테고리 필터 전송
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API ${response.status} 오류가 발생했습니다.`);
      }

      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes("application/json")) {
        const jsonResult = await response.json();
        setResult(normalizeChatQueryResult(jsonResult));
        await loadHistory();
        return;
      }

      // Streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("응답 스트림을 읽을 수 없습니다.");

      const decoder = new TextDecoder();
      let accumulatedAnswer = "";
      
      // 초기 상태 설정
      setResult(normalizeChatQueryResult({
        status: "success",
        answer: "",
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // JSON 구분자 \u241F 체크
        if (chunk.includes("\u241F")) {
          const parts = chunk.split("\u241F");
          // \u241F 이전은 텍스트 청크일 수 있음
          if (parts[0]) {
            accumulatedAnswer += parts[0];
          }
          
          // \u241F 이후는 JSON 메타데이터
          const jsonPart = parts.slice(1).join("\u241F");
          if (jsonPart) {
            try {
              const metadata = JSON.parse(jsonPart);
              setResult(normalizeChatQueryResult({
                ...metadata,
                answer: accumulatedAnswer, // 답변은 누적된 것 유지
              }));
            } catch (e) {
              console.error("Failed to parse final metadata:", e, jsonPart);
              // 메타데이터 파싱 실패해도 지금까지의 답변은 유지
              setResult(prev => prev ? { ...prev, answer: accumulatedAnswer } : null);
            }
          } else {
            setResult(prev => prev ? { ...prev, answer: accumulatedAnswer } : null);
          }
        } else {
          accumulatedAnswer += chunk;
          setResult(prev => prev ? { ...prev, answer: accumulatedAnswer } : null);
        }
      }

      await loadHistory();
    } catch (error) {
      console.error("Failed to query chatbot:", error);
      setResult(null);
      setRequestError(error instanceof Error ? error.message : "챗봇 응답 생성 중 오류가 발생했습니다.");
      await loadHistory();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px] animate-fade-in-up">
      <div className="space-y-6">
        <div className="space-y-2 border-b border-slate-100 pb-4">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">AI 챗봇</h2>
          <p className="text-slate-500 font-medium">사내규정과 중요 업무 공지사항을 기반으로 신속하고 정확한 실시간 질의응답을 제공합니다.</p>
        </div>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bot className="h-5 w-5 text-blue-600" />
              질문하기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.length > 0 ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">검색 범위 제한</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId("")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 border ${
                      selectedCategoryId === ""
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    전체 문서
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 border ${
                        selectedCategoryId === category.id
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {category.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

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
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm">
                  <div className="border-b border-slate-100 bg-[linear-gradient(90deg,#eff6ff_0%,#f8fafc_100%)] px-5 py-3 text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    Markdown Response
                  </div>
                  <div className="p-5 sm:p-6">
                    <MarkdownContent value={result.answer} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge variant="outline">모델 {result.model}</Badge>
                  <Badge variant="outline">오늘 {result.usage.usedToday}/{result.usage.dailyLimit}회 사용</Badge>
                  <Badge variant="outline">남은 횟수 {result.usage.remainingToday}회</Badge>
                  <Badge variant="outline">초기화 시간 {formatResetTime(result.usage.resetsAt)}</Badge>
                </div>
              </CardContent>
            </Card>

          </div>
        ) : null}

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">과거 채팅 기록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {historyLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                기록을 불러오는 중입니다.
              </div>
            ) : history.length ? (
              history.map((entry) => (
                <div key={entry.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Badge variant="outline">{entry.status}</Badge>
                    <Badge variant="outline">모델 {entry.model}</Badge>
                    <span>{formatResetTime(entry.createdAt)}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Question</p>
                    <p className="text-sm leading-7 text-slate-800">{entry.question}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Answer</p>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <MarkdownContent value={entry.answer} compact />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                아직 저장된 채팅 기록이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
    </div>
    </section>
  );
}
