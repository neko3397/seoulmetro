import { PersonalizedProfileInput } from "../types/content";
import { Video } from "../types/video";
import { normalizeVideo } from "../lib/video";
import { NAV_STATE_STORAGE_KEY, PERSONALIZED_PROFILE_STORAGE_KEY } from "./constants";
import { NavigationState } from "./types";

export const readPersistedNavigationState = (): Partial<NavigationState> => {
  try {
    const raw = sessionStorage.getItem(NAV_STATE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed?.video ? { ...parsed, video: normalizeVideo(parsed.video) } : parsed;
  } catch (error) {
    console.warn("Failed to parse persisted navigation state:", error);
    return {};
  }
};

export const persistNavigationState = (state: NavigationState) => {
  try {
    sessionStorage.setItem(NAV_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to persist navigation state:", error);
  }
};

export const readPersistedProfile = (): PersonalizedProfileInput => {
  try {
    const raw = localStorage.getItem(PERSONALIZED_PROFILE_STORAGE_KEY);
    if (!raw) return { role: "기관사", careerStage: "신입" };
    const parsed = JSON.parse(raw);
    return {
      role: parsed.role === "차장" ? "차장" : "기관사",
      careerStage: parsed.careerStage === "경력" ? "경력" : "신입",
    };
  } catch {
    return { role: "기관사", careerStage: "신입" };
  }
};

export const sortVideosByCreatedAt = (videos: Video[]) =>
  [...videos].map(normalizeVideo).sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

export const formatDateTime = (value?: string | null) => {
  if (!value) return "등록 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export const formatDate = (value?: string | null) => {
  if (!value) return "등록 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
};

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const applyInlineMarkdown = (value: string) => {
  let html = escapeHtml(value);

  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-800">$1</code>');
  // Render Markdown Images with URL-encoded paths for Supabase Storage compatibility
  html = html.replace(
    /!\[([^\]]*)\]\(images\/([^\)]+(?:\([^\)]+\)[^\)]*)*\.(?:png|jpg|jpeg|gif|bmp))\)/g,
    (_, alt, path) => {
      const encodedPath = path
        .split("/")
        .map((segment: string) => encodeURIComponent(segment))
        .join("/");
      return `<img src="https://nkowcjmjqaszwtrvgedt.supabase.co/storage/v1/object/public/make-a8898ff1-images/images/${encodedPath}" alt="${alt}" class="my-4 max-w-full h-auto rounded-xl shadow-md border border-slate-200/80" />`;
    }
  );
  // Fallback for regular markdown images
  html = html.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, '<img src="$2" alt="$1" class="my-4 max-w-full h-auto rounded-xl shadow-md border border-slate-200/80" />');
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="font-medium text-blue-700 underline underline-offset-4">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return html;
};

export const markdownToHtml = (value?: string | null) => {
  const lines = String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    html.push(`<p>${paragraphBuffer.map((line) => applyInlineMarkdown(line)).join("<br />")}</p>`);
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    html.push(`<ul>${listBuffer.join("")}</ul>`);
    listBuffer = [];
  };

  const flushCodeBlock = () => {
    if (!inCodeBlock) return;
    html.push(
      `<pre class="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>${escapeHtml(
        codeBuffer.join("\n"),
      )}</code></pre>`,
    );
    inCodeBlock = false;
    codeBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(6, headingMatch[1].length + 1);
      html.push(`<h${level}>${applyInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const blockquoteMatch = line.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph();
      flushList();
      html.push(
        `<blockquote class="border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700">${applyInlineMarkdown(
          blockquoteMatch[1],
        )}</blockquote>`,
      );
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listBuffer.push(`<li>${applyInlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    paragraphBuffer.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCodeBlock();

  return html.join("");
};

export const markdownToPlainText = (value?: string | null) =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/^#+\s?/gm, "")
    .replace(/\*\*/g, "")
    .trim();

export const isSameNavigationState = (a: Partial<NavigationState> | null, b: Partial<NavigationState>) =>
  (a?.view || "") === (b.view || "") &&
  (a?.topicId || "") === (b.topicId || "") &&
  (a?.video?.id || "") === (b.video?.id || "") &&
  (a?.guide?.id || "") === (b.guide?.id || "") &&
  (a?.post?.id || "") === (b.post?.id || "") &&
  (a?.highlightSource?.sourceId || "") === (b.highlightSource?.sourceId || "");

export const extractHighlightText = (snippet: string): string => {
  let text = snippet || "";

  // 1. RAG chunk.content 에 삽입되는 메타데이터 라벨들을 지운다.
  const metadataPatterns = [
    /문서\s*제목:\s*.*?(?=(문서\s*유형:|섹션\s*경로:|섹션\s*제목:|$))/g,
    /문서\s*유형:\s*.*?(?=(문서\s*제목:|섹션\s*경로:|섹션\s*제목:|$))/g,
    /섹션\s*경로:\s*.*?(?=(문서\s*제목:|문서\s*유형:|섹션\s*제목:|$))/g,
    /섹션\s*제목:\s*.*?(?=(문서\s*제목:|문서\s*유형:|섹션\s*경로:|$))/g,
  ];

  metadataPatterns.forEach((pattern) => {
    text = text.replace(pattern, "");
  });

  // 2. "가이드 제목: " 같은 잔여물이 있을 수 있으니 콜론(:)이 있는 경우 우측 부분만 가져온다.
  if (text.includes(": ")) {
    const parts = text.split(": ");
    text = parts[parts.length - 1];
  }

  return text.replace(/\s+/g, " ").trim();
};

export const highlightHtml = (html: string, highlightText: string): string => {
  if (!highlightText || highlightText.length < 3) return html;

  // 전체 검색어로 먼저 통째로 매칭을 시도
  const escapedSearch = highlightText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const fullRegex = new RegExp(`(${escapedSearch})(?![^<>]*>)`, "gi");
  if (fullRegex.test(html)) {
    return html.replace(fullRegex, '<mark class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-bold shadow-2xs">$1</mark>');
  }

  // 통째로 매칭이 안 되면, 3단어씩 조합하여 매칭 시도
  const words = highlightText.split(" ").filter((w) => w.length >= 2);
  if (words.length === 0) return html;

  let currentHtml = html;
  const chunks: string[] = [];
  const chunkSize = 3;
  for (let i = 0; i < words.length; i += 1) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.length >= 5) {
      chunks.push(chunk);
    }
  }

  chunks.sort((a, b) => b.length - a.length);

  chunks.forEach((chunk) => {
    const escapedChunk = chunk.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${escapedChunk})(?![^<>]*>)`, "gi");
    currentHtml = currentHtml.replace(regex, '<mark class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-bold shadow-2xs">$1</mark>');
  });

  return currentHtml;
};
