import { VideoDescription } from "../../components/VideoDescription";
import { VideoItem } from "../../components/VideoItem";
import { VideoPlayer } from "../../components/VideoPlayer";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { formatDurationLabel } from "../../lib/video";
import { Video } from "../../types/video";
import { formatDateTime } from "../utils";

interface VideoDetailPageProps {
  selectedVideo: Video | null;
  selectedTopicId: string;
  videosByCategory: Record<string, Video[]>;
  onSelectVideo: (video: Video) => void;
}

export function VideoDetailPage({
  selectedVideo,
  selectedTopicId,
  videosByCategory,
  onSelectVideo,
}: VideoDetailPageProps) {
  if (!selectedVideo) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <Badge variant="secondary">영상 상세페이지</Badge>
        <h2 className="text-3xl font-bold text-slate-900">{selectedVideo.title}</h2>
        <p className="text-sm text-slate-500">
          {formatDateTime(selectedVideo.updatedAt || selectedVideo.createdAt)} ·{" "}
          {formatDurationLabel(selectedVideo.duration)}
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
                  <VideoItem key={video.id} video={video} onSelect={onSelectVideo} />
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
