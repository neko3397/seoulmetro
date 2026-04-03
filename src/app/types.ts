import { CommunityPost, FeedItem, GuideCategory, GuideDetail } from "../types/content";
import { Video } from "../types/video";

export interface Category {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  description: string;
}

export type ViewState =
  | "homeFeed"
  | "educationVideos"
  | "documentDocs"
  | "documentList"
  | "videoList"
  | "videoDetail"
  | "wikiDocs"
  | "wikiDetail"
  | "communityPostDetail"
  | "personalizedEducation"
  | "adminLogin"
  | "adminDashboard"
  | "userLogin"
  | "myPage";

export interface NavigationState {
  view: ViewState;
  depth: number;
  topicId?: string;
  video?: Video | null;
  guide?: GuideDetail | null;
  post?: CommunityPost | null;
}

export interface NavigateOptions {
  replace?: boolean;
  resetDepth?: boolean;
}

export interface AppShellCache {
  categories: Category[];
  videosByCategory: Record<string, Video[]>;
  guideCategories: GuideCategory[];
  guides: GuideDetail[];
  feedItems: FeedItem[];
}
