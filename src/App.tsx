import { useState, useEffect, useRef } from "react";
import { videos as mockVideos } from "./data/mockData"; // 서버 실패 시만 사용
import { Video } from "./types/video";
import { TopicCard } from "./components/TopicCard";
import { VideoItem } from "./components/VideoItem";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoDescription } from "./components/VideoDescription";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserLogin } from "./components/UserLogin";
import MyPage from "./components/MyPage";
import { Button } from "./components/ui/button";
import {
  ArrowLeft,
  Play,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './utils/supabase/info';
import logo from "./assets/logo.png"; // 타입 선언 추가 필요
import { set } from "./supabase/functions/server/kv_store";


interface Category {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  description: string;
}

type ViewState =
  | "topics"
  | "videoList"
  | "videoPlayer"
  | "adminLogin"
  | "adminDashboard"
  | "userLogin"
  | "myPage";

const CARD_TRANSITION_DURATION = 420;
const PAGE_TRANSITION_DURATION = 260;

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem("currentUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Failed to parse saved user:", error);
      localStorage.removeItem("currentUser");
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      if (typeof history !== 'undefined' && history.state && history.state.view) {
        return history.state.view;
      }
      return "topics";
    }
    return "userLogin";
  });

  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => {
    if (typeof history !== 'undefined' && history.state && history.state.topicId) {
      return history.state.topicId;
    }
    return "";
  });

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(() => {
    if (typeof history !== 'undefined' && history.state && history.state.video) {
      return history.state.video;
    }
    return null;
  });

  const [adminUser, setAdminUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [videosByCategory, setVideosByCategory] = useState<Record<string, Video[]>>({});
  const [videosLoading, setVideosLoading] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [pageTransitionState, setPageTransitionState] = useState<"idle" | "fade-out" | "fade-in">("idle");
  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const navigateTo = (view: ViewState, context: { topicId?: string; video?: Video | null } = {}) => {
    setCurrentView(view);
    const newState = {
      view,
      topicId: context.topicId !== undefined ? context.topicId : selectedTopicId,
      video: context.video !== undefined ? context.video : selectedVideo,
    };
    history.pushState(newState, '', window.location.href);
  };

  // 뒤로가기 버튼 처리
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If the popped state contains a view, use it. Otherwise fall back to topics.
      const state = event.state || {};
      const view = state.view || "topics";
      setCurrentView(view);
      setSelectedTopicId(state.topicId || "");
      setSelectedVideo(state.video || null);
    };

    // Ensure the initial history entry has a view so back/forward work predictably.
    try {
      history.replaceState({
        view: currentView,
        topicId: selectedTopicId,
        video: selectedVideo
      }, '', window.location.href);
    } catch (e) {
      // ignore (some environments may not allow replaceState)
    }

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Empty dependency array is fine as we want this to run once, but be careful with closure if we used state inside handlePopState (we don't much)

  // 페이지 로드 시 저장된 사용자 정보 확인
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  // 카테고리 로딩
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/categories`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }, cache: 'no-store',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      const loadedCategories = data.categories || [];
      setCategories(loadedCategories);

      // 각 카테고리의 영상 개수를 미리 로드
      const videoCounts: Record<string, Video[]> = {};
      for (const category of loadedCategories) {
        try {
          const videoResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/videos/${category.id}`,
            {
              headers: { 'Authorization': `Bearer ${publicAnonKey}` }, cache: 'no-store',
            }
          );
          if (videoResponse.ok) {
            const videoData = await videoResponse.json();
            const videos = Array.isArray(videoData.videos) ? videoData.videos : [];
            videoCounts[category.id] = videos;
          } else {
            // 서버 실패 시 mock 데이터로 폴백
            videoCounts[category.id] = mockVideos[category.id] || [];
          }
        } catch (error) {
          console.error(`Error loading videos for category ${category.id}:`, error);
          // 에러 시 mock 데이터로 폴백
          videoCounts[category.id] = mockVideos[category.id] || [];
        }
      }

      setVideosByCategory(videoCounts);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearTransitionTimers = () => {
    transitionTimers.current.forEach((timerId) => clearTimeout(timerId));
    transitionTimers.current = [];
  };

  const queueTransitionTimer = (callback: () => void, delay: number) => {
    const timerId = setTimeout(() => {
      transitionTimers.current = transitionTimers.current.filter((id) => id !== timerId);
      callback();
    }, delay);

    transitionTimers.current.push(timerId);
    return timerId;
  };

  const stopTransitions = (options?: { resetActive?: boolean }) => {
    clearTransitionTimers();
    setPageTransitionState("idle");
    if (options?.resetActive) {
      setActiveCard(null);
    }
  };

  const handleTopicSelect = (topicId: string) => {
    if (activeCard || pageTransitionState === "fade-out") {
      return;
    }

    stopTransitions({ resetActive: true });
    setActiveCard(topicId);
    setSelectedTopicId(topicId);
    loadVideosForCategory(topicId);

    const fadeOutDelay = Math.max(0, CARD_TRANSITION_DURATION - PAGE_TRANSITION_DURATION);

    if (fadeOutDelay === 0) {
      setPageTransitionState("fade-out");
    } else {
      queueTransitionTimer(() => setPageTransitionState("fade-out"), fadeOutDelay);
    }

    queueTransitionTimer(() => {
      navigateTo("videoList", { topicId });
      setActiveCard(null);
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, CARD_TRANSITION_DURATION);
  };

  const handleVideoSelect = (video: Video) => {
    stopTransitions();
    setSelectedVideo(video);
    setPageTransitionState("fade-out");

    queueTransitionTimer(() => {
      navigateTo("videoPlayer", { topicId: selectedTopicId, video });
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, PAGE_TRANSITION_DURATION);
  };

  const handleBackToTopics = () => {
    stopTransitions({ resetActive: true });
    setPageTransitionState("fade-out");

    queueTransitionTimer(() => {
      navigateTo("topics", { topicId: "", video: null });
      setSelectedTopicId("");
      setSelectedVideo(null);
      setActiveCard(null);
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, PAGE_TRANSITION_DURATION);
  };

  const handleBackToVideoList = () => {
    stopTransitions();
    setPageTransitionState("fade-out");

    queueTransitionTimer(() => {
      navigateTo("videoList", { topicId: selectedTopicId, video: null });
      setSelectedVideo(null);
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, PAGE_TRANSITION_DURATION);
  };

  const handleAdminLogin = (admin: any) => {
    stopTransitions();
    setAdminUser(admin);
    setPageTransitionState("fade-out");

    queueTransitionTimer(() => {
      navigateTo("adminDashboard", { topicId: "", video: null });
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, PAGE_TRANSITION_DURATION);
  };

  const handleAdminLogout = () => {
    stopTransitions({ resetActive: true });
    setAdminUser(null);
    setPageTransitionState("fade-out");

    queueTransitionTimer(() => {
      navigateTo("topics", { topicId: "", video: null });
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, PAGE_TRANSITION_DURATION);
  };

  const handleUserLogin = (user: any) => {
    stopTransitions({ resetActive: true });
    setCurrentUser(user);
    setPageTransitionState("fade-out");

    queueTransitionTimer(() => {
      navigateTo("topics", { topicId: "", video: null });
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, PAGE_TRANSITION_DURATION);
  };

  const handleUserLogout = () => {
    stopTransitions({ resetActive: true });
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    setPageTransitionState("fade-out");

    queueTransitionTimer(() => {
      navigateTo("userLogin", { topicId: "", video: null });
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, PAGE_TRANSITION_DURATION);
  };

  const handleGoToMyPage = () => {
    // Use the same transition pattern as other navigations so MyPage fades in/out
    stopTransitions({ resetActive: true });
    setPageTransitionState("fade-out");

    queueTransitionTimer(() => {
      navigateTo("myPage", { topicId: "", video: null });
      setPageTransitionState("fade-in");

      queueTransitionTimer(() => {
        setPageTransitionState("idle");
      }, PAGE_TRANSITION_DURATION);
    }, PAGE_TRANSITION_DURATION);
  };

  const getCurrentVideos = () => {
    return videosByCategory[selectedTopicId] || [];
  };

  const getCurrentTopic = () => {
    return categories.find((category) => category.id === selectedTopicId);
  };

  // 카테고리별 영상 로딩
  const loadVideosForCategory = async (categoryId: string) => {
    if (!categoryId) return;
    try {
      setVideosLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/videos/${categoryId}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }, cache: 'no-store',
        }
      );
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      const serverVideos: Video[] = Array.isArray(data.videos) ? data.videos : [];
      setVideosByCategory(prev => ({ ...prev, [categoryId]: serverVideos }));
    } catch (error) {
      console.error('Error loading videos:', error);
      // 서버 실패 시 mock으로 폴백
      setVideosByCategory(prev => ({ ...prev, [categoryId]: mockVideos[categoryId] || [] }));
    } finally {
      setVideosLoading(false);
    }
  };

  const pageTransitionClassName = [
    "page-transition",
    pageTransitionState === "fade-out" ? "page-transition--fade-out" : "",
    pageTransitionState === "fade-in" ? "page-transition--fade-in" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    return () => {
      clearTransitionTimers();
    };
  }, []);

  // 별도 화면들은 별도 렌더링
  if (currentView === "adminLogin") {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        onBack={() => setCurrentView("topics")}
      />
    );
  }

  if (currentView === "adminDashboard") {
    return (
      <AdminDashboard
        admin={adminUser}
        onLogout={handleAdminLogout}
      />
    );
  }

  if (currentView === "userLogin") {
    return (
      <UserLogin
        onLogin={handleUserLogin}
        onBack={() => setCurrentView("topics")}
      />
    );
  }


  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {currentView !== "topics" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Prefer returning to topics for MyPage and VideoList.
                    if (currentView === "videoList" || currentView === "myPage") {
                      return handleBackToTopics();
                    }
                    if (currentView === "videoPlayer") {
                      return handleBackToVideoList();
                    }
                    // Fallback
                    return handleBackToTopics();
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="flex items-center gap-1">
                <img src={logo} alt="Logo" className="w-8 h-8 object-contain self-center" />
                <h1 className="text-xl font-bold">
                  동대문승무사업소 불안제로
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 container mx-auto px-4 py-4">
        <div className={pageTransitionClassName}>
          {currentView === "topics" && (
            <div>
              {/* 환영 메시지 */}
              <div className="mb-12 text-center">
                <div className="mb-6">
                  {currentUser && (
                    <div>
                      <h1 className="text-2xl font-bold mt-4">
                        {currentUser.name}님!
                      </h1>
                      <h2 className="gemini text-xl mb-4">
                        불안제로에 오신 것을 환영합니다! 👋
                      </h2>
                      <p className="text-muted-foreground max-w-2xl mx-auto">
                        안전한 지하철을 만들기 위한 학습을
                        시작해보세요.
                      </p>
                      <p className="text-muted-foreground max-w-2xl mx-auto">
                        동대문승무사업소 학습동아리가 준비한

                      </p>
                      <p className="text-muted-foreground max-w-2xl mx-auto">

                        안전교육영상으로 지금 배워보세요.
                      </p>
                      {currentUser.isNewUser && (
                        <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto">
                          <p className="text-sm text-primary">
                            🎉 처음 방문하신 것을 환영합니다! 학습
                            진행률이 자동으로 저장됩니다.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {currentUser && (<div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p>카테고리를 불러오는 중...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((category) => {
                      const isActive = activeCard === category.id;
                      const isDimmed = Boolean(activeCard && !isActive);
                      const wrapperClasses = `transform transition-all duration-300 ${activeCard ? "cursor-default" : "cursor-pointer hover:scale-[1.03] hover:shadow-2xl"
                        } ${isDimmed ? "pointer-events-none opacity-60" : ""}`.trim();

                      return (
                        <div
                          key={category.id}
                          onClick={() => (!activeCard ? handleTopicSelect(category.id) : undefined)}
                          className={wrapperClasses}
                        >
                          <div className={`relative overflow-hidden rounded-2xl p-4 shadow-lg bg-gradient-to-br from-indigo-700 via-fuchsia-600 to-pink-500 focus-card ${isActive ? "focus-card--active" : ""
                            } ${isDimmed ? "focus-card--dimmed" : ""}`.trim()}
                          >
                            {/* subtle dark overlay for better text contrast */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/25 pointer-events-none"></div>

                            <div className="relative z-10 flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-2xl font-extrabold leading-tight mb-1 bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-white to-rose-200 drop-shadow-md">
                                  {category.title}
                                </h3>
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 text-x font-semibold text-white/95">
                                    <Play className="w-3 h-3" />
                                    <span>{videosByCategory[category.id]?.length || 0}개</span>
                                  </span>

                                  <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-white/90">
                                    자세히 보기
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {currentView === "videoList" && (
            <div>
              <div className="mb-8">
                <h2 className="mb-2 text-2xl font-bold">
                  {getCurrentTopic()?.title}
                </h2>
                <p className="text-muted-foreground">
                  {getCurrentTopic()?.description}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Play className="w-4 h-4" />
                  <span className="text-sm">
                    총 {getCurrentVideos().length}개의 영상
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {getCurrentVideos().map((video) => (
                  <VideoItem
                    key={video.id}
                    video={video}
                    onSelect={handleVideoSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {currentView === "videoPlayer" && selectedVideo && (
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <VideoPlayer
                    video={selectedVideo}
                    categoryId={selectedTopicId}
                  />
                </div>

                <div className="space-y-6">
                  <VideoDescription video={selectedVideo} />

                  {/* 관련 영상 목록 */}
                  <div>
                    <h3 className="mb-4 text-xl ">이 주제의 다른 영상</h3>
                    <div className="space-y-4">
                      {getCurrentVideos()
                        .filter((video) => video.id !== selectedVideo.id)
                        .slice(0, 3)
                        .map((video) => (
                          <VideoItem
                            key={video.id}
                            video={video}
                            onSelect={handleVideoSelect}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === "myPage" && (
            <MyPage
              videosByCategory={videosByCategory}
              onBack={handleBackToTopics}
            />
          )}
        </div>
      </main>

      {/* 하단 버튼: 본문 맨 끝에 위치 (fixed 아님) */}
      <footer className="w-full mt-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="container mx-auto px-4 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-background/95 backdrop-blur border border-muted/20 rounded-full px-4 py-2 shadow">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUserLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </Button>
              </div>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo("adminLogin")}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              관리자
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToMyPage}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              내 페이지
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}