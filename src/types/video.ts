export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId?: string; // Optional for local videos
  videoUrl?: string; // For local uploaded videos
  videoType: 'youtube' | 'local'; // Type of video
  duration: number; // in seconds
  thumbnail: string;
  category: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount: number;
}

export interface WatchProgress {
  videoId: string;
  watchedSeconds: number;
  completed: boolean;
  lastWatchedAt: string;
}