import { BookOpen, Sparkles, User, Users } from "lucide-react";
import { contentCacheKey } from "../lib/contentSync";
import { orgConfig } from '@/config/orgConfig';

export const NAV_STATE_STORAGE_KEY = "app-navigation-state-v2";
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

const iconMap: Record<string, any> = { User, Users, Sparkles, BookOpen };

export const PERSONALIZED_ROLE_OPTIONS = orgConfig.roles.options.map((opt, i) => ({
  ...opt,
  icon: i === 0 ? User : Users,
}));

export const PERSONALIZED_CAREER_OPTIONS = orgConfig.roles.careerStages.map((opt, i) => ({
  ...opt,
  icon: i === 0 ? Sparkles : BookOpen,
}));

