import { supabase } from "../utils/supabase/client";

export type ContentScope =
  | "categories"
  | "videos"
  | "feed"
  | "guides"
  | "community"
  | "recommendations";

interface CacheEntry<T> {
  value: T;
  updatedAt: number;
}

interface ContentChangeDetail {
  scopes: ContentScope[];
  source: "mutation" | "realtime";
  timestamp: number;
}

const CACHE_PREFIX = "seoulmetro-cache-v1:";
const CONTENT_CHANGE_STORAGE_KEY = "seoulmetro-content-change-v1";
const CONTENT_CHANGE_EVENT_NAME = "seoulmetro:content-change";

const dedupeScopes = (scopes: ContentScope[]) => Array.from(new Set(scopes));

const parseJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const contentCacheKey = (suffix: string) => `${CACHE_PREFIX}${suffix}`;

export const readCachedValue = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  const entry = parseJson<CacheEntry<T>>(window.localStorage.getItem(key));
  return entry?.value ?? null;
};

export const writeCachedValue = <T>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  const entry: CacheEntry<T> = {
    value,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(key, JSON.stringify(entry));
};

export const removeCachedValue = (key: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
};

export const removeCachedValuesByPrefix = (prefix: string) => {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
};

export const notifyContentChanged = (
  scopes: ContentScope[],
  source: ContentChangeDetail["source"] = "mutation",
) => {
  if (typeof window === "undefined") return;
  const detail: ContentChangeDetail = {
    scopes: dedupeScopes(scopes),
    source,
    timestamp: Date.now(),
  };
  window.localStorage.setItem(CONTENT_CHANGE_STORAGE_KEY, JSON.stringify(detail));
  window.dispatchEvent(new CustomEvent<ContentChangeDetail>(CONTENT_CHANGE_EVENT_NAME, { detail }));
};

export const listenContentChanges = (callback: (detail: ContentChangeDetail) => void) => {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<ContentChangeDetail>).detail;
    if (!detail) return;
    callback({
      ...detail,
      scopes: dedupeScopes(detail.scopes),
    });
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== CONTENT_CHANGE_STORAGE_KEY) return;
    const detail = parseJson<ContentChangeDetail>(event.newValue);
    if (!detail) return;
    callback({
      ...detail,
      scopes: dedupeScopes(detail.scopes),
    });
  };

  window.addEventListener(CONTENT_CHANGE_EVENT_NAME, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CONTENT_CHANGE_EVENT_NAME, handleCustomEvent as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
};

export const subscribeToRealtimeContentChanges = (
  callback: (detail: ContentChangeDetail) => void,
) => {
  if (typeof window === "undefined") return () => {};

  const emit = (scopes: ContentScope[]) => {
    callback({
      scopes: dedupeScopes(scopes),
      source: "realtime",
      timestamp: Date.now(),
    });
  };

  const channel = supabase
    .channel("seoulmetro-content-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () =>
      emit(["categories", "videos", "feed", "recommendations"]),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () =>
      emit(["videos", "feed", "recommendations"]),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "guides" }, () => emit(["guides"]))
    .on("postgres_changes", { event: "*", schema: "public", table: "guide_sections" }, () => emit(["guides"]))
    .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () =>
      emit(["community", "feed"]),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "community_assets" }, () =>
      emit(["community", "feed"]),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "community_comments" }, () =>
      emit(["community", "feed"]),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "community_post_likes" }, () =>
      emit(["community", "feed"]),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "personalized_recommendation_rules" }, () =>
      emit(["recommendations"]),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};
