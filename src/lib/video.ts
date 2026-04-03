import { Video } from "../types/video";

export function parseDurationToSeconds(duration: number | string | undefined | null): number {
  if (typeof duration === "number") return duration;
  if (!duration) return 0;

  const normalized = String(duration).trim();
  if (!normalized) return 0;

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  const parts = normalized.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

export function formatDurationLabel(duration: number | string | undefined | null): string {
  const totalSeconds = parseDurationToSeconds(duration);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function extractYouTubeVideoId(value: string | undefined | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directMatch = raw.match(/^[A-Za-z0-9_-]{11}$/);
  if (directMatch) return directMatch[0];

  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const candidate = parsed.pathname.split("/").filter(Boolean)[0] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : "";
    }

    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
      const queryId = parsed.searchParams.get("v") || "";
      if (/^[A-Za-z0-9_-]{11}$/.test(queryId)) return queryId;

      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = pathParts.findIndex((part) => ["embed", "shorts", "live", "v"].includes(part));
      if (embedIndex >= 0) {
        const candidate = pathParts[embedIndex + 1] || "";
        return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : "";
      }
    }
  } catch {
    // Fall through to regex extraction for partially formed values.
  }

  const fallbackMatch = raw.match(/([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)/);
  return fallbackMatch ? fallbackMatch[1] : "";
}

export function getYouTubeThumbnailUrl(value: string | undefined | null): string {
  const videoId = extractYouTubeVideoId(value);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
}

export function normalizeVideo(video: Video): Video {
  if (video.videoType !== "youtube") return video;

  const youtubeId = extractYouTubeVideoId(video.youtubeId);
  const fallbackThumbnail = getYouTubeThumbnailUrl(youtubeId);

  return {
    ...video,
    youtubeId,
    thumbnail: video.thumbnail || fallbackThumbnail,
  };
}
