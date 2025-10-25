import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, Eye, Clock, PlayCircle, RefreshCcw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface UserProgress {
  id: string;
  videoId: string;
  categoryId: string;
  progress: number;
  watchTime: number;
  lastWatched: string;
  name?: string;
  employeeId?: string;
}

interface VideoInfo {
  id: string;
  title: string;
  duration: string;
}

interface CategoryInfo {
  id: string;
  title: string;
}

interface UserInfo {
  id: string;
  name: string;
  employeeId: string;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export function UserProgressManagement() {
  const [allProgress, setAllProgress] = useState<UserProgress[]>([]);
  const [videos, setVideos] = useState<{ [key: string]: VideoInfo }>({});
  const [categories, setCategories] = useState<{ [key: string]: CategoryInfo }>({});
  const [users, setUsers] = useState<{ [key: string]: UserInfo }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const progressUserInfo = useMemo(() => {
    const map: Record<string, { name?: string; employeeId?: string }> = {};

    allProgress.forEach((progress) => {
      if (!map[progress.id]) {
        map[progress.id] = {};
      }

      if (progress.name && !map[progress.id].name) {
        map[progress.id].name = progress.name;
      }

      // progress entries use progress.id as the user key (employeeId), so store employeeId under that key
      if (progress.employeeId && !map[progress.id].employeeId) {
        map[progress.id].employeeId = progress.employeeId;
      }
    });

    return map;
  }, [allProgress]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('📊 UserProgressManagement: Starting data load...');
    try {
      setLoading(true);
      const v = Date.now();

      // Load categories
      const categoriesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/categories?v=${v}`,
        {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
      const categoriesData = await categoriesResponse.json();
      console.log('📋 Categories loaded:', categoriesData);

      const categoriesMap: { [key: string]: CategoryInfo } = {};
      const videosMap: { [key: string]: VideoInfo } = {};      // Load videos for each category
      for (const category of categoriesData.categories || []) {
        categoriesMap[category.id] = category;

        const videosResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/videos/${category.id}?v=${v}`,
          {
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Cache-Control': 'no-cache'
            }
          }
        );
        const videosData = await videosResponse.json();
        console.log(`🎥 Videos for ${category.id}:`, videosData);

        for (const video of videosData.videos || []) {
          videosMap[video.id] = video;
        }
      }

      setCategories(categoriesMap);
      setVideos(videosMap);

      // Load users data
      const usersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/users?v=${v}`,
        {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
      const usersData = await usersResponse.json();
      console.log('👥 Users data loaded:', usersData);

      const usersMap: { [key: string]: UserInfo } = {};
      for (const user of usersData.users || []) {
        usersMap[user.id] = user;
      }
      setUsers(usersMap);

      // Load progress data
      const progressResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/progress?v=${v}`,
        {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
      const progressData = await progressResponse.json();
      console.log('📊 Progress data loaded:', progressData);
      console.log('📊 Number of progress records:', progressData.progress?.length || 0);

      // diagnostic log: show a small sample of progress entries to help debug zero-percent issue
      console.log('📊 Progress sample (first 10):', (progressData.progress || []).slice(0, 10));

      // If the admin/progress endpoint returned no entries, fallback to using the
      // embedded progress arrays inside the `users` response which is populated
      // above. Some deployments may not expose admin/progress correctly but the
      // `users` endpoint still contains embedded progress data.
      if (!Array.isArray(progressData.progress) || (progressData.progress || []).length === 0) {
        const fallbackFromUsers: UserProgress[] = [];
        for (const u of usersData.users || []) {
          const entries = Array.isArray(u.progress) ? u.progress : [];
          for (const p of entries) {
            fallbackFromUsers.push({
              id: u.employeeId || u.id,
              name: u.name,
              employeeId: u.employeeId,
              videoId: p.videoId,
              categoryId: p.categoryId,
              progress: typeof p.progress === 'number' ? p.progress : Number(p.progress) || 0,
              watchTime: typeof p.watchTime === 'number' ? p.watchTime : p.watchTime ? Number(p.watchTime) : 0,
              lastWatched: p.lastWatched,
            });
          }
        }

        console.log('⚠️ admin/progress returned empty — falling back to embedded user.progress (sample 10):', fallbackFromUsers.slice(0, 10));
        setAllProgress(fallbackFromUsers);
      } else {
        setAllProgress(progressData.progress || []);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      // Fallback to demo mode
      const mockCategories = {
        'fire': { id: 'fire', title: '화재발생 시 대응요령' },
        'safety': { id: 'safety', title: '지하철 안전운행' }
      };

      const mockVideos = {
        'fire_1': { id: 'fire_1', title: '지하철 화재 발생 시 초기 대응', duration: '5:30' },
        'safety_1': { id: 'safety_1', title: '지하철 안전운행 기본 수칙', duration: '8:20' }
      };

      const mockUsers = {
        'demo_user_1': { id: 'demo_user_1', name: '김철수', employeeId: 'EMP001', department: '운행팀' },
        'demo_user_2': { id: 'demo_user_2', name: '이영희', employeeId: 'EMP002', department: '안전팀' }
      };

      const mockProgress = [
        {
          id: 'demo_user_1',
          videoId: 'fire_1',
          categoryId: 'fire',
          progress: 75,
          watchTime: 240,
          lastWatched: new Date().toISOString()
        },
        {
          id: 'demo_user_2',
          videoId: 'safety_1',
          categoryId: 'safety',
          progress: 90,
          watchTime: 450,
          lastWatched: new Date().toISOString()
        }
      ];

      setCategories(mockCategories);
      setVideos(mockVideos);
      setUsers(mockUsers);
      console.log('⚠️ Using fallback mock data');
    } finally {
      setLoading(false);
      console.log('✅ UserProgressManagement: Data loading completed');
    }
  };

  const handleRefresh = () => {
    // 수동 새로고침: 동일한 로딩 플로우 사용
    loadData();
  };

  const getUserStats = () => {
    const userStats: {
      [key: string]: {
        totalVideos: number;
        completedVideos: number;
        avgProgress: number;
        lastActivity?: string;
      };
    } = {};

    // Seed stats with known users so they appear even without progress.
    Object.keys(users).forEach((id) => {
      const user = users[id];
      userStats[id] = {
        totalVideos: 0,
        completedVideos: 0,
        avgProgress: 0,
        lastActivity: user?.lastLoginAt || user?.updatedAt || user?.createdAt,
      };
    });

    allProgress.forEach((progress) => {
      if (!userStats[progress.id]) {
        userStats[progress.id] = {
          totalVideos: 0,
          completedVideos: 0,
          avgProgress: 0,
          lastActivity: progress.lastWatched,
        };
      }

      const stats = userStats[progress.id];
      stats.totalVideos += 1;
      if (progress.progress >= 80) {
        stats.completedVideos += 1;
      }

      const previous = stats.lastActivity;
      if (!previous || new Date(progress.lastWatched) > new Date(previous)) {
        stats.lastActivity = progress.lastWatched;
      }
    });

    Object.keys(userStats).forEach((id) => {
      const userProgress = allProgress.filter((p) => p.id === id);
      if (userProgress.length > 0) {
        const totalProgress = userProgress.reduce((sum, p) => sum + p.progress, 0);
        userStats[id].avgProgress = totalProgress / userProgress.length;
      }
    });

    return userStats;
  };

  const getUserProgress = (id: string) => {
    return allProgress.filter(p => p.id === id);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return '-';
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('ko-KR');
  };

  const getUserDisplayName = (id: string) => {
    const user = users[id];
    if (user) {
      const parts = [user.name, user.employeeId ? `(${user.employeeId})` : null].filter(Boolean);
      const formatted = parts.join(' ').trim();
      if (formatted) {
        return formatted;
      }
    }

    const fallback = progressUserInfo[id];
    if (fallback) {
      if (fallback.name && fallback.employeeId) {
        return `${fallback.name} (${fallback.employeeId})`;
      }
      if (fallback.name) {
        return fallback.name;
      }
      if (fallback.employeeId) {
        return fallback.employeeId;
      }
    }

    return id; // fallback to user ID if user info not found
  };

  const userStats = getUserStats();
  const filteredUsers = Object.keys(userStats).filter(id => {
    const user = users[id];
    const fallback = progressUserInfo[id];
    const searchLower = searchTerm.toLowerCase();
    return (
      id.toLowerCase().includes(searchLower) ||
      (user?.name && user.name.toLowerCase().includes(searchLower)) ||
      (user?.employeeId && user.employeeId.toLowerCase().includes(searchLower)) ||
      (fallback?.name && fallback.name.toLowerCase().includes(searchLower)) ||
      (fallback?.employeeId && fallback.employeeId.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>데이터를 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>사용자 시청 현황</CardTitle>
            <CardDescription>
              모든 사용자의 영상 시청 진행률과 활동 현황을 관리합니다.
            </CardDescription>
          </div>
          <div className="mt-2 sm:mt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              {loading ? '새로고침 중...' : '새로고침'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="사용자 이름 또는 사번으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사용자</TableHead>
                  <TableHead>시청 영상 수</TableHead>
                  <TableHead>완료 영상 수</TableHead>
                  <TableHead>평균 진행률</TableHead>
                  <TableHead>마지막 활동</TableHead>
                  <TableHead>상세 보기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? '검색 결과가 없습니다.' : '사용자 데이터가 없습니다.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(id => {
                    const stats = userStats[id];
                    return (
                      <TableRow key={id}>
                        <TableCell className="font-medium">
                          {getUserDisplayName(id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <PlayCircle className="h-4 w-4 mr-1 text-blue-600" />
                            {stats.totalVideos}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={stats.completedVideos > 0 ? "default" : "secondary"}
                            className={stats.completedVideos > 0 ? "bg-green-600" : ""}
                          >
                            {stats.completedVideos}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={stats.avgProgress} className="w-20" />
                            <span className="text-xs text-gray-600">
                              {Number.isFinite(stats.avgProgress) ? stats.avgProgress.toFixed(1) + '%' : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(stats.lastActivity)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(selectedUser === id ? null : id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {selectedUser === id ? '닫기' : '보기'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>사용자 상세 시청 기록: {getUserDisplayName(selectedUser)}</CardTitle>
            <CardDescription>
              개별 영상별 시청 진행률과 시간을 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>카테고리</TableHead>
                    <TableHead>영상 제목</TableHead>
                    <TableHead>진행률</TableHead>
                    <TableHead>시청 시간</TableHead>
                    <TableHead>마지막 시청</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getUserProgress(selectedUser).map((progress, index) => {
                    const video = videos[progress.videoId];
                    const category = categories[progress.categoryId];

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline">
                            {category?.title || progress.categoryId}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {video?.title || progress.videoId}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress.progress} className="w-24" />
                            <span className="text-xs text-gray-600">
                              {typeof progress.progress === 'number' ? progress.progress.toFixed(1) + '%' : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Clock className="h-3 w-3 mr-1 text-gray-400" />
                            {formatDuration(progress.watchTime)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(progress.lastWatched)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}