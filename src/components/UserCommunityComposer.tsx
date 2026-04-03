import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { apiRequest } from "../lib/api";

const COMMUNITY_UPLOAD_ACCEPT =
  ".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,image/gif";

const getAssetPreviewLabel = (asset: any) => {
  if (asset.previewKind === "image-inline") return "이미지 미리보기";
  if (asset.previewKind === "pdf-inline") return "PDF 첫 페이지 미리보기";
  return "다운로드 전용";
};

const getPdfPreviewUrl = (url?: string | null) => (url ? `${url}#page=1&view=FitH` : null);

interface UserCommunityComposerProps {
  currentUser: {
    employeeId?: string;
    name?: string;
  } | null;
  onSubmitted: () => void;
  onClose: () => void;
}

const emptyForm = {
  title: "",
  summary: "",
  content: "",
  assets: [] as any[],
};

export function UserCommunityComposer({ currentUser, onSubmitted, onClose }: UserCommunityComposerProps) {
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadDocument = async (file: File) => {
    if (!currentUser?.employeeId || !currentUser?.name) return;
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("employeeId", currentUser.employeeId);
      formData.append("name", currentUser.name);
      const response = await apiRequest("/community/assets/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "파일 업로드에 실패했습니다.");
      }
      setForm((prev) => ({
        ...prev,
        assets: [...prev.assets, { ...data.asset, sortOrder: prev.assets.length }],
      }));
    } catch (error) {
      console.error("User asset upload failed:", error);
      setMessage(error instanceof Error ? error.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const uploadDocuments = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      await uploadDocument(file);
    }
  };

  const submitPost = async () => {
    if (!currentUser?.employeeId || !currentUser?.name) return;
    try {
      setSaving(true);
      setMessage("");
      const response = await apiRequest("/community/posts/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          summary: form.summary,
          content: form.content,
          authorEmployeeId: currentUser.employeeId,
          authorName: currentUser.name,
          assets: form.assets,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "게시물 제출에 실패했습니다.");
      }
      setForm(emptyForm);
      setMessage("게시물이 승인 대기 상태로 제출되었습니다.");
      onSubmitted();
    } catch (error) {
      console.error("User post submit failed:", error);
      setMessage(error instanceof Error ? error.message : "게시물 제출 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const removeAsset = (index: number) => {
    setForm((prev) => ({
      ...prev,
      assets: prev.assets.filter((_: any, assetIndex: number) => assetIndex !== index).map((asset: any, nextIndex: number) => ({
        ...asset,
        sortOrder: nextIndex,
      })),
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>첨부 게시물 작성</CardTitle>
        <CardDescription>업로드한 게시물은 관리자 승인 후 공개됩니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        <div>
          <Label htmlFor="user-post-title">제목</Label>
          <Input
            id="user-post-title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="게시물 제목"
          />
        </div>
        <div>
          <Label htmlFor="user-post-summary">요약</Label>
          <Textarea
            id="user-post-summary"
            rows={3}
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            placeholder="게시물 요약"
          />
        </div>
        <div>
          <Label htmlFor="user-post-content">본문</Label>
          <Textarea
            id="user-post-content"
            rows={6}
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="본문 내용을 입력하세요."
          />
        </div>
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">PDF, PPT, PPTX, 이미지 첨부</div>
            <Input
              type="file"
              accept={COMMUNITY_UPLOAD_ACCEPT}
              multiple
              className="max-w-xs cursor-pointer"
              disabled={uploading}
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) {
                  void uploadDocuments(files);
                }
                e.currentTarget.value = "";
              }}
            />
          </div>
          {uploading ? <div className="text-sm text-muted-foreground">파일을 업로드하는 중...</div> : null}
          <div className="space-y-2">
            {form.assets.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-5 text-sm text-muted-foreground">
                첨부 파일이 없습니다.
              </div>
            ) : (
              form.assets.map((asset: any, index: number) => (
                <div key={`${asset.storagePath || asset.fileName}-${index}`} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {asset.previewKind === "image-inline" && (asset.previewUrl || asset.thumbnailUrl) ? (
                      <img
                        src={asset.previewUrl || asset.thumbnailUrl || ""}
                        alt={asset.fileName}
                        className="h-16 w-16 rounded-md border object-cover"
                      />
                    ) : null}
                    {asset.previewKind === "pdf-inline" && asset.previewUrl ? (
                      <iframe
                        src={getPdfPreviewUrl(asset.previewUrl) || ""}
                        title={asset.fileName}
                        className="h-16 w-16 rounded-md border bg-white"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{asset.fileName}</div>
                      <div className="text-xs text-muted-foreground">
                        {getAssetPreviewLabel(asset)}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeAsset(index)}>
                    제거
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving || uploading}>
            닫기
          </Button>
          <Button onClick={() => void submitPost()} disabled={saving || uploading || !form.title.trim()}>
            {saving ? "제출 중..." : "승인 요청"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
