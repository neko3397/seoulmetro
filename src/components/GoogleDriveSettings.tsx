import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { apiRequest } from "../lib/api";

interface GoogleDriveSettingsProps {
  onUpdated: () => void;
}

export function GoogleDriveSettings({ onUpdated }: GoogleDriveSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    enabled: false,
    folderId: "",
    allowedMimeTypes: "application/pdf\nimage/png\nimage/jpeg\nvideo/mp4",
    maxFileSizeMb: 100,
    previewMode: "restricted",
    credentialConfigured: false,
    lastValidatedAt: "",
    lastError: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/admin/integrations/google-drive");
      const data = await response.json();
      const value = data.value || {};
      setFormData({
        enabled: Boolean(value.enabled),
        folderId: value.folderId || "",
        allowedMimeTypes: Array.isArray(value.allowedMimeTypes)
          ? value.allowedMimeTypes.join("\n")
          : "application/pdf\nimage/png\nimage/jpeg\nvideo/mp4",
        maxFileSizeMb: Number(value.maxFileSizeMb || 100),
        previewMode: value.previewMode || "restricted",
        credentialConfigured: Boolean(value.credentialConfigured),
        lastValidatedAt: value.lastValidatedAt || "",
        lastError: value.lastError || "",
      });
    } catch (error) {
      console.error("Failed to load Google Drive settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiRequest("/admin/integrations/google-drive", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: formData.enabled,
          folderId: formData.folderId,
          allowedMimeTypes: formData.allowedMimeTypes
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          maxFileSizeMb: Number(formData.maxFileSizeMb),
          previewMode: formData.previewMode,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "Google Drive 설정 저장에 실패했습니다.");
        return;
      }
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to save Google Drive settings:", error);
      alert("Google Drive 설정 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    try {
      const response = await apiRequest("/admin/integrations/google-drive/validate", {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.value?.lastError || data.error || "연결 확인에 실패했습니다.");
      }
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to validate Google Drive settings:", error);
      alert("Google Drive 연결 확인 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">설정을 불러오는 중...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Drive 연결 상태</CardTitle>
          <CardDescription>서비스 계정 자격 증명은 서버 환경 변수로 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant={formData.credentialConfigured ? "default" : "destructive"}>
            {formData.credentialConfigured ? "자격 증명 설정됨" : "자격 증명 없음"}
          </Badge>
          <Badge variant={formData.enabled ? "default" : "secondary"}>
            {formData.enabled ? "연동 활성화" : "연동 비활성화"}
          </Badge>
          {formData.lastValidatedAt && (
            <span className="text-sm text-muted-foreground">
              마지막 확인: {new Date(formData.lastValidatedAt).toLocaleString("ko-KR")}
            </span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drive 설정</CardTitle>
          <CardDescription>기본 업로드 폴더와 허용 파일 정책을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              id="drive-enabled"
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
            <Label htmlFor="drive-enabled">Google Drive 연동 활성화</Label>
          </div>

          <div>
            <Label htmlFor="folderId">기본 폴더 ID</Label>
            <Input
              id="folderId"
              value={formData.folderId}
              onChange={(e) => setFormData((prev) => ({ ...prev, folderId: e.target.value }))}
              placeholder="Drive 폴더 ID"
            />
          </div>

          <div>
            <Label htmlFor="previewMode">미리보기 정책</Label>
            <Input
              id="previewMode"
              value={formData.previewMode}
              onChange={(e) => setFormData((prev) => ({ ...prev, previewMode: e.target.value }))}
              placeholder="restricted"
            />
          </div>

          <div>
            <Label htmlFor="maxFileSize">최대 파일 크기(MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={formData.maxFileSizeMb}
              onChange={(e) => setFormData((prev) => ({ ...prev, maxFileSizeMb: Number(e.target.value || 0) }))}
            />
          </div>

          <div>
            <Label htmlFor="mimeTypes">허용 MIME 타입</Label>
            <Textarea
              id="mimeTypes"
              rows={5}
              value={formData.allowedMimeTypes}
              onChange={(e) => setFormData((prev) => ({ ...prev, allowedMimeTypes: e.target.value }))}
            />
          </div>

          {formData.lastError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              최근 오류: {formData.lastError}
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              설정 저장
            </Button>
            <Button variant="outline" onClick={handleValidate}>
              연결 확인
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
