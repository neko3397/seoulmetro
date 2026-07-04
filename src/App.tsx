import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { videos as mockVideos } from "./data/mockData";
import { Video } from "./types/video";
import {
  ChatSource,
  CommunityPost,
  FeedItem,
  GuideCategory,
  GuideDetail,
  PersonalizedProfileInput,
  PersonalizedRecommendationRule,
} from "./types/content";
import { AdminLogin } from "./components/AdminLogin";
import { UserLogin } from "./components/UserLogin";
import { Card, CardContent } from "./components/ui/card";
import { apiRequestJson } from "./lib/api";
import {
  listenContentChanges,
  readCachedValue,
  subscribeToRealtimeContentChanges,
  writeCachedValue,
} from "./lib/contentSync";
import { AppFooter } from "./app/components/AppFooter";
import { AppHeader } from "./app/components/AppHeader";
import { AppLoadingScreen } from "./app/components/AppLoadingScreen";
import {
  APP_SHELL_CACHE_KEY,
  COMMUNITY_POST_CACHE_PREFIX,
  PERSONALIZED_PROFILE_STORAGE_KEY,
  RECOMMENDATION_CACHE_PREFIX,
} from "./app/constants";
import { ChatbotPage } from "./app/pages/ChatbotPage";
import { HomeFeedPage } from "./app/pages/HomeFeedPage";
import { NoticeFeedPage } from "./app/pages/NoticeFeedPage";
import { WikiListPage } from "./app/pages/WikiListPage";
import { AppShellCache, Category, NavigateOptions, NavigationState, ViewState } from "./app/types";
import {
  isSameNavigationState,
  persistNavigationState,
  readPersistedNavigationState,
  readPersistedProfile,
  sortVideosByCreatedAt,
} from "./app/utils";

const AdminDashboard = lazy(() =>
  import("./components/AdminDashboard").then((module) => ({ default: module.AdminDashboard })),
);
const MyPage = lazy(() => import("./components/MyPage"));
const CommunityPostDetailPage = lazy(() =>
  import("./app/pages/CommunityPostDetailPage").then((module) => ({ default: module.CommunityPostDetailPage })),
);
const EducationVideosPage = lazy(() =>
  import("./app/pages/EducationVideosPage").then((module) => ({ default: module.EducationVideosPage })),
);
const PersonalizedEducationPage = lazy(() =>
  import("./app/pages/PersonalizedEducationPage").then((module) => ({ default: module.PersonalizedEducationPage })),
);
const VideoDetailPage = lazy(() =>
  import("./app/pages/VideoDetailPage").then((module) => ({ default: module.VideoDetailPage })),
);
const VideoListPage = lazy(() =>
  import("./app/pages/VideoListPage").then((module) => ({ default: module.VideoListPage })),
);
const WikiDetailPage = lazy(() =>
  import("./app/pages/WikiDetailPage").then((module) => ({ default: module.WikiDetailPage })),
);

export default function App() {
  const restoredNavigationState = readPersistedNavigationState();
  const DUPLICATE_NAVIGATION_WINDOW_MS = 500;
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem("currentUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("currentUser");
      return null;
    }
  });
  const [adminUser, setAdminUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    if (currentUser) {
      return restoredNavigationState.view || "homeFeed";
    }
    return "userLogin";
  });
  const [selectedTopicId, setSelectedTopicId] = useState(restoredNavigationState.topicId || "");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>((restoredNavigationState.video as Video) || null);
  const [selectedGuide, setSelectedGuide] = useState<GuideDetail | null>(
    (restoredNavigationState.guide as GuideDetail) || null,
  );
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(
    (restoredNavigationState.post as CommunityPost) || null,
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [videosByCategory, setVideosByCategory] = useState<Record<string, Video[]>>({});
  const [guideCategories, setGuideCategories] = useState<GuideCategory[]>([]);
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [documentPosts, setDocumentPosts] = useState<CommunityPost[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [personalizedProfile, setPersonalizedProfile] = useState<PersonalizedProfileInput>(readPersistedProfile);
  const [recommendationRule, setRecommendationRule] = useState<PersonalizedRecommendationRule | null>(null);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const initializedHistoryRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  const lastNavigationRequestRef = useRef<{ state: Partial<NavigationState>; timestamp: number } | null>(null);

  const getRecommendationCacheKey = (profile: PersonalizedProfileInput) =>
    `${RECOMMENDATION_CACHE_PREFIX}${profile.role}:${profile.careerStage}`;

  const getCommunityPostCacheKey = (postId: string) => `${COMMUNITY_POST_CACHE_PREFIX}${postId}`;

  const updateShellCache = (updater: (current: AppShellCache) => AppShellCache) => {
    const currentShell =
      readCachedValue<AppShellCache>(APP_SHELL_CACHE_KEY) ?? {
        categories,
        videosByCategory,
        guideCategories,
        guides,
        feedItems,
      };
    writeCachedValue(APP_SHELL_CACHE_KEY, updater(currentShell));
  };

  const syncSelectedEntities = (shell: AppShellCache) => {
    if (selectedGuide) {
      const refreshedGuide = shell.guides.find((guide) => guide.id === selectedGuide.id);
      if (refreshedGuide) {
        setSelectedGuide(refreshedGuide);
      }
    }

    if (selectedVideo) {
      const refreshedVideo = Object.values(shell.videosByCategory)
        .flat()
        .find((video) => video.id === selectedVideo.id);
      if (refreshedVideo) {
        setSelectedVideo(refreshedVideo);
      }
    }
  };

  const applyShellCache = (shell: AppShellCache) => {
    setCategories(shell.categories);
    setVideosByCategory(shell.videosByCategory);
    setGuideCategories(shell.guideCategories || []);
    setGuides(shell.guides);
    setFeedItems(shell.feedItems);
    syncSelectedEntities(shell);
  };

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (currentView !== "adminDashboard" || adminUser) return;

    navigateTo(
      "adminLogin",
      {
        topicId: "",
        video: null,
        guide: null,
        post: null,
      },
      { replace: true },
    );
  }, [adminUser, currentView]);

  const applyNavigationState = (state: NavigationState) => {
    setCurrentView(state.view);
    setSelectedTopicId(state.topicId || "");
    setSelectedVideo(state.video || null);
    setSelectedGuide(state.guide || null);
    setSelectedPost(state.post || null);
    persistNavigationState(state);
  };

  const navigateTo = (
    view: ViewState,
    context: {
      topicId?: string;
      video?: Video | null;
      guide?: GuideDetail | null;
      post?: CommunityPost | null;
    } = {},
    options: NavigateOptions = {},
  ) => {
    const currentHistoryState = window.history.state as NavigationState | null;
    const nextComparableState = {
      view,
      topicId: context.topicId !== undefined ? context.topicId : selectedTopicId,
      video: context.video !== undefined ? context.video : selectedVideo,
      guide: context.guide !== undefined ? context.guide : selectedGuide,
      post: context.post !== undefined ? context.post : selectedPost,
    };
    const isRapidDuplicateNavigation =
      !!lastNavigationRequestRef.current &&
      Date.now() - lastNavigationRequestRef.current.timestamp < DUPLICATE_NAVIGATION_WINDOW_MS &&
      isSameNavigationState(lastNavigationRequestRef.current.state, nextComparableState);
    const shouldReplace =
      options.replace || isSameNavigationState(currentHistoryState, nextComparableState) || isRapidDuplicateNavigation;
    const nextState: NavigationState = {
      view,
      topicId: nextComparableState.topicId,
      video: nextComparableState.video,
      guide: nextComparableState.guide,
      post: nextComparableState.post,
    };
    lastNavigationRequestRef.current = {
      state: nextComparableState,
      timestamp: Date.now(),
    };

    applyNavigationState(nextState);

    if (shouldReplace) {
      history.replaceState(nextState, "", window.location.href);
      return;
    }

    history.pushState(nextState, "", window.location.href);
  };

  useEffect(() => {
    if (!initializedHistoryRef.current) {
      const stateToPersist: NavigationState = {
        view: currentView,
        topicId: selectedTopicId,
        video: selectedVideo,
        guide: selectedGuide,
        post: selectedPost,
      };
      persistNavigationState(stateToPersist);
      history.replaceState(stateToPersist, "", window.location.href);
      initializedHistoryRef.current = true;
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as NavigationState | null;
      if (!state) {
        const fallbackState = {
          view: currentUserRef.current ? "homeFeed" : "userLogin",
          topicId: "",
          video: null,
          guide: null,
          post: null,
        };
        applyNavigationState(fallbackState);
        return;
      }

      applyNavigationState(state);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    void loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(PERSONALIZED_PROFILE_STORAGE_KEY, JSON.stringify(personalizedProfile));
    if (currentUser) {
      void loadRecommendationRule(personalizedProfile);
    }
  }, [currentUser, personalizedProfile]);

  useEffect(() => {
    const loadAttendanceRate = async () => {
      if (!currentUser?.employeeId) {
        setAttendanceRate(0);
        return;
      }

      try {
        const data = await apiRequestJson<{ logs?: Array<{ timestamp?: string }> }>(
          `/users/${currentUser.employeeId}/attendance/logs?month=${currentYearMonth}`,
        );
        const [yearStr, monthStr] = currentYearMonth.split("-");
        const year = Number(yearStr);
        const monthIndex = Number(monthStr) - 1;
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const uniqueDates = new Set((data.logs || []).map((log) => String(log.timestamp || "").slice(0, 10)).filter(Boolean));
        const rate = daysInMonth > 0 ? Math.round((uniqueDates.size / daysInMonth) * 1000) / 10 : 0;
        setAttendanceRate(rate);
      } catch (error) {
        console.error("Failed to load attendance rate:", error);
        setAttendanceRate(0);
      }
    };

    void loadAttendanceRate();
  }, [currentUser?.employeeId, currentYearMonth]);

  useEffect(() => {
    if (!currentUser) return;

    const handleContentChange = async (scopes: string[]) => {
      if (scopes.some((scope) => ["categories", "videos", "feed", "guides"].includes(scope))) {
        await loadInitialData({ force: true, showLoading: false });
      }

      if (scopes.includes("community")) {
        await loadDocumentPosts({ silent: true });
      }

      if (scopes.includes("recommendations")) {
        await loadRecommendationRule(personalizedProfile, { force: true, silent: true });
      }

      if (scopes.includes("community") && selectedPost?.id) {
        await loadCommunityPostDetail(selectedPost.id, { force: true, silent: true, navigate: false });
      }
    };

    const stopListening = listenContentChanges((detail) => {
      void handleContentChange(detail.scopes);
    });
    const stopRealtime = subscribeToRealtimeContentChanges((detail) => {
      void handleContentChange(detail.scopes);
    });

    return () => {
      stopListening();
      stopRealtime();
    };
  }, [currentUser, personalizedProfile, selectedPost?.id]);

  const loadInitialData = async ({
    force = false,
    showLoading = true,
  }: {
    force?: boolean;
    showLoading?: boolean;
  } = {}) => {
    const cachedShell = readCachedValue<AppShellCache>(APP_SHELL_CACHE_KEY);

    if (!force && cachedShell) {
      applyShellCache(cachedShell);
      setLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      const [categoriesData, feedData] = await Promise.all([
        apiRequestJson<{ categories?: Category[] }>("/categories"),
        apiRequestJson<{ items?: FeedItem[] }>("/feed"),
      ]);

      const loadedCategories = categoriesData.categories || [];
      const nextFeedItems = feedData.items || [];
      const nextShell: AppShellCache = {
        categories: loadedCategories,
        videosByCategory: cachedShell?.videosByCategory || {},
        guideCategories: cachedShell?.guideCategories || [],
        guides: cachedShell?.guides || [],
        feedItems: nextFeedItems,
      };

      setCategories(loadedCategories);
      setFeedItems(nextFeedItems);
      applyShellCache(nextShell);
      writeCachedValue(APP_SHELL_CACHE_KEY, nextShell);

      void loadGuides({ force, silent: true });
      void loadGuideCategories({ force, silent: true });
      void loadVideoCatalog(loadedCategories, { force, silent: true });
    } catch (error) {
      console.error("Failed to load app data:", error);
      if (cachedShell) {
        applyShellCache(cachedShell);
      } else {
        setVideosByCategory(mockVideos);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadVideoCatalog = async (
    categoriesToLoad: Category[],
    { force = false, silent = false }: { force?: boolean; silent?: boolean } = {},
  ) => {
    if (!categoriesToLoad.length) {
      setVideosByCategory({});
      return;
    }

    const cachedShell = readCachedValue<AppShellCache>(APP_SHELL_CACHE_KEY);
    const hasCachedVideos = !!cachedShell && Object.keys(cachedShell.videosByCategory || {}).length > 0;
    if (!force && hasCachedVideos) {
      setVideosByCategory(cachedShell.videosByCategory);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }

      const videoResponses = await Promise.all(
        categoriesToLoad.map((category) => apiRequestJson<{ videos?: Video[] }>(`/videos/${category.id}`)),
      );

      const nextVideosByCategory: Record<string, Video[]> = {};
      categoriesToLoad.forEach((category, index) => {
        const serverVideos = Array.isArray(videoResponses[index].videos) ? videoResponses[index].videos : [];
        nextVideosByCategory[category.id] = sortVideosByCreatedAt(serverVideos);
      });

      setVideosByCategory(nextVideosByCategory);
      updateShellCache((currentShell) => ({
        ...currentShell,
        categories: categoriesToLoad,
        videosByCategory: nextVideosByCategory,
      }));
    } catch (error) {
      console.error("Failed to load video catalog:", error);
      if (!cachedShell) {
        setVideosByCategory(mockVideos);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadRecommendationRule = async (
    profile: PersonalizedProfileInput,
    { force = false, silent = false }: { force?: boolean; silent?: boolean } = {},
  ) => {
    const cacheKey = getRecommendationCacheKey(profile);
    const cachedRule = readCachedValue<PersonalizedRecommendationRule | null>(cacheKey);

    if (!force && cachedRule !== null) {
      setRecommendationRule(cachedRule);
      return;
    }

    try {
      if (!silent) {
        setRecommendationLoading(true);
      }
      const data = await apiRequestJson<{ rule?: PersonalizedRecommendationRule | null }>(
        `/personalized-recommendations?role=${encodeURIComponent(profile.role)}&careerStage=${encodeURIComponent(
          profile.careerStage,
        )}`,
      );
      const nextRule = data.rule || null;
      setRecommendationRule(nextRule);
      writeCachedValue(cacheKey, nextRule);
    } catch (error) {
      console.error("Failed to load recommendation rule:", error);
      if (cachedRule !== null) {
        setRecommendationRule(cachedRule);
      } else {
        setRecommendationRule(null);
      }
    } finally {
      if (!silent) {
        setRecommendationLoading(false);
      }
    }
  };

  const refreshFeed = async () => {
    try {
      setFeedLoading(true);
      const data = await apiRequestJson<{ items?: FeedItem[] }>("/feed");
      const nextFeedItems = data.items || [];
      setFeedItems(nextFeedItems);
      updateShellCache((currentShell) => ({
        ...currentShell,
        feedItems: nextFeedItems,
      }));
    } catch (error) {
      console.error("Failed to refresh feed:", error);
    } finally {
      setFeedLoading(false);
    }
  };

  const loadGuides = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setWikiLoading(true);
      }
      const data = await apiRequestJson<{ guides?: GuideDetail[] }>("/guides?includeDrafts=false");
      const nextGuides = data.guides || [];
      setGuides(nextGuides);
      const nextShell = {
        ...(readCachedValue<AppShellCache>(APP_SHELL_CACHE_KEY) ?? {
          categories,
          videosByCategory,
          guideCategories,
          guides: [],
          feedItems,
        }),
        guides: nextGuides,
      };
      writeCachedValue(APP_SHELL_CACHE_KEY, nextShell);
      syncSelectedEntities(nextShell);
    } catch (error) {
      console.error("Failed to refresh guides:", error);
    } finally {
      if (!silent) {
        setWikiLoading(false);
      }
    }
  };

  const loadGuideCategories = async ({
    force = false,
    silent = false,
  }: {
    force?: boolean;
    silent?: boolean;
  } = {}) => {
    const cachedShell = readCachedValue<AppShellCache>(APP_SHELL_CACHE_KEY);
    const hasCachedCategories = !!cachedShell?.guideCategories?.length;
    if (!force && hasCachedCategories) {
      setGuideCategories(cachedShell.guideCategories);
      return;
    }

    try {
      if (!silent) {
        setWikiLoading(true);
      }
      const data = await apiRequestJson<{ categories?: GuideCategory[] }>("/document-categories");
      const nextGuideCategories = data.categories || [];
      setGuideCategories(nextGuideCategories);
      updateShellCache((currentShell) => ({
        ...currentShell,
        guideCategories: nextGuideCategories,
      }));
    } catch (error) {
      console.error("Failed to refresh document categories:", error);
    } finally {
      if (!silent) {
        setWikiLoading(false);
      }
    }
  };

  const loadDocumentPosts = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setDetailLoading(true);
      }
      const data = await apiRequestJson<{ posts?: CommunityPost[] }>("/community/posts?includeDrafts=false");
      const nextPosts = (data.posts || []).filter((post) => post.postType === "document");
      setDocumentPosts(nextPosts);
    } catch (error) {
      console.error("Failed to load document posts:", error);
    } finally {
      if (!silent) {
        setDetailLoading(false);
      }
    }
  };

  const loadCommunityPostDetail = async (
    postId: string,
    { force = false, silent = false, navigate = true }: { force?: boolean; silent?: boolean; navigate?: boolean } = {},
  ) => {
    const cacheKey = getCommunityPostCacheKey(postId);
    const cachedPost = readCachedValue<CommunityPost>(cacheKey);

    if (!force && cachedPost) {
      if (navigate) {
        navigateTo("communityPostDetail", { post: cachedPost });
      } else {
        setSelectedPost(cachedPost);
      }
      return;
    }

    try {
      if (!silent) {
        setDetailLoading(true);
      }
      const data = await apiRequestJson<{ post?: CommunityPost | null }>(`/community/posts/${postId}`);
      if (data.post) {
        writeCachedValue(cacheKey, data.post);
        if (navigate) {
          navigateTo("communityPostDetail", { post: data.post });
        } else {
          setSelectedPost(data.post);
        }
      }
    } catch (error) {
      console.error("Failed to load community post detail:", error);
      if (cachedPost && !navigate) {
        setSelectedPost(cachedPost);
      }
    } finally {
      if (!silent) {
        setDetailLoading(false);
      }
    }
  };

  const handleOpenVideoDetail = (video: Video) => {
    navigateTo("videoDetail", {
      topicId: video.categoryId || video.category || selectedTopicId,
      video,
    });
  };

  const handleSelectChatSource = async (source: ChatSource) => {
    if (source.target.type === "guide") {
      const targetGuide = guides.find((guide) => guide.id === source.target.id);
      if (targetGuide) {
        navigateTo("wikiDetail", { guide: targetGuide, video: null, post: null });
        return;
      }

      await loadGuides({ silent: true });
      const refreshedGuide = (readCachedValue<AppShellCache>(APP_SHELL_CACHE_KEY)?.guides || []).find(
        (guide) => guide.id === source.target.id,
      );
      if (refreshedGuide) {
        navigateTo("wikiDetail", { guide: refreshedGuide, video: null, post: null });
      }
      return;
    }

    await loadCommunityPostDetail(source.target.id, { force: true, silent: true, navigate: true });
  };

  const withRouteFallback = (content: ReactNode, message = "페이지를 불러오는 중...") => (
    <Suspense
      fallback={
        <Card>
          <CardContent className="py-16 text-center">{message}</CardContent>
        </Card>
      }
    >
      {content}
    </Suspense>
  );

  const handleFeedItemSelect = async (item: FeedItem) => {
    if (item.target.type === "video" && item.video) {
      handleOpenVideoDetail(item.video);
      return;
    }

    if (item.target.type === "post") {
      await loadCommunityPostDetail(item.target.id);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      history.back();
      return;
    }

    const fallbackState = {
      view: currentUser ? "homeFeed" : "userLogin",
      topicId: "",
      video: null,
      guide: null,
      post: null,
    };
    applyNavigationState(fallbackState);
    history.replaceState(fallbackState, "", window.location.href);
  };

  const handleUserLogin = (user: any) => {
    setCurrentUser(user);
    navigateTo(
      "homeFeed",
      {
        topicId: "",
        video: null,
        guide: null,
        post: null,
      },
      { replace: true },
    );
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    setSelectedVideo(null);
    setSelectedGuide(null);
    setSelectedPost(null);
    setSelectedTopicId("");
    navigateTo(
      "userLogin",
      {
        topicId: "",
        video: null,
        guide: null,
        post: null,
      },
      { replace: true },
    );
  };

  const handleAdminLogin = (admin: any) => {
    setAdminUser(admin);
    navigateTo(
      "adminDashboard",
      {
        topicId: "",
        video: null,
        guide: null,
        post: null,
      },
      { replace: true },
    );
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    navigateTo(
      currentUser ? "homeFeed" : "userLogin",
      {
        topicId: "",
        video: null,
        guide: null,
        post: null,
      },
      { replace: true },
    );
  };

  const currentTopic = useMemo(
    () => categories.find((category) => category.id === selectedTopicId) || null,
    [categories, selectedTopicId],
  );
  const currentVideos = useMemo(() => videosByCategory[selectedTopicId] || [], [selectedTopicId, videosByCategory]);
  const currentDocumentCategory = useMemo(
    () => guideCategories.find((category) => category.id === selectedTopicId) || null,
    [guideCategories, selectedTopicId],
  );
  const documentPostsByCategory = useMemo(
    () =>
      documentPosts.reduce<Record<string, CommunityPost[]>>((accumulator, post) => {
        const categoryId = String(post.metadata?.documentCategoryId || "uncategorized");
        if (!accumulator[categoryId]) {
          accumulator[categoryId] = [];
        }
        accumulator[categoryId].push(post);
        return accumulator;
      }, {}),
    [documentPosts],
  );
  const currentDocumentPosts = useMemo(
    () => documentPostsByCategory[selectedTopicId] || [],
    [documentPostsByCategory, selectedTopicId],
  );
  const documentCountByCategory = useMemo(
    () =>
      Object.entries(documentPostsByCategory).reduce<Record<string, number>>((accumulator, [categoryId, items]) => {
        accumulator[categoryId] = items.length;
        return accumulator;
      }, {}),
    [documentPostsByCategory],
  );
  const personalizedVideos = recommendationRule?.videos || [];

  if (currentView === "adminLogin") {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (currentView === "adminDashboard") {
    if (!adminUser) {
      return <AdminLogin onLogin={handleAdminLogin} />;
    }
    return (
      <Suspense fallback={<AppLoadingScreen />}>
        <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />
      </Suspense>
    );
  }

  if (currentView === "userLogin") {
    return <UserLogin onLogin={handleUserLogin} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_22%,#ffffff_100%)] text-slate-900">
      <AppHeader canGoBack={currentView !== "homeFeed"} onBack={handleBack} />

      <main className="app-shell-container relative z-0 container mx-auto flex-1 w-full px-4 py-8">
        {loading ? (
          <AppLoadingScreen />
        ) : (
          <div className="space-y-6">
            {currentView === "homeFeed" ? (
                <HomeFeedPage
                  currentUser={currentUser}
                  attendanceRate={attendanceRate}
                  onOpenEducationVideos={() => {
                    if (!Object.keys(videosByCategory).length && categories.length) {
                      void loadVideoCatalog(categories, { silent: true });
                  }
                  navigateTo("educationVideos", { video: null, guide: null, post: null });
                }}
                onOpenDocuments={() => {
                  if (!guideCategories.length) {
                    void loadGuideCategories({ silent: true });
                  }
                  if (!documentPosts.length) {
                    void loadDocumentPosts({ silent: true });
                  }
                  navigateTo("documentDocs", { video: null, guide: null, post: null });
                }}
                onOpenWikiDocs={() => {
                  if (!guides.length) {
                    void loadGuides({ silent: true });
                  }
                  navigateTo("wikiDocs", { video: null, guide: null, post: null });
                }}
                onOpenNotices={() => {
                  setIsComposerOpen(false);
                  navigateTo("notices", { video: null, guide: null, post: null });
                }}
                onOpenChatbot={() => navigateTo("chatbot", { video: null, guide: null, post: null })}
                onOpenPersonalizedEducation={() =>
                  navigateTo("personalizedEducation", { video: null, guide: null, post: null })
                }
                onGoMyPage={() => navigateTo("myPage", { video: null, guide: null, post: null })}
              />
            ) : null}

            {currentView === "chatbot" ? (
              withRouteFallback(
                <ChatbotPage currentUser={currentUser} onSelectSource={(source) => void handleSelectChatSource(source)} />,
              )
            ) : null}

            {currentView === "notices" ? (
              <NoticeFeedPage
                currentUser={currentUser}
                isComposerOpen={isComposerOpen}
                feedLoading={feedLoading}
                feedItems={feedItems}
                onToggleComposer={() => setIsComposerOpen((prev) => !prev)}
                onRefreshFeed={() => void refreshFeed()}
                onSubmittedComposer={() => {
                  setIsComposerOpen(false);
                  void refreshFeed();
                }}
                onCloseComposer={() => setIsComposerOpen(false)}
                onSelectFeedItem={handleFeedItemSelect}
              />
            ) : null}

            {currentView === "educationVideos" ? (
              withRouteFallback(
                <EducationVideosPage
                  categories={categories}
                  videosByCategory={videosByCategory}
                  onSelectCategory={(categoryId) => navigateTo("videoList", { topicId: categoryId, video: null })}
                />,
              )
            ) : null}

            {currentView === "videoList" ? (
              withRouteFallback(
                <VideoListPage
                  currentTopic={currentTopic}
                  currentVideos={currentVideos}
                  onSelectVideo={handleOpenVideoDetail}
                />,
              )
            ) : null}

            {currentView === "videoDetail" ? (
              withRouteFallback(
                <VideoDetailPage
                  selectedVideo={selectedVideo}
                  selectedTopicId={selectedTopicId}
                  videosByCategory={videosByCategory}
                  onSelectVideo={handleOpenVideoDetail}
                />,
              )
            ) : null}

            {currentView === "communityPostDetail" ? (
              detailLoading ? (
                <Card>
                  <CardContent className="py-16 text-center">게시물 상세를 불러오는 중...</CardContent>
                </Card>
              ) : (
                withRouteFallback(<CommunityPostDetailPage post={selectedPost} />, "게시물 화면을 불러오는 중...")
              )
            ) : null}

            {currentView === "documentDocs" ? (
              withRouteFallback(
                <DocumentCategoriesPage
                  categories={guideCategories}
                  documentCountByCategory={documentCountByCategory}
                  onSelectCategory={(categoryId) => navigateTo("documentList", { topicId: categoryId, post: null })}
                />,
              )
            ) : null}

            {currentView === "documentList" ? (
              withRouteFallback(
                <DocumentListPage
                  category={currentDocumentCategory}
                  posts={currentDocumentPosts}
                  onSelectPost={(post) => navigateTo("communityPostDetail", { topicId: selectedTopicId, post })}
                />,
              )
            ) : null}

            {currentView === "wikiDocs" ? (
              withRouteFallback(
                <WikiListPage
                  guides={guides}
                  wikiLoading={wikiLoading}
                  onRefresh={() => void loadGuides()}
                  onSelectGuide={(guide) => navigateTo("wikiDetail", { guide })}
                />,
              )
            ) : null}

            {currentView === "wikiDetail" ? withRouteFallback(<WikiDetailPage guide={selectedGuide} />) : null}

            {currentView === "personalizedEducation" ? (
              withRouteFallback(
                <PersonalizedEducationPage
                  personalizedProfile={personalizedProfile}
                  recommendationLoading={recommendationLoading}
                  personalizedVideos={personalizedVideos}
                  onUpdateProfile={setPersonalizedProfile}
                  onSelectVideo={handleOpenVideoDetail}
                />,
              )
            ) : null}

            {currentView === "myPage" ? withRouteFallback(<MyPage videosByCategory={videosByCategory} onBack={handleBack} />) : null}
          </div>
        )}
      </main>

      {currentUser ? (
        <AppFooter
          onGoHome={() => navigateTo("homeFeed", { video: null, guide: null, post: null })}
          onGoMyPage={() => navigateTo("myPage", { video: null, guide: null, post: null })}
          onGoAdmin={() => navigateTo("adminLogin", { video: null, guide: null, post: null })}
          onLogout={handleUserLogout}
        />
      ) : null}
    </div>
  );
}
