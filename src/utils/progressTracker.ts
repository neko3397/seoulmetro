import { projectId, publicAnonKey } from './supabase/info';

export interface ProgressData {
  userId: string;
  videoId: string;
  categoryId: string;
  progress: number;
  watchTime: number;
  lastWatched: string;
}

// Generate a unique user ID for the session
export const getUserId = (): string => {
  let userId = localStorage.getItem('learningHubUserId');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('learningHubUserId', userId);
  }
  return userId;
};

// Save progress to backend
export const saveProgress = async (
  videoId: string,
  categoryId: string,
  progress: number,
  watchTime: number
): Promise<void> => {
  const userId = getUserId();
  
  // Always save to localStorage for now
  const localKey = `progress_${videoId}`;
  const progressData = {
    userId,
    videoId,
    categoryId,
    progress,
    watchTime,
    lastWatched: new Date().toISOString()
  };
  localStorage.setItem(localKey, JSON.stringify(progressData));

  // Try to save to backend if properly configured
  if (projectId !== 'placeholder-project-id' && publicAnonKey !== 'placeholder-anon-key') {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/progress`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            userId,
            videoId,
            categoryId,
            progress,
            watchTime
          })
        }
      );
    } catch (error) {
      console.log('Backend not available, using localStorage only:', error);
    }
  }
};

// Get progress from local storage (for UI purposes)
export const getLocalProgress = (videoId: string): ProgressData | null => {
  try {
    const localKey = `progress_${videoId}`;
    const data = localStorage.getItem(localKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting local progress:', error);
    return null;
  }
};

// Get user's progress from backend
export const getUserProgress = async (): Promise<ProgressData[]> => {
  const userId = getUserId();
  
  // If backend is not configured, return localStorage data
  if (projectId === 'placeholder-project-id' || publicAnonKey === 'placeholder-anon-key') {
    const progressData: ProgressData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('progress_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.userId === userId) {
            progressData.push(data);
          }
        } catch (error) {
          console.error('Error parsing localStorage progress:', error);
        }
      }
    }
    return progressData;
  }
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/progress/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );
    
    const data = await response.json();
    return data.progress || [];
  } catch (error) {
    console.error('Error getting user progress:', error);
    return [];
  }
};