import { AlertCircle, Bot, Loader2, MessageSquare, Send, Info, Menu, Plus, ChevronLeft, CornerDownLeft, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiBase, apiRequestJson, authHeaders } from "../../lib/api";
import { normalizeChatHistoryEntries, normalizeChatQueryResult } from "../../lib/chat";
import type { ChatHistoryEntry, ChatQueryResult, ChatSource } from "../../types/content";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
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

const SUGGESTIONS = [
  {
    title: "열차 고장 초기 조치",
    desc: "운행 중 열차에 고장이 발생했을 때 기관사의 초기 보고 및 조치 절차는 어떻게 되나요?",
    query: "운행 중 열차 고장 발생 시 기관사의 초기 보고 절차와 조치 요령을 알려줘."
  },
  {
    title: "이례상황 방호 조치",
    desc: "선로 내 이례상황 발생 시 인접 열차 방호 조치 기준과 통보 순서가 궁금합니다.",
    query: "선로 내 이례상황 시 인접 열차 방호 조치 기준과 관제 통보 순서에 대해 설명해줘."
  },
  {
    title: "비상 제동 완해 불가",
    desc: "열차 비상 제동이 완해되지 않을 때 대처 요령과 비상 운전 취급 방법을 알려주세요.",
    query: "비상 제동이 완해되지 않을 때 대처 요령과 후부 운전 등 비상 운전 방법을 설명해줘."
  },
  {
    title: "신호 모진 시 대책",
    desc: "정지 신호를 모진하여 열차가 통과했을 경우 대처 방안과 조치 사항을 설명해 주세요.",
    query: "정지 신호 모진 통과 시 기관사의 즉각 조치 사항과 사후 대응 방법을 설명해줘."
  }
];

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
  const [historyError, setHistoryError] = useState("");
  
  // 모바일은 기본 닫힘, 데스크톱은 기본 열림
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const statusCopy = useMemo(() => (result ? STATUS_COPY[result.status] : null), [result]);

  const loadHistory = async () => {
    const empId = currentUser?.employeeId || (currentUser as any)?.employee_id || null;
    if (!empId) {
      setHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError("");
      const response = await apiRequestJson<{ history?: unknown[] }>(
        `/chat/history?employeeId=${encodeURIComponent(empId)}`,
      );
      setHistory(normalizeChatHistoryEntries(response.history));
    } catch (error) {
      console.error("Failed to load chat history:", error);
      setHistoryError(error instanceof Error ? error.message : "알 수 없는 오류");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [currentUser]);

  // 화면 리사이즈 감지 로직
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 스크롤 하단 이동 로직
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, result?.answer, submitting, activeQuestion]);

  const handleSubmit = async (customQuery?: string) => {
    const queryToSend = (customQuery || question).trim();
    if (!queryToSend || submitting) return;

    setActiveQuestion(queryToSend);
    setQuestion("");
    setResult(null);
    setRequestError("");

    // 모바일 환경인 경우, 질문을 보내면 사이드바를 자동으로 닫습니다.
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${apiBase}/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          question: queryToSend,
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

  const handleNewChat = () => {
    setActiveQuestion("");
    setResult(null);
    setQuestion("");
    setRequestError("");
    // 모바일이면 새 대화 시 사이드바를 자동으로 닫습니다.
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectHistoryEntry = (entry: ChatHistoryEntry) => {
    setActiveQuestion(entry.question);
    setResult(normalizeChatQueryResult({
      status: entry.status,
      answer: entry.answer,
      model: entry.model,
      sources: (entry as any).sources || [],
      usage: usageInfo || { dailyLimit: 10, usedToday: 0, remainingToday: 10, resetsAt: "" }
    }));
    setRequestError("");
    
    // 모바일에서 히스토리 선택 시 사이드바 자동 닫기
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
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

  // 가장 최근 이용 정보 추출
  const usageInfo = useMemo(() => {
    if (result?.usage) return result.usage;
    if (history.length > 0 && (history[0] as any).usage) {
      return (history[0] as any).usage;
    }
    return null;
  }, [result, history]);

  return (
    <div className="mx-auto flex h-[calc(100vh-104px)] min-h-[620px] max-w-[1440px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-fade-in-up relative">
      {/* 모바일 화면에서 사이드바 오픈 시 배경을 어둡게 가리는 딤(Dim) 레이어 */}
      {isSidebarOpen && (
        <div 
          className="chatbot-dim absolute inset-0 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. 좌측 사이드바 (과거 채팅 목록) - 슬라이딩 그라데이션 */}
      <div 
        className={`
          chatbot-sidebar
          bg-[#f9f9f9] border-r border-slate-200 flex flex-col shrink-0
          shadow-none
          ${isSidebarOpen ? "open" : "closed"}
        `}
      >
        <div className="p-3 flex flex-col h-full justify-between">
          <div className="flex-1 flex flex-col min-h-0">
            {/* 새 대화 버튼 및 모바일 전용 닫기 버튼 */}
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleNewChat}
                className="flex-1 justify-start gap-2.5 rounded-lg border-0 bg-transparent hover:bg-slate-200 text-slate-800 hover:text-slate-950 shadow-none h-10 text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                새로운 대화
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(false)}
                className="h-10 w-10 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 lg:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* 과거 대화 히스토리 목록 */}
            <div className="flex-1 overflow-y-auto mt-5 pr-1 space-y-3 scrollbar-thin">
              <div className="px-2">
                <p className="text-[11px] font-medium text-slate-500">최근 대화</p>
              </div>

              {historyLoading && history.length === 0 ? (
                <div className="px-2 py-4 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  기록을 로딩하는 중...
                </div>
              ) : historyError ? (
                <div className="px-2 py-3 text-xs text-rose-600 flex items-center gap-1.5 font-medium bg-rose-50 rounded-lg">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  로딩 실패: {historyError}
                </div>
              ) : history.length === 0 ? (
                <div className="px-2 py-4 text-xs text-slate-500">
                  이전 대화 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-1">
                  {history.map((entry) => {
                    const isSelected = activeQuestion === entry.question;
                    return (
                      <div 
                        key={entry.id}
                        onClick={() => handleSelectHistoryEntry(entry)}
                        className={`group flex items-center gap-2 px-3 py-2.5 text-xs rounded-xl cursor-pointer truncate font-medium transition-all ${
                          isSelected 
                            ? "bg-slate-200 text-slate-950"
                            : "text-slate-700 hover:bg-slate-200 hover:text-slate-950"
                        }`}
                      >
                        <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-slate-800" : "text-slate-400"}`} />
                        <span className="truncate flex-1">{entry.question}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 사이드바 하단 정보 패널 */}
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 bg-transparent">
            {usageInfo && (
              <div className="space-y-2 px-1">
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                  <span>오늘의 질문 횟수</span>
                  <span>{usageInfo.usedToday}/{usageInfo.dailyLimit} 회</span>
                </div>
                <Progress value={(usageInfo.usedToday / usageInfo.dailyLimit) * 100} className="h-1 bg-slate-200 text-slate-700" />
                <p className="text-[9px] text-slate-400 text-center leading-none mt-1">자정 초기화 ({formatResetTime(usageInfo.resetsAt)})</p>
              </div>
            )}
            
            <Card className="border border-slate-200 bg-white shadow-none rounded-xl p-3">
              <div className="flex gap-2">
                <Info className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-800">안전 특화 AI</p>
                  <p className="text-[9px] text-slate-500 leading-normal">
                    동대문승무사업소 승무 규정, 운전 취급 요령 등 안전 가이드 기반
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 2. 중앙 대화 영역 */}
      <div className="flex-1 flex flex-col h-full bg-white relative min-w-0">
        {/* 상단 툴바 - 항상 노출되는 사이드바 토글 버튼 */}
        <div className="h-14 border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between bg-white shrink-0 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            {/* 상단 툴바 왼쪽에 항상 배치되는 메뉴 버튼 */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="h-9 w-9 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 border-0 shadow-none shrink-0"
              title="사이드바 열기/닫기"
            >
              <Menu className="h-4.5 w-4.5" />
            </Button>

          </div>
          <div className="flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1">
            <Bot className="h-4 w-4 text-slate-700 shrink-0" />
            <span className="text-xs text-slate-800 font-semibold">동대문승무사업소 AI</span>
          </div>
        </div>

        {/* 대화 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex flex-col scrollbar-thin relative">
          {!activeQuestion ? (
            /* 대화가 없을 때 (웰컴 화면) - 오로라 그라데이션 백그라운드 포함 */
            <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-8 my-auto animate-fade-in w-full relative z-10">
              <div className="space-y-3 px-4">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 py-1">
                  무엇을 도와드릴까요?
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  철도 안전 규정, 이례상황 조치 가이드, 승무 보고 절차 등 궁금하신 점을 자유롭게 선택하시거나 입력해 주세요.
                </p>
              </div>

              {/* 추천 질문 Grid (모바일은 1열, 데스크톱은 2열) - 높이 고정을 제거하여 텍스트 겹침 차단 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2 sm:pt-4 max-w-2xl px-4 sm:px-0">
                {SUGGESTIONS.map((s, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSubmit(s.query)}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm text-left cursor-pointer transition-all duration-200 group flex flex-col justify-between min-h-[106px] h-auto"
                  >
                    <div className="mb-2">
                      <p className="text-sm font-medium text-slate-800 transition-colors">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{s.desc}</p>
                    </div>
                    <div className="flex items-center justify-end text-slate-400 group-hover:text-slate-800 transition-colors mt-auto pt-1">
                      <CornerDownLeft className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 대화가 존재할 때 (현재 활성화된 단일 문답만 표시) */
            <div className="max-w-3xl w-full mx-auto space-y-7 flex flex-col flex-1 z-10 px-2 sm:px-4">
              <div className="space-y-6">
                {/* 사용자 질문 */}
                <div className="flex flex-col items-end space-y-1">
                  <div className="bg-slate-100 text-slate-900 rounded-2xl px-4 sm:px-5 py-3 max-w-[85%] sm:max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap">
                    {activeQuestion}
                  </div>
                </div>

                {/* AI 답변 */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-slate-900 text-white mt-0.5">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex flex-col space-y-2 flex-1 min-w-0">
                    <div className="text-slate-800 text-sm leading-relaxed space-y-3 min-w-[100px] pt-1">
                      {submitting && !result?.answer ? (
                        <div className="flex items-center gap-2.5 py-2 text-slate-450">
                          <Loader2 className="h-4.5 w-4.5 animate-spin text-slate-700" />
                          <span className="text-xs font-semibold">답변을 정교하게 분석하는 중...</span>
                        </div>
                      ) : (
                        result?.status === "success" || !result ? (
                          <>
                            <MarkdownContent value={result?.answer || ""} compact />
                            
                            {/* 출처 목록 배지 표시 */}
                            {result?.sources && result.sources.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-4 pt-3.5 border-t border-slate-100">
                                <span className="text-[10px] text-slate-400 mr-1.5 self-center font-bold">참고 출처:</span>
                                {result.sources.map((src: ChatSource, i: number) => (
                                  <Badge 
                                    key={i} 
                                    variant="outline" 
                                    className="text-[10px] bg-white hover:bg-slate-100 text-slate-600 border-slate-200 cursor-pointer transition-all duration-200 px-2 py-0.5 rounded-lg font-medium shadow-none"
                                    onClick={() => _onSelectSource(src)}
                                  >
                                    {src.title}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-start gap-2.5 text-amber-600 bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-xs">{STATUS_COPY[result.status]?.title || result.status}</span>
                              <span className="text-[11px] text-slate-500">{STATUS_COPY[result.status]?.description}</span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    
                    {/* 생성 시각 정보 */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 ml-1">
                      {result?.createdAt && (
                        <span>{new Date(result.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 에러 발생 알럿 */}
        {requestError && (
          <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-2 relative z-10">
            <Alert variant="destructive" className="rounded-xl py-2 shadow-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold">요청 오류</AlertTitle>
              <AlertDescription className="text-xs">{requestError}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="px-4 sm:px-6 pb-4 sm:pb-6 bg-white shrink-0 relative z-10">
          <div className="max-w-3xl w-full mx-auto flex flex-col items-center">
            <div className="relative flex items-center w-full border border-slate-300 bg-white shadow-sm hover:shadow-md focus-within:border-slate-400 rounded-[26px] transition-all px-3 sm:px-4 py-1.5 sm:py-2">
              <Textarea
                rows={1}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={submitting ? "답변을 생성하고 있습니다..." : "무엇이든 물어보세요"}
                disabled={submitting}
                className="flex-1 min-h-[44px] max-h-[140px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2.5 text-sm scrollbar-none pr-10"
              />
              <Button
                size="icon"
                onClick={() => handleSubmit()}
                disabled={submitting || !question.trim()}
                className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 rounded-full bg-slate-900 hover:bg-slate-700 text-white h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center transition-all shadow-sm disabled:bg-slate-200 disabled:text-slate-400"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5 text-center leading-normal px-2">
              AI가 생성한 답변은 부정확할 수 있으므로, 현업 적용 전 공식 규정 문서를 최종 확인하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
