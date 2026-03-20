import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { apiRequest } from "../lib/api";

interface CommunityManagementProps {
  admin: any;
  onUpdated: () => void;
}

const emptyPost = {
  id: "",
  title: "",
  summary: "",
  content: "",
  postType: "notice",
  isPublished: false,
  assets: [] as any[],
};

const emptyAsset = {
  driveFileId: "",
  fileName: "",
  mimeType: "",
  assetType: "document",
  previewUrl: "",
  thumbnailUrl: "",
  fileSize: "",
  sortOrder: 0,
};

export function CommunityManagement({ admin, onUpdated }: CommunityManagementProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postForm, setPostForm] = useState(emptyPost);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [search, setSearch] = useState("");

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(keyword) ||
        String(post.summary || "").toLowerCase().includes(keyword),
    );
  }, [posts, search]);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId],
  );

  const load = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/community/posts?includeDrafts=true");
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
          isPublished: activePost.isPublished,
          assets: activePost.assets || [],
        });
      } else {
        setSelectedPostId("");
        setPostForm(emptyPost);
      }
    } catch (error) {
      console.error("Failed to load community posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedPost) {
      setPostForm({
        id: selectedPost.id,
        title: selectedPost.title,
        summary: selectedPost.summary || "",
        content: selectedPost.content || "",
        postType: selectedPost.postType,
        isPublished: selectedPost.isPublished,
        assets: selectedPost.assets || [],
      });
    }
  }, [selectedPost]);

  const handleSavePost = async () => {
    try {
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
          isPublished: postForm.isPublished,
          authorEmployeeId: admin.employeeId,
          authorName: admin.name,
          assets: postForm.assets,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "게시물 저장에 실패했습니다.");
        return;
      }
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to save community post:", error);
      alert("게시물 저장 중 오류가 발생했습니다.");
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
        alert(data.error || "게시물 삭제에 실패했습니다.");
        return;
      }
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to delete community post:", error);
      alert("게시물 삭제 중 오류가 발생했습니다.");
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
        alert(data.error || "댓글 삭제에 실패했습니다.");
        return;
      }
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("댓글 삭제 중 오류가 발생했습니다.");
    }
  };

  const addAsset = () => {
    if (!assetForm.fileName.trim()) return;
    setPostForm((prev) => ({
      ...prev,
      assets: [
        ...prev.assets,
        {
          ...assetForm,
          fileSize: assetForm.fileSize ? Number(assetForm.fileSize) : null,
          sortOrder: Number(assetForm.sortOrder || 0),
        },
      ],
    }));
    setAssetForm(emptyAsset);
  };

  const removeAsset = (index: number) => {
    setPostForm((prev) => ({
      ...prev,
      assets: prev.assets.filter((_: any, assetIndex: number) => assetIndex !== index),
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
            <CardDescription>게시물, 댓글, 좋아요 통계를 함께 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="제목 또는 요약 검색"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPostId("");
                  setPostForm(emptyPost);
                }}
              >
                새 게시물
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>공개</TableHead>
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
                    <TableCell>{post.isPublished ? "공개" : "비공개"}</TableCell>
                    <TableCell>{post.commentCount}</TableCell>
                    <TableCell>{post.likeCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedPostId(post.id)}>
                          선택
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeletePost(post.id)}>
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
                          <Button variant="outline" size="sm" onClick={() => handleDeleteComment(comment.id)}>
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="post-title">제목</Label>
              <Input
                id="post-title"
                value={postForm.title}
                onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="post-summary">요약</Label>
              <Textarea
                id="post-summary"
                rows={3}
                value={postForm.summary}
                onChange={(e) => setPostForm((prev) => ({ ...prev, summary: e.target.value }))}
              />
            </div>
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
                <Input
                  id="post-type"
                  value={postForm.postType}
                  onChange={(e) => setPostForm((prev) => ({ ...prev, postType: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  id="post-published"
                  type="checkbox"
                  checked={postForm.isPublished}
                  onChange={(e) => setPostForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />
                <Label htmlFor="post-published">공개 상태</Label>
              </div>
            </div>

            <div className="rounded-md border p-4 space-y-4">
              <div className="font-medium">첨부 자산</div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  placeholder="파일명"
                  value={assetForm.fileName}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, fileName: e.target.value }))}
                />
                <Input
                  placeholder="Drive 파일 ID"
                  value={assetForm.driveFileId}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, driveFileId: e.target.value }))}
                />
                <Input
                  placeholder="MIME 타입"
                  value={assetForm.mimeType}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, mimeType: e.target.value }))}
                />
                <Input
                  placeholder="자산 유형(document/image/video)"
                  value={assetForm.assetType}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, assetType: e.target.value }))}
                />
                <Input
                  placeholder="미리보기 URL"
                  value={assetForm.previewUrl}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, previewUrl: e.target.value }))}
                />
                <Input
                  placeholder="썸네일 URL"
                  value={assetForm.thumbnailUrl}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
                />
                <Input
                  placeholder="파일 크기(byte)"
                  value={assetForm.fileSize}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, fileSize: e.target.value }))}
                />
                <Input
                  placeholder="정렬 순서"
                  type="number"
                  value={assetForm.sortOrder}
                  onChange={(e) => setAssetForm((prev) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))}
                />
              </div>
              <Button variant="outline" onClick={addAsset}>
                자산 추가
              </Button>
              <div className="space-y-2">
                {postForm.assets.map((asset: any, index: number) => (
                  <div key={`${asset.fileName}-${index}`} className="flex items-center justify-between rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{asset.fileName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {asset.assetType} / {asset.mimeType || "-"}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => removeAsset(index)}>
                      제거
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSavePost}>게시물 저장</Button>
              <Button variant="outline" onClick={() => setPostForm(emptyPost)}>
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
