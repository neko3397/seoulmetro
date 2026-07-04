import { VideoDescription } from "../../components/VideoDescription";
import { VideoItem } from "../../components/VideoItem";
import { VideoPlayer } from "../../components/VideoPlayer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Video } from "../../types/video";

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
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in-up">


      <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <VideoPlayer video={selectedVideo} categoryId={selectedVideo.categoryId || selectedTopicId} />
        </div>
        <div className="space-y-6">
          <VideoDescription video={selectedVideo} />
          <Card className="premium-card border-slate-100">
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
