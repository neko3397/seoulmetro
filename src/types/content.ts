import { Video } from "./video";

export interface FeedItemDetailTarget {
  type: "video" | "post";
  id: string;
}

export interface FeedItem {
  id: string;
  itemType: "video" | "document" | "image";
  title: string;
  summary: string;
  thumbnailUrl: string;
  publishedAt: string;
  target: FeedItemDetailTarget;
  categoryId?: string;
  video?: Video;
  postId?: string;
  authorName?: string;
  metadata?: Record<string, unknown>;
}

export interface CommunityAsset {
  id: string;
  postId: string;
  driveFileId?: string | null;
  storagePath?: string | null;
  fileName: string;
  mimeType?: string | null;
  assetType: "document" | "image" | "video";
  previewUrl?: string | null;
  downloadUrl?: string | null;
  previewKind?: "pdf-inline" | "image-inline" | "download-only" | null;
  thumbnailUrl?: string | null;
  fileSize?: number | null;
  sortOrder: number;
  syncStatus: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  postType: string;
  isPublished: boolean;
  approvalStatus: "draft" | "pending_review" | "published" | "rejected";
  authorEmployeeId?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assets: CommunityAsset[];
  comments: Array<Record<string, unknown>>;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  metadata?: Record<string, unknown>;
}

export interface GuideSection {
  id: string;
  guideId: string;
  parentId?: string | null;
  title: string;
  slug: string;
  markdownContent: string;
  sortOrder: number;
  depth: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuideCategory {
  id: string;
  title: string;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuideDetail {
  id: string;
  categoryId?: string | null;
  category?: GuideCategory | null;
  title: string;
  description?: string | null;
  slug: string;
  isPublished: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
  sections: GuideSection[];
}

export interface PersonalizedProfileInput {
  role: "기관사" | "차장";
  careerStage: "신입" | "경력";
}

export interface PersonalizedRecommendationRule {
  id: string;
  role: PersonalizedProfileInput["role"];
  careerStage: PersonalizedProfileInput["careerStage"];
  videoIds: string[];
  createdAt?: string;
  updatedAt?: string;
  videos?: Video[];
}

export interface ChatSourceTarget {
  type: "guide" | "post";
  id: string;
}

export interface ChatSource {
  sourceId: string;
  sourceType: "guide" | "community_post";
  title: string;
  snippet: string;
  score: number;
  target: ChatSourceTarget;
  sectionId?: string | null;
}

export interface ChatUsage {
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
}

export interface ChatDiagnostics {
  failureStage?: "retrieval" | "generation" | null;
  retrieval?: {
    candidateCount: number;
    rerankedCount: number;
    selectedCount: number;
    queryHasEmbedding: boolean;
    thresholdApplied: number;
    topScore: number;
    topRetrievalScore: number;
  };
  generation?: {
    usedModel: string;
    fallbackUsed: boolean;
  };
}

export interface ChatQueryResult {
  status: "success" | "no_context" | "disabled" | "rate_limited" | "error";
  answer: string;
  model: string;
  sources: ChatSource[];
  usage: ChatUsage;
  diagnostics?: ChatDiagnostics;
}

export interface ChatHistoryEntry {
  id: string;
  employeeId?: string | null;
  question: string;
  answer: string;
  model: string;
  status: ChatQueryResult["status"];
  createdAt: string;
}
