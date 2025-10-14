import { useState, useEffect } from "react";
import { videos as mockVideos } from "./data/mockData"; // 서버 실패 시만 사용
import { Video } from "./types/video";
import { TopicCard } from "./components/TopicCard";
import { VideoItem } from "./components/VideoItem";
import { VideoPlayer } from "./components/VideoPlayer";
import { VideoDescription } from "./components/VideoDescription";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserLogin } from "./components/UserLogin";
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
  | "userLogin";

export default function App() {
  const [currentView, setCurrentView] =
    useState<ViewState>("topics");
  const [selectedTopicId, setSelectedTopicId] =
    useState<string>("");
  const [selectedVideo, setSelectedVideo] =
    useState<Video | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [videosByCategory, setVideosByCategory] = useState<Record<string, Video[]>>({});
  const [videosLoading, setVideosLoading] = useState(false);

  // 파비콘을 기존 로고로 설정
  // useEffect(() => {
  //   const setFavicon = (rel: string, sizes?: string) => {
  //     let link = document.querySelector<HTMLLinkElement>(
  //       sizes ? `link[rel='${rel}'][sizes='${sizes}']` : `link[rel='${rel}']`
  //     );
  //     if (!link) {
  //       link = document.createElement('link');
  //       link.rel = rel;
  //       if (sizes) link.sizes = sizes;
  //       document.head.appendChild(link);
  //     }
  //     link.type = 'image/png';
  //     link.href = logo;
  //   };

  //   // 일반 파비콘 및 애플 터치 아이콘을 모두 로고로 지정
  //   setFavicon('icon', '32x32');
  //   setFavicon('icon', '16x16');
  //   setFavicon('shortcut icon');
  //   setFavicon('apple-touch-icon', '180x180');
  // }, []);

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
          }
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
              headers: { 'Authorization': `Bearer ${publicAnonKey}` }
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

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopicId(topicId);
    // 선택 시 해당 카테고리의 영상을 서버에서 불러옵니다.
    loadVideosForCategory(topicId);
    setCurrentView("videoList");
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setCurrentView("videoPlayer");
  };

  const handleBackToTopics = () => {
    setCurrentView("topics");
    setSelectedTopicId("");
  };

  const handleBackToVideoList = () => {
    setCurrentView("videoList");
    setSelectedVideo(null);
  };

  const handleAdminLogin = (admin: any) => {
    setAdminUser(admin);
    setCurrentView("adminDashboard");
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    setCurrentView("topics");
  };

  const handleUserLogin = (user: any) => {
    setCurrentUser(user);
    setCurrentView("topics");
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    setCurrentView("topics");
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
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
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
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentView !== "topics" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={
                    currentView === "videoList"
                      ? handleBackToTopics
                      : handleBackToVideoList
                  }
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  뒤로
                </Button>
              )}
              <div className="flex items-center gap-2">
                <img src={logo} alt="Logo" className="w-8 h-8 object-contain self-center" />
                <h1>
                  서울교통공사 동대문승무사업소 Learning Hub
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-4">
        {currentView === "topics" && (
          <div>
            {/* 환영 메시지 */}
            <div className="mb-12 text-center">
              <div className="mb-6">
                {currentUser ? (
                  <div>
                    <h1 className="mb-4">
                      {currentUser.name}님, 안전교육허브에 오신
                      것을 환영합니다! 👋
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      안전한 지하철을 만들기 위한 학습을
                      시작해보세요.
                    </p>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      동대문승무사업소 학습동아리가 준비한
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
                ) : (
                  <div>
                    <h1 className="mb-4">
                      서울교통공사 안전교육허브에 오신 것을
                      환영합니다! 👋
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      더 안전한 지하철을 만들 준비가 되셨나요?
                    </p>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                      동대문승무사업소 학습동아리가 준비한
                      안전교육영상으로 지금 배워보세요.
                    </p>
                    <div className="mt-6">
                      <Button
                        onClick={() =>
                          setCurrentView("userLogin")
                        }
                        className="flex items-center gap-2 mx-auto"
                      >
                        <User className="w-4 h-4" />
                        로그인하고 학습 시작하기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="mb-2">학습 주제를 선택하세요</h2>
              <p className="text-muted-foreground">
                관심있는 주제를 클릭하여 교육 영상들을
                확인해보세요.
                {!currentUser &&
                  " 로그인하시면 학습 진행률이 저장됩니다."}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>카테고리를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                  <TopicCard
                    key={category.id}
                    topic={{
                      id: category.id,
                      title: category.title,
                      description: category.description,
                      thumbnail: category.image,
                      videoCount: videosByCategory[category.id]?.length || 0
                    }}
                    onSelect={handleTopicSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === "videoList" && (
          <div>
            <div className="mb-8">
              <h2 className="mb-2">
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
                  <h3 className="mb-4">이 주제의 다른 영상</h3>
                  <div className="space-y-3">
                    {getCurrentVideos()
                      .filter(
                        (video) =>
                          video.id !== selectedVideo.id,
                      )
                      .slice(0, 3)
                      .map((video) => (
                        <div
                          key={video.id}
                          className="flex gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() =>
                            handleVideoSelect(video)
                          }
                        >
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-20 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="line-clamp-2 text-sm mb-1">
                              {video.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {Math.floor(video.duration / 60)}
                              분
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <div className="flex items-center gap-2 mx-auto">
        {currentUser ? (
          <div className="flex items-center gap-3 mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUserLogout}
              className="flex items-center gap-2 mx-auto"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentView("adminLogin")}
          className="flex items-center gap-2 mx-auto"
        >
          <Settings className="w-4 h-4" />
          관리자
        </Button>
      </div>
    </div>
  );
}