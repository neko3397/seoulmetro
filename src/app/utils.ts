import { PersonalizedProfileInput } from "../types/content";
import { Video } from "../types/video";
import { normalizeVideo } from "../lib/video";
import {
  NAV_STACK_STORAGE_KEY,
  NAV_STATE_STORAGE_KEY,
  PERSONALIZED_PROFILE_STORAGE_KEY,
} from "./constants";
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

export const readPersistedNavigationStack = (): NavigationState[] => {
  try {
    const raw = sessionStorage.getItem(NAV_STACK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((entry) => entry && typeof entry.view === "string")
          .map((entry) => (entry?.video ? { ...entry, video: normalizeVideo(entry.video) } : entry))
      : [];
  } catch (error) {
    console.warn("Failed to parse persisted navigation stack:", error);
    return [];
  }
};

export const persistNavigationStack = (stack: NavigationState[]) => {
  try {
    sessionStorage.setItem(NAV_STACK_STORAGE_KEY, JSON.stringify(stack));
  } catch (error) {
    console.warn("Failed to persist navigation stack:", error);
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

export const markdownToPlainText = (value?: string | null) =>
  String(value || "")
    .replace(/^#+\s?/gm, "")
    .replace(/\*\*/g, "")
    .trim();

export const isSameNavigationState = (a: Partial<NavigationState> | null, b: Partial<NavigationState>) =>
  (a?.view || "") === (b.view || "") &&
  (a?.topicId || "") === (b.topicId || "") &&
  (a?.video?.id || "") === (b.video?.id || "") &&
  (a?.guide?.id || "") === (b.guide?.id || "") &&
  (a?.post?.id || "") === (b.post?.id || "");
