import React, { useEffect, useState } from "react";
import { Edit, ExternalLink, FolderOpen, Plus, Trash2, Upload, X } from "lucide-react";
import { notifyContentChanged } from "../lib/contentSync";
import { apiRequestJson } from "../lib/api";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Textarea } from "./ui/textarea";

const FALLBACK_IMAGE = "https://via.placeholder.com/400x300/e2e8f0/0f172a?text=Document";

interface DocumentCategory {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  description: string;
}

interface DocumentCategoryManagementProps {
  onUpdated: () => void;
}

export function DocumentCategoryManagement({ onUpdated }: DocumentCategoryManagementProps) {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    image: "",
    description: "",
  });

  useEffect(() => {
    void loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await apiRequestJson<{ categories?: DocumentCategory[] }>("/document-categories");
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to load document categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const filePath = `document-categories/category-${Date.now()}.${fileExt}`;
    const body = new FormData();
    body.append("file", file);
    body.append("filePath", filePath);

    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a8898ff1/images/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
      cache: "no-store",
      body,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "이미지 업로드에 실패했습니다.");
    }
    return data.publicUrl.publicUrl;
  };

  const resetForm = () => {
    setEditingCategory(null);
    setSelectedFile(null);
    setImagePreview("");
    setFormData({
      title: "",
      subtitle: "",
      image: "",
      description: "",
    });
  };

  const handleEdit = (category: DocumentCategory) => {
    setEditingCategory(category);
    setSelectedFile(null);
    setImagePreview(category.image || "");
    setFormData({
      title: category.title,
      subtitle: category.subtitle || "",
      image: category.image || "",
      description: category.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsUploading(true);

    try {
      let image = formData.image || FALLBACK_IMAGE;
      if (selectedFile) {
        image = await uploadImage(selectedFile);
      }

      const path = editingCategory ? `/document-categories/${editingCategory.id}` : "/document-categories";
      const method = editingCategory ? "PUT" : "POST";
      const data = await apiRequestJson<{ success?: boolean; error?: string }>(path, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          image,
        }),
      });
      if (!data.success) {
        alert(data.error || "문서 카테고리 저장에 실패했습니다.");
        return;
      }
      await loadCategories();
      notifyContentChanged(["guides"]);
      onUpdated();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save document category:", error);
      alert(error instanceof Error ? error.message : "문서 카테고리 저장 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("정말로 이 문서 카테고리를 삭제하시겠습니까?")) return;
    try {
      const data = await apiRequestJson<{ success?: boolean; error?: string }>(`/document-categories/${categoryId}`, {
        method: "DELETE",
      });
      if (!data.success) {
        alert(data.error || "문서 카테고리 삭제에 실패했습니다.");
        return;
      }
      await loadCategories();
      notifyContentChanged(["guides"]);
      onUpdated();
    } catch (error) {
      console.error("Failed to delete document category:", error);
      alert(error instanceof Error ? error.message : "문서 카테고리 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">문서 카테고리를 불러오는 중...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>문서 카테고리 관리</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCategory ? "문서 카테고리 수정" : "문서 카테고리 추가"}</DialogTitle>
                <DialogDescription>교육영상 카테고리와 같은 방식으로 문서 카테고리를 관리합니다.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="document-category-title">카테고리 제목</Label>
                  <Input
                    id="document-category-title"
                    value={formData.title}
                    onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="document-category-subtitle">부제목</Label>
                  <Input
                    id="document-category-subtitle"
                    value={formData.subtitle}
                    onChange={(event) => setFormData((prev) => ({ ...prev, subtitle: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="document-category-image">카테고리 이미지</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        id="document-category-image"
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setSelectedFile(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (loadEvent) => setImagePreview(String(loadEvent.target?.result || ""));
                            reader.readAsDataURL(file);
                          } else {
                            setImagePreview("");
                          }
                        }}
                      />
                      {selectedFile ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    {imagePreview || formData.image ? (
                      <img
                        src={imagePreview || formData.image}
                        alt="문서 카테고리 미리보기"
                        className="h-20 w-32 rounded border object-cover"
                      />
                    ) : null}
                  </div>
                </div>
                <div>
                  <Label htmlFor="document-category-description">설명</Label>
                  <Textarea
                    id="document-category-description"
                    rows={3}
                    value={formData.description}
                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                    취소
                  </Button>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : editingCategory ? (
                      "수정"
                    ) : (
                      "추가"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이미지</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>부제목</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    <FolderOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p>등록된 문서 카테고리가 없습니다.</p>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <img src={category.image || FALLBACK_IMAGE} alt={category.title} className="h-12 w-16 rounded object-cover" />
                    </TableCell>
                    <TableCell className="font-medium">{category.title}</TableCell>
                    <TableCell className="text-gray-600">{category.subtitle}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm text-gray-600" title={category.description}>
                        {category.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(category.image, "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(category.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
