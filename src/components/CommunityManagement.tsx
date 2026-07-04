import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { apiRequest } from "../lib/api";
import { notifyContentChanged } from "../lib/contentSync";

const COMMUNITY_UPLOAD_ACCEPT =
  ".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,image/gif";

const getAssetPreviewLabel = (asset: any) => {
  if (asset.previewKind === "image-inline") return "이미지 미리보기";
  if (asset.previewKind === "pdf-inline") return "PDF 첫 페이지 미리보기";
  return "다운로드 전용";
};

const getPdfPreviewUrl = (url?: string | null) => (url ? `${url}#page=1&view=FitH` : null);

interface CommunityManagementProps {
  admin: any;
  onUpdated: () => void;
}

const emptyPost = {
  id: "",
  title: "",
  summary: "",
  content: "",
  postType: "document",
  metadata: {},
  isPublished: false,
  approvalStatus: "draft",
  assets: [] as any[],
};

const approvalStatusLabel: Record<string, string> = {
  draft: "초안",
  pending_review: "승인 대기",
  published: "공개",
  rejected: "반려",
};

export function CommunityManagement({ admin, onUpdated }: CommunityManagementProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [postForm, setPostForm] = useState(emptyPost);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return posts.filter((post) => {
      const keywordMatched =
        !keyword ||
        post.title.toLowerCase().includes(keyword) ||
        String(post.summary || "").toLowerCase().includes(keyword);
      const statusMatched = statusFilter === "all" || post.approvalStatus === statusFilter;
      return keywordMatched && statusMatched;
    });
  }, [posts, search, statusFilter]);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId],
  );

  const load = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/community/posts?includeDrafts=true&employeeId=${encodeURIComponent(admin.employeeId || "")}`);
      const data = await response.json();
      const nextPosts = data.posts || [];
      setPosts(nextPosts);
      if (nextPosts.length > 0) {
        const activePost = nextPosts.find((post: any) => post.id === selectedPostId) || nextPosts[0];
        setSelectedPostId(activePost.id);
        setPostForm({
          id: activePost.id,
          title: activePost.title,
          summary: activePost.summary || "",
          content: activePost.content || "",
          postType: activePost.postType,
          metadata: activePost.metadata || {},
          isPublished: activePost.isPublished,
          approvalStatus: activePost.approvalStatus || "draft",
          assets: activePost.assets || [],
        });
      } else {
        setSelectedPostId("");
        setPostForm(emptyPost);
      }
    } catch (error) {
      console.error("Failed to load community posts:", error);
      setMessage("커뮤니티 게시물을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedPost) {
      setPostForm({
        id: selectedPost.id,
        title: selectedPost.title,
        summary: selectedPost.summary || "",
        content: selectedPost.content || "",
        postType: selectedPost.postType,
        metadata: selectedPost.metadata || {},
        isPublished: selectedPost.isPublished,
        approvalStatus: selectedPost.approvalStatus || "draft",
        assets: selectedPost.assets || [],
      });
    }
  }, [selectedPost]);

  const resetForm = () => {
    setSelectedPostId("");
    setPostForm(emptyPost);
    setMessage("");
  };

  const handleUploadDocument = async (file: File) => {
    setMessage("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("employeeId", String(admin.employeeId || ""));
      formData.append("name", String(admin.name || ""));
      const response = await apiRequest("/community/assets/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "파일 업로드에 실패했습니다.");
      }
      setPostForm((prev) => ({
        ...prev,
        assets: [
          ...prev.assets,
          {
            ...data.asset,
            sortOrder: prev.assets.length,
          },
        ],
      }));
    } catch (error) {
      console.error("Failed to upload asset:", error);
      setMessage(error instanceof Error ? error.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadDocuments = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      await handleUploadDocument(file);
    }
  };

  const handleSavePost = async () => {
    try {
      setSaving(true);
      setMessage("");
      const method = postForm.id ? "PUT" : "POST";
      const path = postForm.id ? `/community/posts/${postForm.id}` : "/community/posts";
      const response = await apiRequest(path, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: postForm.title,
          summary: postForm.summary,
          content: postForm.content,
          postType: postForm.postType,
          metadata: postForm.metadata || {},
          isPublished: postForm.isPublished,
          approvalStatus: postForm.isPublished ? "published" : postForm.approvalStatus,
          authorEmployeeId: admin.employeeId,
          authorName: admin.name,
          assets: postForm.assets,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "게시물 저장에 실패했습니다.");
      }
      await load();
      notifyContentChanged(["community", "feed"]);
      onUpdated();
      setMessage("게시물이 저장되었습니다.");
    } catch (error) {
      console.error("Failed to save community post:", error);
      setMessage(error instanceof Error ? error.message : "게시물 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleReviewPost = async (postId: string, action: "approve" | "reject") => {
    try {
      const response = await apiRequest(`/community/posts/${postId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "승인 상태 변경에 실패했습니다.");
      }
      await load();
      notifyContentChanged(["community", "feed"]);
      onUpdated();
      setMessage(action === "approve" ? "게시물을 공개했습니다." : "게시물을 반려했습니다.");
    } catch (error) {
      console.error("Failed to review community post:", error);
      setMessage(error instanceof Error ? error.message : "승인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("정말로 이 게시물을 삭제하시겠습니까?")) return;
    try {
      const response = await apiRequest(`/community/posts/${postId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "게시물 삭제에 실패했습니다.");
      }
      await load();
      notifyContentChanged(["community", "feed"]);
      onUpdated();
      if (selectedPostId === postId) {
        resetForm();
      }
      setMessage("게시물을 삭제했습니다.");
    } catch (error) {
      console.error("Failed to delete community post:", error);
      setMessage(error instanceof Error ? error.message : "게시물 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
    try {
      const response = await apiRequest(`/community/comments/${commentId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "댓글 삭제에 실패했습니다.");
      }
      await load();
      notifyContentChanged(["community", "feed"]);
      onUpdated();
    } catch (error) {
      console.error("Failed to delete comment:", error);
      setMessage(error instanceof Error ? error.message : "댓글 삭제 중 오류가 발생했습니다.");
    }
  };

  const removeAsset = (index: number) => {
    setPostForm((prev) => ({
      ...prev,
      assets: prev.assets.filter((_: any, assetIndex: number) => assetIndex !== index).map((asset: any, nextIndex: number) => ({
        ...asset,
        sortOrder: nextIndex,
      })),
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">커뮤니티 데이터를 불러오는 중...</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1.4fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>게시물 목록</CardTitle>
            <CardDescription>문서 업로드 게시물과 승인 상태를 함께 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제목 또는 요약 검색"
              />
              <select
                className="h-9 rounded-md border bg-white px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">전체 상태</option>
                <option value="draft">초안</option>
                <option value="pending_review">승인 대기</option>
                <option value="published">공개</option>
                <option value="rejected">반려</option>
              </select>
              <Button variant="outline" onClick={resetForm}>
                새 게시물
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>댓글</TableHead>
                  <TableHead>좋아요</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow key={post.id} className={post.id === selectedPostId ? "bg-muted/50" : undefined}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{post.postType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.approvalStatus === "published" ? "default" : "outline"}>
                        {approvalStatusLabel[post.approvalStatus] || post.approvalStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{post.commentCount}</TableCell>
                    <TableCell>{post.likeCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedPostId(post.id)}>
                          선택
                        </Button>
                        {post.approvalStatus === "pending_review" ? (
                          <>
                            <Button size="sm" onClick={() => void handleReviewPost(post.id, "approve")}>
                              승인
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void handleReviewPost(post.id, "reject")}>
                              반려
                            </Button>
                          </>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={() => void handleDeletePost(post.id)}>
                          삭제
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedPost && (
          <Card>
            <CardHeader>
              <CardTitle>댓글 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>작성자</TableHead>
                    <TableHead>내용</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedPost.comments || []).map((comment: any) => (
                    <TableRow key={comment.id}>
                      <TableCell>{comment.authorName}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{comment.content}</TableCell>
                      <TableCell>{comment.isDeleted ? "삭제됨" : "노출 중"}</TableCell>
                      <TableCell className="text-right">
                        {!comment.isDeleted && (
                          <Button variant="outline" size="sm" onClick={() => void handleDeleteComment(comment.id)}>
                            삭제
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{postForm.id ? "게시물 수정" : "게시물 생성"}</CardTitle>
            <CardDescription>이미지와 PDF는 첫 미리보기를 제공하고, PPT/PPTX는 다운로드 전용으로 제공됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message ? (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <div>
              <Label htmlFor="post-title">제목</Label>
              <Input
                id="post-title"
                value={postForm.title}
                onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            {/* <div>
              <Label htmlFor="post-summary">요약</Label>
              <Textarea
                id="post-summary"
                rows={3}
                value={postForm.summary}
                onChange={(e) => setPostForm((prev) => ({ ...prev, summary: e.target.value }))}
              />
            </div> */}
            <div>
              <Label htmlFor="post-content">본문</Label>
              <Textarea
                id="post-content"
                rows={8}
                value={postForm.content}
                onChange={(e) => setPostForm((prev) => ({ ...prev, content: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="post-type">게시물 유형</Label>
                <select
                  id="post-type"
                  className="mt-2 h-9 w-full rounded-md border bg-white px-3 text-sm"
                  value={postForm.postType}
                  onChange={(e) => setPostForm((prev) => ({ ...prev, postType: e.target.value }))}
                >
                  <option value="notice">공지</option>
                  <option value="document">문서</option>
                  <option value="gallery">갤러리</option>
                  <option value="video">영상</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  id="post-published"
                  type="checkbox"
                  checked={postForm.isPublished}
                  onChange={(e) =>
                    setPostForm((prev) => ({
                      ...prev,
                      isPublished: e.target.checked,
                      approvalStatus: e.target.checked ? "published" : prev.approvalStatus === "published" ? "draft" : prev.approvalStatus,
                    }))
                  }
                />
                <Label htmlFor="post-published">즉시 공개</Label>
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">파일 첨부</div>
                  <div className="text-sm text-muted-foreground">PDF, PPT, PPTX, 이미지 파일을 업로드할 수 있습니다.</div>
                </div>
                <Input
                  type="file"
                  accept={COMMUNITY_UPLOAD_ACCEPT}
                  multiple
                  className="max-w-xs cursor-pointer"
                  disabled={uploading}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) {
                      void handleUploadDocuments(files);
                    }
                    e.currentTarget.value = "";
                  }}
                />
              </div>
              {uploading ? <div className="text-sm text-muted-foreground">파일을 업로드하는 중...</div> : null}
              <div className="space-y-2">
                {postForm.assets.length === 0 ? (
                  <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    첨부된 파일이 없습니다.
                  </div>
                ) : (
                  postForm.assets.map((asset: any, index: number) => (
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
                          <div className="text-xs text-muted-foreground truncate">
                            {asset.mimeType || "-"} / {getAssetPreviewLabel(asset)}
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

            <div className="flex gap-2">
              <Button onClick={() => void handleSavePost()} disabled={saving || uploading}>
                {saving ? "저장 중..." : "게시물 저장"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
