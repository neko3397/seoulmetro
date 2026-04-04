import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { apiRequest } from "../lib/api";
import { notifyContentChanged } from "../lib/contentSync";
import { buildGuideMarkdown, parseGuideMarkdown } from "../lib/guideMarkdown";

interface GuideManagementProps {
  onUpdated: () => void;
}

const emptyGuide = {
  id: "",
  categoryId: "",
  title: "",
  description: "",
  slug: "",
  isPublished: false,
  version: 1,
  markdownContent: "",
  sections: [] as any[],
};

export function GuideManagement({ onUpdated }: GuideManagementProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [guideForm, setGuideForm] = useState(emptyGuide);

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === selectedGuideId) || null,
    [guides, selectedGuideId],
  );
  const parsedMarkdown = useMemo(
    () => parseGuideMarkdown(guideForm.markdownContent, { fallbackTitle: guideForm.title }),
    [guideForm.markdownContent, guideForm.title],
  );

  const load = async () => {
    try {
      setLoading(true);
      const [guideResponse, categoryResponse] = await Promise.all([
        apiRequest("/guides?includeDrafts=true"),
        apiRequest("/document-categories"),
      ]);
      const [guideData, categoryData] = await Promise.all([guideResponse.json(), categoryResponse.json()]);
      const nextGuides = guideData.guides || [];
      const nextCategories = categoryData.categories || [];
      setCategories(nextCategories);
      setGuides(nextGuides);
      if (nextGuides.length > 0) {
        const activeGuide = nextGuides.find((guide: any) => guide.id === selectedGuideId) || nextGuides[0];
        setSelectedGuideId(activeGuide.id);
        setGuideForm({
          id: activeGuide.id,
          categoryId: activeGuide.categoryId || nextCategories[0]?.id || "",
          title: activeGuide.title,
          description: activeGuide.description || "",
          slug: activeGuide.slug,
          isPublished: Boolean(activeGuide.isPublished),
          version: Number(activeGuide.version || 1),
          markdownContent: buildGuideMarkdown(
            activeGuide.title,
            activeGuide.description || "",
            activeGuide.sections || [],
          ),
          sections: activeGuide.sections || [],
        });
      } else {
        setSelectedGuideId("");
        setGuideForm({
          ...emptyGuide,
          categoryId: nextCategories[0]?.id || "",
        });
      }
    } catch (error) {
      console.error("Failed to load guides:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedGuide) {
      setGuideForm({
        id: selectedGuide.id,
        categoryId: selectedGuide.categoryId || categories[0]?.id || "",
        title: selectedGuide.title,
        description: selectedGuide.description || "",
        slug: selectedGuide.slug,
        isPublished: Boolean(selectedGuide.isPublished),
        version: Number(selectedGuide.version || 1),
        markdownContent: buildGuideMarkdown(selectedGuide.title, selectedGuide.description || "", selectedGuide.sections || []),
        sections: selectedGuide.sections || [],
      });
    }
  }, [categories, selectedGuide]);

  const applyMarkdown = (markdownContent: string) => {
    const parsed = parseGuideMarkdown(markdownContent, { fallbackTitle: guideForm.title });
    setGuideForm((prev) => ({
      ...prev,
      title: parsed.title || prev.title,
      description: parsed.description || prev.description,
      slug: parsed.title || prev.slug,
      markdownContent,
    }));
  };

  const handleMarkdownFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const markdownContent = await file.text();
      applyMarkdown(markdownContent);
    } catch (error) {
      console.error("Failed to read markdown file:", error);
      alert("Markdown 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveGuide = async () => {
    if (!guideForm.markdownContent.trim()) {
      alert("가이드북 Markdown 본문을 업로드하거나 입력하세요.");
      return;
    }
    try {
      const method = guideForm.id ? "PUT" : "POST";
      const path = guideForm.id ? `/guides/${guideForm.id}` : "/guides";
      const response = await apiRequest(path, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: guideForm.categoryId || categories[0]?.id || null,
          title: guideForm.title,
          description: guideForm.description,
          slug: guideForm.slug,
          isPublished: guideForm.isPublished,
          version: guideForm.version,
          markdownContent: guideForm.markdownContent,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "가이드북 저장에 실패했습니다.");
        return;
      }
      await load();
      notifyContentChanged(["guides"]);
      onUpdated();
    } catch (error) {
      console.error("Failed to save guide:", error);
      alert("가이드북 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteGuide = async (guideId: string) => {
    if (!confirm("정말로 이 가이드북을 삭제하시겠습니까?")) return;
    try {
      const response = await apiRequest(`/guides/${guideId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "가이드북 삭제에 실패했습니다.");
        return;
      }
      await load();
      notifyContentChanged(["guides"]);
      onUpdated();
    } catch (error) {
      console.error("Failed to delete guide:", error);
      alert("가이드북 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">가이드북을 불러오는 중...</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>가이드북 목록</CardTitle>
            <CardDescription>공식 교육용 가이드북과 공개 상태를 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedGuideId("");
                  setGuideForm({
                    ...emptyGuide,
                    categoryId: categories[0]?.id || "",
                  });
                }}
              >
                새 가이드북
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>카테고리</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>공개</TableHead>
                  <TableHead>섹션 수</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides.map((guide) => (
                  <TableRow
                    key={guide.id}
                    className={guide.id === selectedGuideId ? "bg-muted/50" : undefined}
                  >
                    <TableCell>{guide.category?.title || "-"}</TableCell>
                    <TableCell className="font-medium">{guide.title}</TableCell>
                    <TableCell>{guide.isPublished ? "공개" : "비공개"}</TableCell>
                    <TableCell>{guide.sectionCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedGuideId(guide.id)}>
                          선택
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteGuide(guide.id)}>
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

        <Card>
          <CardHeader>
            <CardTitle>{guideForm.id ? "가이드북 수정" : "가이드북 생성"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="guide-category">문서 카테고리</Label>
              <Select
                value={guideForm.categoryId || categories[0]?.id || ""}
                onValueChange={(value) => setGuideForm((prev) => ({ ...prev, categoryId: value }))}
              >
                <SelectTrigger id="guide-category">
                  <SelectValue placeholder="문서 카테고리를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="guide-title">제목</Label>
              <Input
                id="guide-title"
                value={guideForm.title}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="guide-description">설명</Label>
              <Textarea
                id="guide-description"
                rows={3}
                value={guideForm.description}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="guide-slug">슬러그</Label>
                <Input
                  id="guide-slug"
                  value={guideForm.slug}
                  onChange={(e) => setGuideForm((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="guide-version">버전</Label>
                <Input
                  id="guide-version"
                  type="number"
                  value={guideForm.version}
                  onChange={(e) => setGuideForm((prev) => ({ ...prev, version: Number(e.target.value || 1) }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="guide-published"
                type="checkbox"
                checked={guideForm.isPublished}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
              />
              <Label htmlFor="guide-published">공개 상태</Label>
            </div>
            <Button onClick={handleSaveGuide}>가이드북 저장</Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Markdown 업로드</CardTitle>
            <CardDescription>마크다운 문서만 업로드하면 목차와 섹션이 자동 생성됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guide-markdown-file">Markdown 파일</Label>
              <Input id="guide-markdown-file" type="file" accept=".md,.markdown,text/markdown,text/plain" onChange={handleMarkdownFileChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guide-markdown-content">Markdown 본문</Label>
              <Textarea
                id="guide-markdown-content"
                rows={18}
                value={guideForm.markdownContent}
                onChange={(e) => setGuideForm((prev) => ({ ...prev, markdownContent: e.target.value }))}
                placeholder="# 문서 제목&#10;&#10;## 1장&#10;본문..."
              />
            </div>

            <div className="rounded-md border p-4 space-y-3">
              <div className="font-medium">자동 생성될 목차</div>
              <div className="text-sm text-muted-foreground">
                <code>##</code>, <code>###</code> 같은 제목 구조를 읽어 섹션과 들여쓰기를 자동으로 만듭니다.
              </div>
              {parsedMarkdown.sections.length === 0 ? (
                <div className="text-sm text-muted-foreground">생성 가능한 섹션이 없습니다.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>깊이</TableHead>
                      <TableHead>순서</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedMarkdown.sections.map((section) => (
                      <TableRow key={`${section.slug}-${section.sortOrder}`}>
                        <TableCell style={{ paddingLeft: `${section.depth * 18 + 16}px` }}>{section.title}</TableCell>
                        <TableCell>{section.depth}</TableCell>
                        <TableCell>{section.sortOrder + 1}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
