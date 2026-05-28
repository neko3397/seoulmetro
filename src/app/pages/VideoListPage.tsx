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
    <section className="space-y-6 animate-fade-in-up">
      <div className="space-y-2 border-b border-slate-100 pb-4">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">{currentTopic?.title}</h2>
        <p className="text-slate-500 font-medium">{currentTopic?.description}</p>
      </div>
      <div className="space-y-4">
        {currentVideos.map((video) => (
          <VideoItem key={video.id} video={video} onSelect={onSelectVideo} />
        ))}
      </div>
    </section>
  );
}
