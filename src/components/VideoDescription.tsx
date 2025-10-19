import { Video } from '../types/video';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { Clock, CheckCircle } from 'lucide-react';

interface VideoDescriptionProps {
  video: Video;
}

export const VideoDescription = ({ video }: VideoDescriptionProps) => {
  const { getProgressPercentage, getProgress } = useWatchProgress();

  const progressPercentage = getProgressPercentage(video.id, video.duration);
  const progressInfo = getProgress(video.id);
  const isCompleted = progressInfo?.completed || false;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  const formatLastWatched = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return `${Math.floor(diffInHours / 24)}일 전`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="flex-1 text-xl font-bold">{video.title}</CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="flex items-center gap-1 text-lg">
              <Clock className="w-3 h-3" />
              {formatDuration(video.duration)}
            </Badge>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                완료
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="leading-relaxed">{video.description}</p>

        {progressPercentage > 0 && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <h4>시청 진행률</h4>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            {progressInfo?.lastWatchedAt && (
              <p className="text-sm text-muted-foreground">
                마지막 시청: {formatLastWatched(progressInfo.lastWatchedAt)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};