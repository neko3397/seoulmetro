import { VideoItem } from "../../components/VideoItem";
import { Badge } from "../../components/ui/badge";
import { Category } from "../types";
import { Video } from "../../types/video";

interface VideoListPageProps {
  currentTopic: Category | null;
  currentVideos: Video[];
  onSelectVideo: (video: Video) => void;
}

export function VideoListPage({ currentTopic, currentVideos, onSelectVideo }: VideoListPageProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">교육영상 목록</Badge>
        <h2 className="text-3xl font-bold text-slate-900">{currentTopic?.title}</h2>
        <p className="text-slate-600">{currentTopic?.description}</p>
      </div>
      <div className="space-y-4">
        {currentVideos.map((video) => (
          <VideoItem key={video.id} video={video} onSelect={onSelectVideo} />
        ))}
      </div>
    </section>
  );
}
