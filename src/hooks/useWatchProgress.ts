import { useState, useEffect, useCallback } from 'react';
import { WatchProgress } from '../types/video';
import { saveProgress, getLocalProgress } from '../utils/progressTracker';

export const useWatchProgress = () => {
  const [progressData, setProgressData] = useState<Record<string, WatchProgress>>({});

  // 현재 사용자 정보 가져오기
  const getCurrentUser = () => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse current user:', error);
      }
    }
    return null;
  };

  // 로컬 스토리지에서 진행률 데이터 로드 (사용자별)
  useEffect(() => {
    const currentUser = getCurrentUser();
    const storageKey = currentUser ? `video-progress-${currentUser.employeeId}` : 'video-progress';

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setProgressData(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse progress data:', error);
      }
    } else {
      setProgressData({});
    }
  }, []);

  // 진행률 데이터를 로컬 스토리지에 저장 (사용자별)
  const saveProgressToStorage = useCallback((data: Record<string, WatchProgress>) => {
    const currentUser = getCurrentUser();
    const storageKey = currentUser ? `video-progress-${currentUser.employeeId}` : 'video-progress';

    localStorage.setItem(storageKey, JSON.stringify(data));
    setProgressData(data);
  }, []);

  // 특정 영상의 진행률 업데이트
  const updateProgress = useCallback(async (videoId: string, watchedSeconds: number, totalDuration: number, categoryId?: string) => {
    const completed = watchedSeconds >= totalDuration * 0.9; // 90% 이상 시청 시 완료로 간주
    const progressPercentage = Math.min((watchedSeconds / totalDuration) * 100, 100);

    const newProgress: WatchProgress = {
      videoId,
      watchedSeconds,
      completed,
      lastWatchedAt: new Date().toISOString()
    };

    const updated = {
      ...progressData,
      [videoId]: newProgress
    };

    saveProgressToStorage(updated);

    // Save to backend if categoryId is provided
    if (categoryId) {
      try {
        await saveProgress(videoId, categoryId, progressPercentage, watchedSeconds);
      } catch (error) {
        console.error('Failed to save progress to backend:', error);
      }
    }
  }, [progressData, saveProgress]);

  // 특정 영상의 진행률 가져오기
  const getProgress = useCallback((videoId: string): WatchProgress | null => {
    return progressData[videoId] || null;
  }, [progressData]);

  // 진행률 퍼센티지 계산
  const getProgressPercentage = useCallback((videoId: string, totalDuration: number): number => {
    const progress = getProgress(videoId);
    if (!progress) return 0;
    return Math.min((progress.watchedSeconds / totalDuration) * 100, 100);
  }, [getProgress]);

  return {
    updateProgress,
    getProgress,
    getProgressPercentage,
    progressData
  };
};