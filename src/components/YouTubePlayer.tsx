import { useEffect, useRef, useState } from 'react';
import { Video } from '../types/video';
import { useWatchProgress } from '../hooks/useWatchProgress';

interface YouTubePlayerProps {
  video: Video;
  categoryId?: string;
}

// YouTube Player API 타입 정의
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export const YouTubePlayer = ({ video, categoryId }: YouTubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [apiReady, setApiReady] = useState(false);
  const { updateProgress } = useWatchProgress();
  const progressUpdateRef = useRef<NodeJS.Timeout>();

  // YouTube API 로드
  useEffect(() => {
    if (window.YT) {
      setApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };
  }, []);

  // YouTube 플레이어 초기화
  useEffect(() => {
    if (!apiReady || !containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '100%',
      width: '100%',
      videoId: video.youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          console.log('Player ready');
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            // 재생 중일 때 진행률 업데이트 시작
            startProgressTracking();
          } else {
            // 재생이 중지되면 진행률 업데이트 중지
            stopProgressTracking();
          }
        }
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      stopProgressTracking();
    };
  }, [apiReady, video.youtubeId]);

  const startProgressTracking = () => {
    stopProgressTracking();
    
    progressUpdateRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime();
        updateProgress(video.id, Math.floor(currentTime), video.duration, categoryId);
      }
    }, 5000); // 5초마다 업데이트
  };

  const stopProgressTracking = () => {
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current);
      progressUpdateRef.current = undefined;
    }
  };

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};