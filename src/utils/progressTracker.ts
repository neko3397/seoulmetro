import { projectId, publicAnonKey } from './supabase/info';

export interface ProgressData {
  id: string;
  videoId: string;
  categoryId: string;
  progress: number;
  watchTime: number;
  lastWatched: string;
}

// Generate a unique user ID for the session
export const getId = (): string => {
  try {
    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      const parsed = JSON.parse(currentUserRaw);
      if (parsed?.employeeId) {
        const normalizedEmployeeId = String(parsed.employeeId).trim();
        if (normalizedEmployeeId) {
          const normalizedid = `employee_${normalizedEmployeeId}`;
          const storedid = localStorage.getItem('learningHubid');

          if (storedid !== normalizedid) {
            localStorage.setItem('learningHubid', normalizedid);
          }

          return normalizedid;
        }
      }
    }
  } catch (error) {
    console.warn('currentUser 파싱 오류:', error);
  }

  let id = localStorage.getItem('learningHubid');
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('learningHubid', id);
  }
  return id;
};

// Save progress to backend
export const saveProgress = async (
  videoId: string,
  categoryId: string,
  progress: number,
  watchTime: number
): Promise<void> => {
  const id = getId();
  // 사용자 정보 가져오기
  let userName = '';
  let employeeId = '';
  try {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const parsed = JSON.parse(currentUser);
      userName = (parsed.name || '').trim();
      employeeId = (parsed.employeeId || '').trim();
    }
  } catch (e) {
    console.warn('currentUser 파싱 오류:', e);
  }

  console.log('💾 progressTracker.saveProgress called:', {
    id,
    userName,
    employeeId,
    videoId,
    categoryId,
    progress,
    watchTime
  });

  // Always save to localStorage for now
  const localKey = `progress_${videoId}`;
  const progressData = {
    id,
    userName,
    employeeId,
    videoId,
    categoryId,
    progress,
    watchTime,
    lastWatched: new Date().toISOString()
  };
  localStorage.setItem(localKey, JSON.stringify(progressData));
  console.log('✅ Saved to localStorage with key:', localKey);  // Try to save to backend; fall back silently on failure
  try {
    const v = Date.now();
    // Use local mock server when running on localhost for safe testing
    const apiBase = `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1`;

    console.log('🌐 Attempting backend save to:', `${apiBase}/progress?v=${v}`);

    const response = await fetch(`${apiBase}/progress?v=${v}`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        id,
        userName,
        employeeId,
        videoId,
        categoryId,
        progress,
        watchTime
      })
    });

    if (response.ok) {
      console.log('✅ Backend save successful');
    } else {
      console.error('❌ Backend save failed with status:', response.status);
    }
  } catch (error) {
    console.error('❌ Backend save error:', error);
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
  const id = getId();
  try {
    const apiBase = `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1`;

    const response = await fetch(`${apiBase}/${id}`, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Cache-Control': 'no-cache'
      }
    });

    const data = await response.json();
    return data.progress || [];
  } catch (error) {
    console.error('Error getting user progress (fallback to local):', error);
    // Fallback to localStorage data
    const progressData: ProgressData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('progress_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.id === id) {
            progressData.push(data);
          }
        } catch (e) {
          console.error('Error parsing localStorage progress:', e);
        }
      }
    }
    return progressData;
  }
};