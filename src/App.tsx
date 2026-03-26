import { useEffect, useMemo, useRef, useState } from "react";
import { videos as mockVideos } from "./data/mockData";
import { Video } from "./types/video";
import {
  CommunityPost,
  FeedItem,
  GuideDetail,
  PersonalizedProfileInput,
  PersonalizedRecommendationRule,
} from "./types/content";
import { VideoItem } from "./components/VideoItem";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoDescription } from "./components/VideoDescription";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserLogin } from "./components/UserLogin";
import MyPage from "./components/MyPage";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import {
  ArrowLeft,
  BookOpen,
  FileImage,
  FileText,
  Home,
  LogOut,
  Play,
  Settings,
  Sparkles,
  User,
  Video as VideoIcon,
} from "lucide-react";
import logo from "./assets/logo.png";
import { apiRequest } from "./lib/api";
import { formatDurationLabel } from "./lib/video";

interface Category {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  description: string;
}

type ViewState =
  | "homeFeed"
  | "educationVideos"
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

interface NavigationState {
  view: ViewState;
  topicId?: string;
  video?: Video | null;
  guide?: GuideDetail | null;
  post?: CommunityPost | null;
}

const NAV_STATE_STORAGE_KEY = "app-navigation-state-v2";
const PERSONALIZED_PROFILE_STORAGE_KEY = "personalized-profile-input";

const readPersistedNavigationState = (): Partial<NavigationState> => {
  try {
    const raw = sessionStorage.getItem(NAV_STATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Failed to parse persisted navigation state:", error);
    return {};
  }
};

const persistNavigationState = (state: NavigationState) => {
  try {
    sessionStorage.setItem(NAV_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to persist navigation state:", error);
  }
};

const readPersistedProfile = (): PersonalizedProfileInput => {
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

const sortVideosByCreatedAt = (videos: Video[]) =>
  [...videos].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

const formatDateTime = (value?: string | null) => {
  if (!value) return "등록 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const markdownToPlainText = (value?: string | null) =>
  String(value || "")
    .replace(/^#+\s?/gm, "")
    .replace(/\*\*/g, "")
    .trim();

export default function App() {
  const restoredNavigationState = readPersistedNavigationState();

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
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [personalizedProfile, setPersonalizedProfile] = useState<PersonalizedProfileInput>(readPersistedProfile);
  const [recommendationRule, setRecommendationRule] = useState<PersonalizedRecommendationRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const initializedHistoryRef = useRef(false);

  const navigateTo = (
    view: ViewState,
    context: {
      topicId?: string;
      video?: Video | null;
      guide?: GuideDetail | null;
      post?: CommunityPost | null;
    } = {},
  ) => {
    const nextState: NavigationState = {
      view,
      topicId: context.topicId !== undefined ? context.topicId : selectedTopicId,
      video: context.video !== undefined ? context.video : selectedVideo,
      guide: context.guide !== undefined ? context.guide : selectedGuide,
      post: context.post !== undefined ? context.post : selectedPost,
    };

    setCurrentView(view);
    setSelectedTopicId(nextState.topicId || "");
    setSelectedVideo(nextState.video || null);
    setSelectedGuide(nextState.guide || null);
    setSelectedPost(nextState.post || null);
    persistNavigationState(nextState);
    history.pushState(nextState, "", window.location.href);
  };

  useEffect(() => {
    if (initializedHistoryRef.current) return;

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

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as NavigationState | null;
      if (!state) {
        setCurrentView(currentUser ? "homeFeed" : "userLogin");
        return;
      }

      setCurrentView(state.view || "homeFeed");
      setSelectedTopicId(state.topicId || "");
      setSelectedVideo(state.video || null);
      setSelectedGuide(state.guide || null);
      setSelectedPost(state.post || null);
      persistNavigationState(state);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUser, currentView, selectedGuide, selectedPost, selectedTopicId, selectedVideo]);

  useEffect(() => {
    if (!currentUser) return;
    loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(PERSONALIZED_PROFILE_STORAGE_KEY, JSON.stringify(personalizedProfile));
    if (currentUser) {
      loadRecommendationRule(personalizedProfile);
    }
  }, [currentUser, personalizedProfile]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [categoriesResponse, feedResponse, guidesResponse] = await Promise.all([
        apiRequest("/categories"),
        apiRequest("/feed"),
        apiRequest("/guides?includeDrafts=false"),
      ]);

      const categoriesData = await categoriesResponse.json();
      const guidesData = await guidesResponse.json();
      const feedData = await feedResponse.json();
      const loadedCategories = categoriesData.categories || [];

      setCategories(loadedCategories);
      setGuides(guidesData.guides || []);
      setFeedItems(feedData.items || []);

      const videoResponses = await Promise.all(
        loadedCategories.map((category: Category) => apiRequest(`/videos/${category.id}`)),
      );
      const videoPayloads = await Promise.all(videoResponses.map((response) => response.json()));

      const nextVideosByCategory: Record<string, Video[]> = {};
      loadedCategories.forEach((category: Category, index: number) => {
        const serverVideos = Array.isArray(videoPayloads[index].videos) ? videoPayloads[index].videos : [];
        nextVideosByCategory[category.id] = sortVideosByCreatedAt(serverVideos);
      });

      setVideosByCategory(nextVideosByCategory);
      await loadRecommendationRule(personalizedProfile);
    } catch (error) {
      console.error("Failed to load app data:", error);
      setVideosByCategory(mockVideos);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendationRule = async (profile: PersonalizedProfileInput) => {
    try {
      setRecommendationLoading(true);
      const response = await apiRequest(
        `/personalized-recommendations?role=${encodeURIComponent(profile.role)}&careerStage=${encodeURIComponent(
          profile.careerStage,
        )}`,
      );
      const data = await response.json();
      setRecommendationRule(data.rule || null);
    } catch (error) {
      console.error("Failed to load recommendation rule:", error);
      setRecommendationRule(null);
    } finally {
      setRecommendationLoading(false);
    }
  };

  const refreshFeed = async () => {
    try {
      setFeedLoading(true);
      const response = await apiRequest("/feed");
      const data = await response.json();
      setFeedItems(data.items || []);
    } catch (error) {
      console.error("Failed to refresh feed:", error);
    } finally {
      setFeedLoading(false);
    }
  };

  const loadGuides = async () => {
    try {
      setWikiLoading(true);
      const response = await apiRequest("/guides?includeDrafts=false");
      const data = await response.json();
      setGuides(data.guides || []);
    } catch (error) {
      console.error("Failed to refresh guides:", error);
    } finally {
      setWikiLoading(false);
    }
  };

  const loadCommunityPostDetail = async (postId: string) => {
    try {
      setDetailLoading(true);
      const response = await apiRequest(`/community/posts/${postId}`);
      const data = await response.json();
      if (data.post) {
        navigateTo("communityPostDetail", { post: data.post });
      }
    } catch (error) {
      console.error("Failed to load community post detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenVideoDetail = (video: Video) => {
    navigateTo("videoDetail", {
      topicId: video.categoryId || video.category || selectedTopicId,
      video,
    });
  };

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
      window.history.back();
      return;
    }

    navigateTo(currentUser ? "homeFeed" : "userLogin", {
      topicId: "",
      video: null,
      guide: null,
      post: null,
    });
  };

  const handleUserLogin = (user: any) => {
    setCurrentUser(user);
    navigateTo("homeFeed", {
      topicId: "",
      video: null,
      guide: null,
      post: null,
    });
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    setSelectedVideo(null);
    setSelectedGuide(null);
    setSelectedPost(null);
    setSelectedTopicId("");
    navigateTo("userLogin", {
      topicId: "",
      video: null,
      guide: null,
      post: null,
    });
  };

  const handleAdminLogin = (admin: any) => {
    setAdminUser(admin);
    navigateTo("adminDashboard", {
      topicId: "",
      video: null,
      guide: null,
      post: null,
    });
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    navigateTo(currentUser ? "homeFeed" : "userLogin", {
      topicId: "",
      video: null,
      guide: null,
      post: null,
    });
  };

  const allVideos = useMemo(() => Object.values(videosByCategory).flat(), [videosByCategory]);
  const currentTopic = useMemo(
    () => categories.find((category) => category.id === selectedTopicId) || null,
    [categories, selectedTopicId],
  );
  const currentVideos = useMemo(() => videosByCategory[selectedTopicId] || [], [selectedTopicId, videosByCategory]);
  const personalizedVideos = recommendationRule?.videos || [];

  if (currentView === "adminLogin") {
    return <AdminLogin onLogin={handleAdminLogin} onBack={handleBack} />;
  }

  if (currentView === "adminDashboard") {
    return <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />;
  }

  if (currentView === "userLogin") {
    return <UserLogin onLogin={handleUserLogin} onBack={handleBack} />;
  }

  const renderFeedItem = (item: FeedItem) => {
    const icon =
      item.itemType === "video" ? (
        <VideoIcon className="h-4 w-4" />
      ) : item.itemType === "image" ? (
        <FileImage className="h-4 w-4" />
      ) : (
        <FileText className="h-4 w-4" />
      );

    return (
      <Card
        key={item.id}
        className="overflow-hidden border-0 bg-white/90 shadow-lg shadow-slate-200/50 transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        <button type="button" onClick={() => handleFeedItemSelect(item)} className="block w-full text-left">
          <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-56 overflow-hidden bg-slate-100">
              <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
              <div className="absolute left-4 top-4">
                <Badge className="bg-slate-900/85 text-white">{icon}{item.itemType === "video" ? "교육영상" : item.itemType === "image" ? "이미지 게시물" : "문서 게시물"}</Badge>
              </div>
            </div>
            <div className="flex flex-col justify-between p-6">
              <div className="space-y-3">
                <p className="text-sm text-slate-500">{formatDateTime(item.publishedAt)}</p>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{item.title}</h3>
                <p className="line-clamp-4 text-base leading-relaxed text-slate-600">{item.summary}</p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-700">
                <span>상세페이지 보기</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </div>
            </div>
          </div>
        </button>
      </Card>
    );
  };

  const renderEducationVideoCards = () => (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => navigateTo("videoList", { topicId: category.id, video: null })}
          className="group overflow-hidden rounded-[28px] bg-white text-left shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="relative h-48 overflow-hidden">
            <img src={category.image} alt={category.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-sm font-medium text-blue-100">{category.subtitle}</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{category.title}</h3>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{category.description}</p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{videosByCategory[category.id]?.length || 0}개 영상</Badge>
              <span className="text-sm font-medium text-blue-700">영상 보기</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderVideoDetail = () => {
    if (!selectedVideo) return null;

    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <Badge variant="secondary">영상 상세페이지</Badge>
          <h2 className="text-3xl font-bold text-slate-900">{selectedVideo.title}</h2>
          <p className="text-sm text-slate-500">
            {formatDateTime(selectedVideo.updatedAt || selectedVideo.createdAt)} · {formatDurationLabel(selectedVideo.duration)}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">
            <VideoPlayer video={selectedVideo} categoryId={selectedVideo.categoryId || selectedTopicId} />
            <Card>
              <CardHeader>
                <CardTitle>영상 설명</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{selectedVideo.description}</p>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <VideoDescription video={selectedVideo} />
            <Card>
              <CardHeader>
                <CardTitle>관련 영상</CardTitle>
                <CardDescription>같은 주제에서 이어서 볼 수 있는 콘텐츠입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(videosByCategory[selectedVideo.categoryId || selectedTopicId] || [])
                  .filter((video) => video.id !== selectedVideo.id)
                  .slice(0, 3)
                  .map((video) => (
                    <VideoItem key={video.id} video={video} onSelect={handleOpenVideoDetail} />
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderPostDetail = () => {
    if (!selectedPost) return null;

    const imageAssets = selectedPost.assets.filter((asset) => asset.assetType === "image");
    const documentAssets = selectedPost.assets.filter((asset) => asset.assetType === "document");

    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-3">
          <Badge variant="secondary">게시물 상세페이지</Badge>
          <h2 className="text-3xl font-bold text-slate-900">{selectedPost.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{formatDateTime(selectedPost.publishedAt || selectedPost.updatedAt)}</span>
            <span>작성자 {selectedPost.authorName || "관리자"}</span>
            <span>좋아요 {selectedPost.likeCount}</span>
            <span>댓글 {selectedPost.commentCount}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>요약 및 본문</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPost.summary ? <p className="text-lg font-medium text-slate-800">{selectedPost.summary}</p> : null}
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{selectedPost.content || "본문이 없습니다."}</p>
          </CardContent>
        </Card>

        {imageAssets.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>이미지 미리보기</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {imageAssets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-2xl border bg-slate-50">
                  {asset.previewUrl || asset.thumbnailUrl ? (
                    <img
                      src={asset.previewUrl || asset.thumbnailUrl || ""}
                      alt={asset.fileName}
                      className="h-72 w-full object-cover"
                    />
                  ) : null}
                  <div className="p-4">
                    <p className="font-medium text-slate-900">{asset.fileName}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {documentAssets.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>문서 첨부</CardTitle>
              <CardDescription>PDF 또는 문서 원본을 확인할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentAssets.map((asset) => (
                <div key={asset.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{asset.fileName}</p>
                      <p className="text-sm text-slate-500">{asset.mimeType || "문서"}</p>
                    </div>
                    {asset.previewUrl ? (
                      <a
                        href={asset.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                      >
                        문서 열기
                      </a>
                    ) : null}
                  </div>
                  {asset.previewUrl && asset.mimeType?.includes("pdf") ? (
                    <div className="mt-4 overflow-hidden rounded-xl border">
                      <iframe src={asset.previewUrl} title={asset.fileName} className="h-[480px] w-full bg-white" />
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  };

  const renderWikiList = () => (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">위키문서</Badge>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">운영 가이드와 위키 문서</h2>
          <p className="mt-2 text-slate-600">공개된 교육 가이드를 문서 형태로 탐색할 수 있습니다.</p>
        </div>
        <Button variant="outline" onClick={loadGuides} disabled={wikiLoading}>
          {wikiLoading ? "불러오는 중..." : "새로고침"}
        </Button>
      </div>
      <div className="grid gap-4">
        {guides.map((guide) => (
          <button
            key={guide.id}
            type="button"
            onClick={() => navigateTo("wikiDetail", { guide })}
            className="rounded-[24px] border bg-white p-6 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">v{guide.version}</Badge>
              <span className="text-sm text-slate-500">{formatDateTime(guide.updatedAt)}</span>
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-slate-900">{guide.title}</h3>
            <p className="mt-3 line-clamp-3 text-slate-600">{guide.description}</p>
            <p className="mt-4 text-sm font-medium text-blue-700">문서 읽기</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderWikiDetail = () => {
    if (!selectedGuide) return null;

    return (
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>문서 목차</CardTitle>
            <CardDescription>{selectedGuide.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedGuide.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  const target = document.getElementById(`guide-section-${section.id}`);
                  target?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                style={{ paddingLeft: `${section.depth * 14 + 12}px` }}
              >
                {section.title}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="space-y-3">
            <Badge variant="secondary">위키 상세</Badge>
            <h2 className="text-3xl font-bold text-slate-900">{selectedGuide.title}</h2>
            <p className="text-slate-600">{selectedGuide.description}</p>
            <p className="text-sm text-slate-500">{formatDateTime(selectedGuide.updatedAt)}</p>
          </div>

          {selectedGuide.sections.map((section) => (
            <Card key={section.id} id={`guide-section-${section.id}`}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {markdownToPlainText(section.markdownContent)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderPersonalizedEducation = () => (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-3">
        <Badge variant="secondary">나를 위한 맞춤형 교육</Badge>
        <h2 className="text-3xl font-bold text-slate-900">직책과 경력 구분에 맞는 추천 영상</h2>
        <p className="text-slate-600">선택값은 언제든 바꿀 수 있고, 변경 즉시 권장 교육 목록이 다시 구성됩니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>추천 기준 선택</CardTitle>
          <CardDescription>현재 내 조건에 맞는 교육 영상을 바로 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">직책</p>
            <Select
              value={personalizedProfile.role}
              onValueChange={(value) =>
                setPersonalizedProfile((prev) => ({ ...prev, role: value as PersonalizedProfileInput["role"] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="기관사">기관사</SelectItem>
                <SelectItem value="차장">차장</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">경력 구분</p>
            <Select
              value={personalizedProfile.careerStage}
              onValueChange={(value) =>
                setPersonalizedProfile((prev) => ({
                  ...prev,
                  careerStage: value as PersonalizedProfileInput["careerStage"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="신입">신입</SelectItem>
                <SelectItem value="경력">경력</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{personalizedProfile.role}</Badge>
          <Badge variant="secondary">{personalizedProfile.careerStage}</Badge>
        </div>

        {recommendationLoading ? (
          <Card>
            <CardContent className="py-12 text-center">추천 영상을 불러오는 중...</CardContent>
          </Card>
        ) : personalizedVideos.length > 0 ? (
          <div className="space-y-4">
            {personalizedVideos.map((video) => (
              <VideoItem key={video.id} video={video} onSelect={handleOpenVideoDetail} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-slate-600">
              현재 선택한 조건에 등록된 추천 영상이 없습니다. 다른 조건으로 바꾸거나 관리자에게 추천 규칙을 등록해달라고 요청하세요.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_22%,#ffffff_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            {currentView !== "homeFeed" ? (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <img src={logo} alt="동대문승무사업소 불안제로" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold">동대문승무사업소 불안제로</h1>
              <p className="text-sm text-slate-500">교육영상 · 문서 · 맞춤 학습 허브</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Card className="w-full max-w-lg">
              <CardContent className="py-16 text-center">서비스 데이터를 불러오는 중...</CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            {currentView === "homeFeed" ? (
              <>
                <section className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_46%,#38bdf8_100%)] px-6 py-8 text-white shadow-2xl shadow-blue-200/40 md:px-10">
                  <div className="max-w-3xl">
                    <p className="text-sm font-medium tracking-[0.22em] text-blue-100 uppercase">Main Feed</p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                      {currentUser?.name || "사용자"}님, 오늘 필요한 교육과 문서를 한 화면에서 확인하세요.
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-blue-50 md:text-lg">
                      최신 교육영상과 문서/이미지 게시물을 피드처럼 정렬했습니다. 필요한 자료를 눌러 상세페이지에서 바로 확인할 수 있습니다.
                    </p>
                    <div className="mt-8 grid gap-3 md:grid-cols-3">
                      <Button
                        onClick={() => navigateTo("educationVideos", { video: null, guide: null, post: null })}
                        className="h-12 justify-start bg-white text-slate-900 hover:bg-blue-50"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        교육영상
                      </Button>
                      <Button
                        onClick={() => navigateTo("wikiDocs", { video: null, guide: null, post: null })}
                        className="h-12 justify-start bg-white/15 text-white hover:bg-white/25"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        위키문서
                      </Button>
                      <Button
                        onClick={() => navigateTo("personalizedEducation", { video: null, guide: null, post: null })}
                        className="h-12 justify-start bg-slate-950/30 text-white hover:bg-slate-950/45"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        나를 위한 맞춤형 교육
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold">최신 게시물</h3>
                      <p className="text-slate-600">교육영상과 문서/이미지 게시물을 최신순으로 보여줍니다.</p>
                    </div>
                    <Button variant="outline" onClick={refreshFeed} disabled={feedLoading}>
                      {feedLoading ? "새로고침 중..." : "새로고침"}
                    </Button>
                  </div>
                  <div className="space-y-6">
                    {feedItems.map(renderFeedItem)}
                  </div>
                </section>
              </>
            ) : null}

            {currentView === "educationVideos" ? (
              <section className="space-y-6">
                <div className="space-y-2">
                  <Badge variant="secondary">교육영상</Badge>
                  <h2 className="text-3xl font-bold text-slate-900">주제별 교육 영상 탐색</h2>
                  <p className="text-slate-600">카테고리를 선택하면 관련 영상 목록과 상세 재생 화면으로 이동합니다.</p>
                </div>
                {renderEducationVideoCards()}
              </section>
            ) : null}

            {currentView === "videoList" ? (
              <section className="space-y-6">
                <div className="space-y-2">
                  <Badge variant="secondary">교육영상 목록</Badge>
                  <h2 className="text-3xl font-bold text-slate-900">{currentTopic?.title}</h2>
                  <p className="text-slate-600">{currentTopic?.description}</p>
                </div>
                <div className="space-y-4">
                  {currentVideos.map((video) => (
                    <VideoItem key={video.id} video={video} onSelect={handleOpenVideoDetail} />
                  ))}
                </div>
              </section>
            ) : null}

            {currentView === "videoDetail" ? renderVideoDetail() : null}
            {currentView === "communityPostDetail" ? (detailLoading ? <Card><CardContent className="py-16 text-center">게시물 상세를 불러오는 중...</CardContent></Card> : renderPostDetail()) : null}
            {currentView === "wikiDocs" ? renderWikiList() : null}
            {currentView === "wikiDetail" ? renderWikiDetail() : null}
            {currentView === "personalizedEducation" ? renderPersonalizedEducation() : null}
            {currentView === "myPage" ? <MyPage videosByCategory={videosByCategory} onBack={handleBack} /> : null}
          </div>
        )}
      </main>

      {currentUser ? (
        <footer className="border-t bg-white/80 backdrop-blur">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-3 px-4 py-5">
            <Button variant="outline" size="sm" onClick={() => navigateTo("homeFeed", { video: null, guide: null, post: null })}>
              <Home className="mr-2 h-4 w-4" />
              메인
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateTo("myPage", { video: null, guide: null, post: null })}>
              <User className="mr-2 h-4 w-4" />
              내 페이지
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateTo("adminLogin", { video: null, guide: null, post: null })}>
              <Settings className="mr-2 h-4 w-4" />
              관리자
            </Button>
            <Button variant="outline" size="sm" onClick={handleUserLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
