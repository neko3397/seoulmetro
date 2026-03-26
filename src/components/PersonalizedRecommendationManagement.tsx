import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { apiRequestJson } from "../lib/api";
import { PersonalizedRecommendationRule } from "../types/content";

interface VideoOption {
  id: string;
  title: string;
  categoryId?: string;
  thumbnail?: string;
}

interface RecommendationManagementProps {
  onUpdated: () => void;
}

const roles = ["기관사", "차장"] as const;
const careerStages = ["신입", "경력"] as const;

export function PersonalizedRecommendationManagement({ onUpdated }: RecommendationManagementProps) {
  const [rules, setRules] = useState<PersonalizedRecommendationRule[]>([]);
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[number]>("기관사");
  const [selectedCareerStage, setSelectedCareerStage] = useState<(typeof careerStages)[number]>("신입");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const currentRule = useMemo(
    () => rules.find((rule) => rule.role === selectedRole && rule.careerStage === selectedCareerStage) || null,
    [rules, selectedCareerStage, selectedRole],
  );

  const availableVideos = useMemo(() => {
    return [...videos].sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }, [videos]);

  const load = async () => {
    try {
      setLoading(true);
      const [rulesData, categoriesData] = await Promise.all([
        apiRequestJson<{ rules?: PersonalizedRecommendationRule[] }>("/personalized-recommendations"),
        apiRequestJson<{ categories?: Array<{ id: string }> }>("/categories"),
      ]);
      const categories = categoriesData.categories || [];

      const videoResponses = await Promise.all(
        categories.map((category: any) => apiRequestJson<{ videos?: any[] }>(`/videos/${category.id}`)),
      );

      setRules(rulesData.rules || []);
      setVideos(
        videoResponses.flatMap((payload) =>
          (payload.videos || []).map((video: any) => ({
            id: video.id,
            title: video.title,
            categoryId: video.categoryId,
            thumbnail: video.thumbnail,
          })),
        ),
      );
    } catch (error) {
      console.error("Failed to load personalized recommendation data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setSelectedVideoIds(currentRule?.videoIds || []);
  }, [currentRule]);

  const toggleVideo = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId],
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = await apiRequestJson<{ success?: boolean; error?: string }>("/personalized-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole,
          careerStage: selectedCareerStage,
          videoIds: selectedVideoIds,
        }),
      });
      if (!data.success) {
        alert(data.error || "추천 규칙 저장에 실패했습니다.");
        return;
      }

      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to save personalized recommendation rule:", error);
      alert("추천 규칙 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentRule) return;
    if (!confirm("현재 조합의 추천 규칙을 삭제하시겠습니까?")) return;

    try {
      const data = await apiRequestJson<{ success?: boolean; error?: string }>(
        `/personalized-recommendations/${currentRule.id}`,
        {
        method: "DELETE",
        },
      );
      if (!data.success) {
        alert(data.error || "추천 규칙 삭제에 실패했습니다.");
        return;
      }

      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to delete personalized recommendation rule:", error);
      alert("추천 규칙 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">맞춤형 교육 추천 규칙을 불러오는 중...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>맞춤형 교육 추천 관리</CardTitle>
        <CardDescription>직책과 경력 구분 조합별로 추천 영상을 지정합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>직책</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as (typeof roles)[number])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>경력 구분</Label>
            <Select
              value={selectedCareerStage}
              onValueChange={(value) => setSelectedCareerStage(value as (typeof careerStages)[number])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {careerStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {selectedRole} / {selectedCareerStage}
              </p>
              <p className="text-sm text-muted-foreground">선택된 영상이 현재 추천 목록으로 저장됩니다.</p>
            </div>
            {currentRule ? <Badge variant="secondary">저장된 규칙</Badge> : <Badge variant="outline">새 규칙</Badge>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {availableVideos.map((video) => {
              const active = selectedVideoIds.includes(video.id);
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => toggleVideo(video.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active ? "border-blue-600 bg-blue-50" : "border-border bg-background hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-24 overflow-hidden rounded-lg bg-muted">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium">{video.title}</p>
                      <p className="text-sm text-muted-foreground">{video.categoryId || "미분류"}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          {currentRule ? (
            <Button variant="outline" onClick={handleDelete}>
              규칙 삭제
            </Button>
          ) : null}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "추천 규칙 저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
