import { useEffect, useRef, useState } from 'react';
import { Video } from '../types/video';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { Button } from './ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import { Slider } from './ui/slider';

interface VideoPlayerProps {
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

export const VideoPlayer = ({ video, categoryId }: VideoPlayerProps) => {
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [apiReady, setApiReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const { updateProgress } = useWatchProgress();
  const progressUpdateRef = useRef<NodeJS.Timeout>();

  // YouTube API 로드 (YouTube 영상인 경우)
  useEffect(() => {
    if (video.videoType !== 'youtube') return;

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
  }, [video.videoType]);

  // YouTube 플레이어 초기화
  useEffect(() => {
    if (video.videoType !== 'youtube' || !apiReady || !containerRef.current || !video.youtubeId) return;

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
          console.log('YouTube Player ready');
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            startProgressTracking();
          } else {
            setIsPlaying(false);
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
  }, [apiReady, video.youtubeId, video.videoType]);

  // 로컬 비디오 이벤트 핸들러
  useEffect(() => {
    if (video.videoType !== 'local' || !videoRef.current) return;

    const videoElement = videoRef.current;

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      startProgressTracking();
    };

    const handlePause = () => {
      setIsPlaying(false);
      stopProgressTracking();
    };

    const handleVolumeChange = () => {
      setVolume(videoElement.volume);
      setIsMuted(videoElement.muted);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('volumechange', handleVolumeChange);

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
      stopProgressTracking();
    };
  }, [video.videoType, video.videoUrl]);

  const startProgressTracking = () => {
    stopProgressTracking();
    
    progressUpdateRef.current = setInterval(() => {
      let currentSeconds = 0;
      
      if (video.videoType === 'youtube' && playerRef.current && playerRef.current.getCurrentTime) {
        currentSeconds = playerRef.current.getCurrentTime();
      } else if (video.videoType === 'local' && videoRef.current) {
        currentSeconds = videoRef.current.currentTime;
      }
      
      updateProgress(video.id, Math.floor(currentSeconds), video.duration, categoryId);
    }, 5000); // 5초마다 업데이트
  };

  const stopProgressTracking = () => {
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current);
      progressUpdateRef.current = undefined;
    }
  };

  // 로컬 비디오 컨트롤 함수들
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  };

  const handleSeek = (newTime: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime[0];
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume[0];
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const restartVideo = () => {
    if (video.videoType === 'youtube' && playerRef.current) {
      playerRef.current.seekTo(0);
      playerRef.current.playVideo();
    } else if (video.videoType === 'local' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  if (video.videoType === 'youtube') {
    return (
      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    );
  }

  // 로컬 비디오 플레이어
  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative group">
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="w-full h-full object-contain"
        onClick={togglePlayPause}
      />
      
      {/* 커스텀 컨트롤 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* 진행률 슬라이더 */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            max={duration}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/80 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* 컨트롤 버튼들 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="text-white hover:text-white hover:bg-white/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={restartVideo}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:text-white hover:bg-white/20"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* 중앙 재생 버튼 (일시정지 상태일 때) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="lg"
            onClick={togglePlayPause}
            className="text-white bg-black/50 hover:bg-black/70 rounded-full w-16 h-16"
          >
            <Play className="w-8 h-8" />
          </Button>
        </div>
      )}
    </div>
  );
};