import { BookOpen, Sparkles, User, Users } from "lucide-react";
import { contentCacheKey } from "../lib/contentSync";

export const NAV_STATE_STORAGE_KEY = "app-navigation-state-v2";
export const NAV_STACK_STORAGE_KEY = "app-navigation-stack-v1";
export const PERSONALIZED_PROFILE_STORAGE_KEY = "personalized-profile-input";
export const APP_SHELL_CACHE_KEY = contentCacheKey("app-shell");
export const COMMUNITY_POST_CACHE_PREFIX = contentCacheKey("community-post:");
export const RECOMMENDATION_CACHE_PREFIX = contentCacheKey("recommendation:");

export const primaryNavButtonClassName =
  "inline-flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/80 bg-white p-4 text-center text-slate-900 shadow-lg shadow-slate-950/10 transition-colors hover:bg-blue-50";

export const primaryNavButtonTextStyle = {
  color: "#0f172a",
  WebkitTextFillColor: "#0f172a",
} as const;

export const PERSONALIZED_ROLE_OPTIONS = [
  {
    value: "기관사" as const,
    label: "기관사",
    description: "운전 업무 중심 추천",
    icon: User,
  },
  {
    value: "차장" as const,
    label: "차장",
    description: "현장 운영 중심 추천",
    icon: Users,
  },
];

export const PERSONALIZED_CAREER_OPTIONS = [
  {
    value: "신입" as const,
    label: "신입",
    description: "입문 학습부터 빠르게",
    icon: Sparkles,
  },
  {
    value: "경력" as const,
    label: "경력",
    description: "심화·보수 과정 중심",
    icon: BookOpen,
  },
];
