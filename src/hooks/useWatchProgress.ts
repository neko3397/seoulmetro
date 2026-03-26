import { useState, useEffect, useCallback } from 'react';
import { WatchProgress } from '../types/video';
import { saveProgress } from '../utils/progressTracker';
import { parseDurationToSeconds } from '../lib/video';

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
  const updateProgress = useCallback(async (videoId: string, watchedSeconds: number, totalDuration: number | string, categoryId?: string) => {
    const durationInSeconds = parseDurationToSeconds(totalDuration);
    if (durationInSeconds <= 0) return;
    const completed = watchedSeconds >= durationInSeconds * 0.9; // 90% 이상 시청 시 완료로 간주
    const progressPercentage = Math.min((watchedSeconds / durationInSeconds) * 100, 100);

    console.log('💾 Saving progress:', {
      videoId,
      watchedSeconds,
        totalDuration: durationInSeconds,
      progressPercentage: progressPercentage + '%',
      categoryId,
      completed
    });

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
    console.log('✅ Saved to localStorage');

    // Save to backend if categoryId is provided
    if (categoryId) {
      try {
        console.log('🌐 Attempting backend save...');
        await saveProgress(videoId, categoryId, progressPercentage, watchedSeconds);
        console.log('✅ Backend save successful');
      } catch (error) {
        console.error('❌ Failed to save progress to backend:', error);
      }
    } else {
      console.log('⚠️ No categoryId provided, skipping backend save');
    }
  }, [progressData, saveProgress]);  // 특정 영상의 진행률 가져오기
  const getProgress = useCallback((videoId: string): WatchProgress | null => {
    return progressData[videoId] || null;
  }, [progressData]);

  // 진행률 퍼센티지 계산
  const getProgressPercentage = useCallback((videoId: string, totalDuration: number | string): number => {
    const durationInSeconds = parseDurationToSeconds(totalDuration);
    if (durationInSeconds <= 0) return 0;
    const progress = getProgress(videoId);
    if (!progress) return 0;
    const raw = Math.min((progress.watchedSeconds / durationInSeconds) * 100, 100);
    // Round to one decimal place for UI consistency
    return Math.round(raw * 10) / 10;
  }, [getProgress]);

  return {
    updateProgress,
    getProgress,
    getProgressPercentage,
    progressData
  };
};
