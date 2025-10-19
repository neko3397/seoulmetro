import { Video } from '../types/video';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { PlayCircle, CheckCircle } from 'lucide-react';

interface VideoItemProps {
  video: Video;
  onSelect: (video: Video) => void;
}

export const VideoItem = ({ video, onSelect }: VideoItemProps) => {
  const { getProgressPercentage, getProgress } = useWatchProgress();

  const progressPercentage = getProgressPercentage(video.id, video.duration);
  const progressInfo = getProgress(video.id);
  const isCompleted = progressInfo?.completed || false;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 overflow-hidden"
      onClick={() => onSelect(video)}
    >
      <div className="flex gap-4 p-4">
        <div className="relative flex-shrink-0">
          <div className="w-40 h-24 rounded-lg overflow-hidden bg-muted">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {isCompleted ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <PlayCircle className="w-8 h-8 text-white/90" />
              )}
            </div>
          </div>

          <Badge
            variant="secondary"
            className="absolute bottom-1 right-1 text-md"
          >
            {formatDuration(video.duration)}
          </Badge>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <h3 className="line-clamp-2 flex-1">{video.title}</h3>
            {isCompleted && (
              <Badge variant="default" className="shrink-0 bg-green-500">
                완료
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground line-clamp-2 mb-3">
            {video.description}
          </p>

          {progressPercentage > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  시청 진행률
                </span>
                <span className="text-sm">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};