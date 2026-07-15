import { AlertCircle, Bot, Clock3, Loader2, MessageSquareWarning, SearchX, Send, Info } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiBase, apiRequestJson, authHeaders } from "../../lib/api";
import { normalizeChatHistoryEntries, normalizeChatQueryResult } from "../../lib/chat";
import type { ChatHistoryEntry, ChatQueryResult, ChatSource } from "../../types/content";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { MarkdownContent } from "../../components/MarkdownContent";
import { Separator } from "../../components/ui/separator";
import { Textarea } from "../../components/ui/textarea";
import { Progress } from "../../components/ui/progress";

interface ChatbotPageProps {
  currentUser: { employeeId?: string | null } | null;
  onSelectSource: (source: ChatSource) => void;
}

const STATUS_COPY: Record<ChatQueryResult["status"], { title: string; description: string }> = {
  success: {
    title: "답변 준비 완료",
    description: "아래 답변을 참고해 주세요.",
  },
  no_context: {
    title: "근거 문서 부족",
    description: "검색된 규정 문서만으로는 부정확할 수 있어 답변을 생성하지 않았습니다.",
  },
  disabled: {
    title: "챗봇 비활성화",
    description: "관리자 설정에서 챗봇 사용 여부를 확인하세요.",
  },
  rate_limited: {
    title: "질문 횟수 초과",
    description: "오늘의 질문 가능 횟수를 모두 사용했습니다. 자정 이후 초기화됩니다.",
  },
  error: {
    title: "질문 처리 오류",
    description: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  },
};

function formatResetTime(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

export function ChatbotPage({ currentUser, onSelectSource: _onSelectSource }: ChatbotPageProps) {
  const [question, setQuestion] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ChatQueryResult | null>(null);
  const [requestError, setRequestError] = useState("");
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    void loadHistory();
  }, [currentUser?.employeeId]);

  // 스크롤 하단 이동 로직
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, result?.answer, submitting]);

  const handleSubmit = async () => {
    if (!question.trim() || submitting) return;

    const currentQuestion = question.trim();
    setActiveQuestion(currentQuestion);
    setQuestion("");
    setResult(null);
    setRequestError("");

    try {
      setSubmitting(true);

      const response = await fetch(`${apiBase}/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          question: currentQuestion,
          employeeId: currentUser?.employeeId || null,
          stream: true,
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
      let streamBuffer = "";
      
      setResult(normalizeChatQueryResult({
        status: "success",
        answer: "",
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamBuffer += chunk;
        
        if (streamBuffer.includes("\u241F")) {
          const parts = streamBuffer.split("\u241F");
          const answerPart = parts[0];
          const jsonPart = parts.slice(1).join("\u241F");
          if (jsonPart) {
            try {
              const metadata = JSON.parse(jsonPart);
              setResult(normalizeChatQueryResult({
                ...metadata,
                answer: answerPart,
              }));
            } catch (e) {
              console.error("Failed to parse final metadata:", e, jsonPart);
              setResult(prev => prev ? { ...prev, answer: answerPart } : null);
            }
          } else {
            setResult(prev => prev ? { ...prev, answer: answerPart } : null);
          }
        } else {
          setResult(prev => prev ? { ...prev, answer: streamBuffer } : null);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!submitting && question.trim()) {
        void handleSubmit();
      }
    }
  };

  const sortedHistory = useMemo(() => {
    return [...history].reverse();
  }, [history]);

  const isLastHistorySameAsCurrent = useMemo(() => {
    if (sortedHistory.length === 0 || !activeQuestion) return false;
    return sortedHistory[sortedHistory.length - 1].question === activeQuestion;
  }, [sortedHistory, activeQuestion]);

  const showActiveStream = (submitting || result) && !isLastHistorySameAsCurrent;

  // 가장 최근 이용 정보 추출 (가장 최신 기록이나 결과에서 가져옴)
  const usageInfo = useMemo(() => {
    if (result?.usage) return result.usage;
    // 히스토리 항목들 중 첫 번째 항목(최신 항목)에서 사용량 정보를 유추할 수 있는지 체크
    if (history.length > 0 && (history[0] as any).usage) {
      return (history[0] as any).usage;
    }
    return null;
  }, [result, history]);

  return (
    <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_320px] animate-fade-in-up">
      {/* 좌측: 대화 인터페이스 */}
      <div className="flex flex-col space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">불안제로 AI 챗봇</h2>
          <p className="text-xs text-slate-500 mt-1">철도 안전 규정 및 이례상황 대응 절차에 대해 질문해 보세요.</p>
        </div>

        <Card className="border-slate-200 bg-white shadow-md rounded-2xl flex flex-col flex-1 overflow-hidden">
          {/* 채팅 헤더 */}
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <CardTitle className="text-sm font-semibold text-slate-700">실시간 안전 대응 지원</CardTitle>
            </div>
            {submitting && (
              <Badge variant="secondary" className="animate-pulse bg-indigo-50 text-indigo-600 border border-indigo-100">
                AI 분석 중
              </Badge>
            )}
          </CardHeader>

          {/* 채팅 말풍선 영역 */}
          <div className="h-[520px] overflow-y-auto p-5 space-y-4 bg-slate-50/40 flex flex-col scrollbar-thin">
            {historyLoading && history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-2 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                <span className="text-sm">대화 기록을 불러오고 있습니다...</span>
              </div>
            ) : sortedHistory.length === 0 && !showActiveStream ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Bot className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-800">새로운 대화를 시작해보세요!</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    "열차 고장 시 통보 순서", "이례 상황 시 방호 조치" 등 궁금한 승무 관련 규정을 물어보시면 인공지능이 찾아 드립니다.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 1. 과거 대화 기록 */}
                {sortedHistory.map((entry) => (
                  <div key={entry.id} className="space-y-3">
                    {/* 사용자 질문 */}
                    <div className="flex flex-col items-end space-y-1">
                      <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap">
                        {entry.question}
                      </div>
                    </div>

                    {/* AI 답변 */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-slate-200 border border-slate-300 text-slate-600 shadow-xs">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col space-y-1 max-w-[85%]">
                        <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs text-sm leading-relaxed">
                          {entry.status === "success" ? (
                            <>
                              <MarkdownContent value={entry.answer} compact />
                              {/* 출처 목록 링크 */}
                              {(entry as any).sources && (entry as any).sources.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100">
                                  <span className="text-[10px] text-slate-400 mr-1 self-center">출처:</span>
                                  {(entry as any).sources.map((src: ChatSource, i: number) => (
                                    <Badge 
                                      key={i} 
                                      variant="outline" 
                                      className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 cursor-pointer transition-colors"
                                      onClick={() => _onSelectSource(src)}
                                    >
                                      {src.title}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-start gap-2 text-amber-600">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs">{STATUS_COPY[entry.status]?.title || entry.status}</span>
                                <span className="text-[11px] text-slate-500">{STATUS_COPY[entry.status]?.description}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 ml-1">
                          <span>모델: {entry.model}</span>
                          <span>•</span>
                          <span>{new Date(entry.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. 현재 활성화 스트리밍 대화 */}
                {showActiveStream && (
                  <div className="space-y-3">
                    {/* 사용자 임시 말풍선 */}
                    <div className="flex flex-col items-end space-y-1">
                      <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap">
                        {activeQuestion}
                      </div>
                    </div>

                    {/* AI 실시간 스트리밍 답변 */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-xs">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col space-y-1 max-w-[85%]">
                        <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs text-sm leading-relaxed min-w-[100px]">
                          {submitting && !result?.answer ? (
                            <div className="flex items-center gap-2 py-1 text-slate-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                              <span className="text-xs">답변을 작성하고 있습니다...</span>
                            </div>
                          ) : (
                            result?.status === "success" || !result ? (
                              <>
                                <MarkdownContent value={result?.answer} compact />
                                {/* 스트리밍 중에도 출처 표기 */}
                                {result?.sources && result.sources.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-400 mr-1 self-center">출처:</span>
                                    {result.sources.map((src, i) => (
                                      <Badge 
                                        key={i} 
                                        variant="outline" 
                                        className="text-[10px] bg-slate-50 hover:bg-indigo-50 text-indigo-700 border-indigo-100 cursor-pointer transition-colors"
                                        onClick={() => _onSelectSource(src)}
                                      >
                                        {src.title}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-start gap-2 text-amber-600">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-xs">{statusCopy?.title}</span>
                                  <span className="text-[11px] text-slate-500">{statusCopy?.description}</span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                        {result?.model && (
                          <span className="text-[10px] text-slate-400 ml-1">모델: {result.model}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 에러 발생 알럿 */}
          {requestError && (
            <div className="px-5 py-2">
              <Alert variant="destructive" className="rounded-xl py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">요청 실패</AlertTitle>
                <AlertDescription className="text-xs">{requestError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* 채팅 입력 영역 */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="relative flex items-center">
              <Textarea
                rows={1}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={submitting ? "답변 완료를 기다리는 중..." : "규정에 대해 질문해 보세요... (Enter 전송, Shift+Enter 줄바꿈)"}
                disabled={submitting}
                className="min-h-[48px] max-h-[120px] resize-none pr-12 rounded-2xl border-slate-200 focus-visible:ring-indigo-500 py-3 shadow-inner text-sm scrollbar-none"
              />
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={submitting || !question.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white h-8.5 w-8.5 disabled:bg-slate-100 disabled:text-slate-400 transition-colors shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 우측: 정보 및 현황 사이드바 */}
      <div className="space-y-4">
        {/* 챗봇 프로필 정보 */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-indigo-50/50 border-b border-indigo-100/50 py-4 px-5">
            <CardTitle className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-600" />
              챗봇 정보
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-500">
              불안제로 AI 어시스턴트
            </CardDescription>
          </CardHeader>
          <CardContent className="py-4 px-5 space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                본 챗봇은 동대문승무사업소의 공식 승무 규정, 운전 취급 요령, 그리고 사고 조치 가이드라인을 학습한 안전 특화 AI 비서입니다.
              </p>
              <p className="font-semibold text-indigo-700 pt-1">
                주요 질문 분야:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>차량 고장 대처 절차</li>
                <li>승무 보고 및 방호 조치</li>
                <li>신호 모진 및 규정 위반 대책</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 오늘 사용량 현황 */}
        {usageInfo && (
          <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="py-4 px-5 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-blue-600" />
                오늘의 사용 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="py-4 px-5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>질문 사용량</span>
                  <span>{usageInfo.usedToday} / {usageInfo.dailyLimit} 회</span>
                </div>
                <Progress value={(usageInfo.usedToday / usageInfo.dailyLimit) * 100} className="h-2 bg-slate-100 text-blue-600" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="text-center bg-slate-50 rounded-xl p-2">
                  <p className="text-[10px] text-slate-400">남은 질문</p>
                  <p className="text-sm font-bold text-slate-700">{usageInfo.remainingToday}회</p>
                </div>
                <div className="text-center bg-slate-50 rounded-xl p-2">
                  <p className="text-[10px] text-slate-400">초기화 기준</p>
                  <p className="text-sm font-bold text-slate-700">매일 자정</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-normal text-center">
                최종 초기화: {formatResetTime(usageInfo.resetsAt)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
