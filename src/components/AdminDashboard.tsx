import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LogOut, RefreshCcw } from "lucide-react";
import { UserProgressManagement } from "./UserProgressManagement";
import { VideoManagement } from "./VideoManagement";
import { CategoryManagement } from "./CategoryManagement";
import { AdminManagement } from "./AdminManagement";
import { AuthorizedEmployeeManagement } from "./AuthorizedEmployeeManagement";
import { CommunityManagement } from "./CommunityManagement";
import { GuideManagement } from "./GuideManagement";
import { AISettingsManagement } from "./AISettingsManagement";
import { GoogleDriveSettings } from "./GoogleDriveSettings";
import { OperationsOverview } from "./OperationsOverview";
import { PersonalizedRecommendationManagement } from "./PersonalizedRecommendationManagement";
import seoulMetroLogo from "../assets/logo.png";
import { apiRequest } from "../lib/api";

interface AdminDashboardProps {
  admin: any;
  onLogout: () => void;
}

export function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVideos: 0,
    totalCategories: 0,
    totalPosts: 0,
    totalGuides: 0,
  });

  const loadStats = async () => {
    try {
      const [categoriesRes, usersRes, postsRes, guidesRes] = await Promise.all([
        apiRequest("/categories"),
        apiRequest("/users"),
        apiRequest("/community/posts?includeDrafts=true"),
        apiRequest("/guides?includeDrafts=true"),
      ]);
      const [categoriesData, usersData, postsData, guidesData] = await Promise.all([
        categoriesRes.json(),
        usersRes.json(),
        postsRes.json(),
        guidesRes.json(),
      ]);

      const categories = categoriesData.categories || [];
      let totalVideos = 0;
      for (const category of categories) {
        const videosRes = await apiRequest(`/videos/${category.id}`);
        const videosData = await videosRes.json();
        totalVideos += (videosData.videos || []).length;
      }

      setStats({
        totalUsers: usersData.users?.length || 0,
        totalVideos,
        totalCategories: categories.length,
        totalPosts: postsData.posts?.length || 0,
        totalGuides: guidesData.guides?.length || 0,
      });
    } catch (error) {
      console.error("Failed to load admin dashboard stats:", error);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshToken]);

  const handleUpdated = () => {
    setRefreshToken((token) => token + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={seoulMetroLogo} alt="서울교통공사" className="h-12 w-12" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">관리자 운영 센터</h1>
                <p className="text-sm text-gray-600">
                  {admin.name} ({admin.employeeId})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleUpdated}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">사용자</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.totalUsers}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">영상</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.totalVideos}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">카테고리</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.totalCategories}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">게시물</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.totalPosts}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">가이드북</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{stats.totalGuides}</CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
            <TabsTrigger value="overview">운영 개요</TabsTrigger>
            <TabsTrigger value="content">교육 콘텐츠</TabsTrigger>
            <TabsTrigger value="community">커뮤니티</TabsTrigger>
            <TabsTrigger value="guides">가이드북</TabsTrigger>
            <TabsTrigger value="ai">AI 챗봇</TabsTrigger>
            <TabsTrigger value="integrations">외부 연동</TabsTrigger>
            <TabsTrigger value="system">시스템</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OperationsOverview refreshToken={refreshToken} />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <CategoryManagement onStatsUpdate={handleUpdated} />
            <VideoManagement onStatsUpdate={handleUpdated} />
            <PersonalizedRecommendationManagement onUpdated={handleUpdated} />
          </TabsContent>

          <TabsContent value="community">
            <CommunityManagement admin={admin} onUpdated={handleUpdated} />
          </TabsContent>

          <TabsContent value="guides">
            <GuideManagement onUpdated={handleUpdated} />
          </TabsContent>

          <TabsContent value="ai">
            <AISettingsManagement onUpdated={handleUpdated} />
          </TabsContent>

          <TabsContent value="integrations">
            <GoogleDriveSettings onUpdated={handleUpdated} />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <AuthorizedEmployeeManagement />
            <AdminManagement currentAdmin={admin} />
            <UserProgressManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
