import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogOut, Users, Video, FolderOpen, Settings, AlertCircle } from 'lucide-react';
import { UserProgressManagement } from './UserProgressManagement';
import { VideoManagement } from './VideoManagement';
import { CategoryManagement } from './CategoryManagement';
import { AdminManagement } from './AdminManagement';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import seoulMetroLogo from "../assets/logo.png"; // 타입 선언 추가 필요

interface AdminDashboardProps {
  admin: any;
  onLogout: () => void;
}

export function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVideos: 0,
    totalCategories: 0,
    totalProgress: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get categories
      const categoriesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/categories`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }

      const categoriesData = await categoriesResponse.json();

      // Get all progress data
      const progressResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/admin/progress`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!progressResponse.ok) {
        throw new Error('Failed to fetch progress');
      }

      const progressData = await progressResponse.json();

      // Calculate stats
      const categories = categoriesData.categories || [];
      const allProgress = progressData.progress || [];

      let totalVideos = 0;
      for (const category of categories) {
        const videosResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/videos/${category.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          totalVideos += (videosData.videos || []).length;
        }
      }

      const uniqueUsers = new Set(allProgress.map((p: any) => p.userId)).size;

      setStats({
        totalUsers: uniqueUsers,
        totalVideos,
        totalCategories: categories.length,
        totalProgress: allProgress.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Fallback to demo mode if server is unavailable
      console.log('Server unavailable, falling back to demo mode');
      setStats({
        totalUsers: 5,
        totalVideos: 8,
        totalCategories: 3,
        totalProgress: 12
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <img
                src={seoulMetroLogo}
                alt="서울교통공사"
                className="h-12 w-12"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">관리자 대시보드</h1>
                <p className="text-sm text-gray-600">안전교육허브 관리 시스템</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Mode Alert */}
        {(projectId === 'placeholder-project-id' || publicAnonKey === 'placeholder-anon-key') && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                <strong>데모 모드:</strong> 백엔드가 연결되지 않아 데모 데이터를 표시합니다.
                실제 배포 시에는 Supabase 설정이 필요합니다.
              </span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">시청 기록이 있는 사용자</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 영상</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVideos}</div>
              <p className="text-xs text-muted-foreground">등록된 교육 영상</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 카테고리</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCategories}</div>
              <p className="text-xs text-muted-foreground">교육 카테고리</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">시청 기록</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProgress}</div>
              <p className="text-xs text-muted-foreground">총 시청 기록</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
            <TabsTrigger value="videos">영상 관리</TabsTrigger>
            <TabsTrigger value="categories">카테고리 관리</TabsTrigger>
            <TabsTrigger value="admins">관리자 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserProgressManagement />
          </TabsContent>

          <TabsContent value="videos">
            <VideoManagement onStatsUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagement onStatsUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="admins">
            <AdminManagement currentAdmin={admin} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}