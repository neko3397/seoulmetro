import type { ChatDiagnostics, ChatHistoryEntry, ChatQueryResult, ChatSource, ChatUsage } from "../types/content";

function toFiniteNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeChatUsage(value: unknown): ChatUsage {
  const raw = value && typeof value === "object" ? (value as Partial<ChatUsage>) : {};
  const dailyLimit = Math.max(1, toFiniteNumber(raw.dailyLimit, 20));
  const usedToday = Math.max(0, toFiniteNumber(raw.usedToday, 0));

  return {
    dailyLimit,
    usedToday,
    remainingToday: Math.max(0, toFiniteNumber(raw.remainingToday, dailyLimit - usedToday)),
    resetsAt: typeof raw.resetsAt === "string" ? raw.resetsAt : "",
  };
}

function normalizeChatSources(value: unknown): ChatSource[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => {
      const raw = entry as Partial<ChatSource> & {
        target?: Partial<ChatSource["target"]>;
      };

      return {
        sourceId:
          typeof raw.sourceId === "string" && raw.sourceId.trim()
            ? raw.sourceId
            : `source-${index}`,
        sourceType: raw.sourceType === "guide" ? "guide" : "community_post",
        title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "문서",
        snippet: typeof raw.snippet === "string" ? raw.snippet : "",
        score: toFiniteNumber(raw.score, 0),
        target: {
          type: raw.target?.type === "guide" ? "guide" : "post",
          id:
            typeof raw.target?.id === "string" && raw.target.id.trim()
              ? raw.target.id
              : typeof raw.sourceId === "string" && raw.sourceId.trim()
                ? raw.sourceId
                : `target-${index}`,
        },
      };
    });
}

function normalizeChatDiagnostics(value: unknown): ChatDiagnostics | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ChatDiagnostics> & {
    retrieval?: Partial<NonNullable<ChatDiagnostics["retrieval"]>>;
    generation?: Partial<NonNullable<ChatDiagnostics["generation"]>>;
  };

  return {
    failureStage:
      raw.failureStage === "retrieval" || raw.failureStage === "generation" ? raw.failureStage : null,
    retrieval: raw.retrieval
      ? {
          candidateCount: Math.max(0, toFiniteNumber(raw.retrieval.candidateCount, 0)),
          rerankedCount: Math.max(0, toFiniteNumber(raw.retrieval.rerankedCount, 0)),
          selectedCount: Math.max(0, toFiniteNumber(raw.retrieval.selectedCount, 0)),
          queryHasEmbedding: Boolean(raw.retrieval.queryHasEmbedding),
          thresholdApplied: toFiniteNumber(raw.retrieval.thresholdApplied, 0),
          topScore: toFiniteNumber(raw.retrieval.topScore, 0),
          topRetrievalScore: toFiniteNumber(raw.retrieval.topRetrievalScore, 0),
        }
      : undefined,
    generation: raw.generation
      ? {
          usedModel:
            typeof raw.generation.usedModel === "string" && raw.generation.usedModel.trim()
              ? raw.generation.usedModel
              : "-",
          fallbackUsed: Boolean(raw.generation.fallbackUsed),
        }
      : undefined,
  };
}

export function normalizeChatQueryResult(value: unknown): ChatQueryResult {
  const raw = value && typeof value === "object" ? (value as Partial<ChatQueryResult>) : {};

  return {
    status:
      raw.status === "success" ||
      raw.status === "no_context" ||
      raw.status === "disabled" ||
      raw.status === "rate_limited" ||
      raw.status === "error"
        ? raw.status
        : "error",
    answer: typeof raw.answer === "string" ? raw.answer : "",
    model: typeof raw.model === "string" && raw.model.trim() ? raw.model : "-",
    sources: normalizeChatSources(raw.sources),
    usage: normalizeChatUsage(raw.usage),
    diagnostics: normalizeChatDiagnostics(raw.diagnostics),
  };
}

export function normalizeChatHistoryEntries(value: unknown): ChatHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => {
      const raw = entry as Partial<ChatHistoryEntry> & {
        employee_id?: string | null;
        created_at?: string;
      };

      return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `chat-history-${index}`,
        employeeId:
          typeof raw.employeeId === "string"
            ? raw.employeeId
            : typeof raw.employee_id === "string"
              ? raw.employee_id
              : null,
        question: typeof raw.question === "string" ? raw.question : "",
        answer: typeof raw.answer === "string" ? raw.answer : "",
        model: typeof raw.model === "string" && raw.model.trim() ? raw.model : "-",
        status:
          raw.status === "success" ||
          raw.status === "no_context" ||
          raw.status === "disabled" ||
          raw.status === "rate_limited" ||
          raw.status === "error"
            ? raw.status
            : "error",
        createdAt: typeof raw.createdAt === "string" ? raw.createdAt : typeof raw.created_at === "string" ? raw.created_at : "",
      };
    });
}
