import { VideoItem } from "../../components/VideoItem";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { PERSONALIZED_CAREER_OPTIONS, PERSONALIZED_ROLE_OPTIONS } from "../constants";
import { PersonalizedProfileInput } from "../../types/content";
import { Video } from "../../types/video";

interface PersonalizedEducationPageProps {
  personalizedProfile: PersonalizedProfileInput;
  recommendationLoading: boolean;
  personalizedVideos: Video[];
  onUpdateProfile: (updater: (prev: PersonalizedProfileInput) => PersonalizedProfileInput) => void;
  onSelectVideo: (video: Video) => void;
}

export function PersonalizedEducationPage({
  personalizedProfile,
  recommendationLoading,
  personalizedVideos,
  onUpdateProfile,
  onSelectVideo,
}: PersonalizedEducationPageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in-up">
      <div className="space-y-2 border-b border-slate-100 pb-4">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">맞춤형 교육</h2>
        <p className="text-slate-500 font-medium">나의 직책과 경력 구분에 맞춰 인공지능이 제안하는 최적의 학습 추천 영상 리스트입니다.</p>
      </div>

      <Card className="premium-card border-slate-100">
        <CardHeader>
          <CardTitle>추천 기준 선택</CardTitle>
          <CardDescription>현재 내 조건에 맞는 교육 영상을 바로 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">직책</p>
            <div className="grid grid-cols-2 gap-3">
              {PERSONALIZED_ROLE_OPTIONS.map((option) => {
                const isSelected = personalizedProfile.role === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      onUpdateProfile((prev) => ({
                        ...prev,
                        role: option.value as PersonalizedProfileInput["role"],
                      }))
                    }
                    className={`flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border px-4 py-5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-100"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-900">{option.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">경력 구분</p>
            <div className="grid grid-cols-2 gap-3">
              {PERSONALIZED_CAREER_OPTIONS.map((option) => {
                const isSelected = personalizedProfile.careerStage === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      onUpdateProfile((prev) => ({
                        ...prev,
                        careerStage: option.value as PersonalizedProfileInput["careerStage"],
                      }))
                    }
                    className={`flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border px-4 py-5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-100"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-900">{option.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {recommendationLoading ? (
          <Card>
            <CardContent className="py-12 text-center">추천 영상을 불러오는 중...</CardContent>
          </Card>
        ) : personalizedVideos.length > 0 ? (
          <div className="space-y-4">
            {personalizedVideos.map((video) => (
              <VideoItem key={video.id} video={video} onSelect={onSelectVideo} />
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
}
