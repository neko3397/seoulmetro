import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { apiRequest } from "../lib/api";

interface GuideManagementProps {
  onUpdated: () => void;
}

const emptyGuide = {
  id: "",
  title: "",
  description: "",
  slug: "",
  isPublished: false,
  version: 1,
  sections: [] as any[],
};

const emptySection = {
  id: "",
  title: "",
  slug: "",
  markdownContent: "",
  parentId: "",
  sortOrder: 0,
  depth: 0,
};

export function GuideManagement({ onUpdated }: GuideManagementProps) {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [guideForm, setGuideForm] = useState(emptyGuide);
  const [sectionForm, setSectionForm] = useState(emptySection);

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === selectedGuideId) || null,
    [guides, selectedGuideId],
  );

  const load = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/guides?includeDrafts=true");
      const data = await response.json();
      const nextGuides = data.guides || [];
      setGuides(nextGuides);
      if (nextGuides.length > 0) {
        const activeGuide = nextGuides.find((guide: any) => guide.id === selectedGuideId) || nextGuides[0];
        setSelectedGuideId(activeGuide.id);
        setGuideForm({
          id: activeGuide.id,
          title: activeGuide.title,
          description: activeGuide.description || "",
          slug: activeGuide.slug,
          isPublished: Boolean(activeGuide.isPublished),
          version: Number(activeGuide.version || 1),
          sections: activeGuide.sections || [],
        });
      } else {
        setSelectedGuideId("");
        setGuideForm(emptyGuide);
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
        title: selectedGuide.title,
        description: selectedGuide.description || "",
        slug: selectedGuide.slug,
        isPublished: Boolean(selectedGuide.isPublished),
        version: Number(selectedGuide.version || 1),
        sections: selectedGuide.sections || [],
      });
    }
  }, [selectedGuide]);

  const handleSaveGuide = async () => {
    try {
      const method = guideForm.id ? "PUT" : "POST";
      const path = guideForm.id ? `/guides/${guideForm.id}` : "/guides";
      const response = await apiRequest(path, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: guideForm.title,
          description: guideForm.description,
          slug: guideForm.slug,
          isPublished: guideForm.isPublished,
          version: guideForm.version,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "가이드북 저장에 실패했습니다.");
        return;
      }
      await load();
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
      onUpdated();
    } catch (error) {
      console.error("Failed to delete guide:", error);
      alert("가이드북 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSaveSection = async () => {
    if (!selectedGuideId) return;
    try {
      const method = sectionForm.id ? "PUT" : "POST";
      const path = sectionForm.id ? `/guide-sections/${sectionForm.id}` : `/guides/${selectedGuideId}/sections`;
      const response = await apiRequest(path, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: sectionForm.title,
          slug: sectionForm.slug,
          markdownContent: sectionForm.markdownContent,
          parentId: sectionForm.parentId || null,
          sortOrder: Number(sectionForm.sortOrder),
          depth: Number(sectionForm.depth),
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "섹션 저장에 실패했습니다.");
        return;
      }
      setSectionForm(emptySection);
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to save section:", error);
      alert("섹션 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("정말로 이 섹션을 삭제하시겠습니까?")) return;
    try {
      const response = await apiRequest(`/guide-sections/${sectionId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || "섹션 삭제에 실패했습니다.");
        return;
      }
      if (sectionForm.id === sectionId) setSectionForm(emptySection);
      await load();
      onUpdated();
    } catch (error) {
      console.error("Failed to delete section:", error);
      alert("섹션 삭제 중 오류가 발생했습니다.");
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
                  setGuideForm(emptyGuide);
                }}
              >
                새 가이드북
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
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
            <CardTitle>목차 및 섹션</CardTitle>
            <CardDescription>섹션 추가, 순서 조정, Markdown 본문 편집을 수행합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedGuide ? (
              <div className="text-sm text-muted-foreground">섹션을 편집할 가이드북을 선택하세요.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>깊이</TableHead>
                      <TableHead>순서</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedGuide.sections || []).map((section: any) => (
                      <TableRow key={section.id}>
                        <TableCell>{section.title}</TableCell>
                        <TableCell>{section.depth}</TableCell>
                        <TableCell>{section.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSectionForm({
                                  id: section.id,
                                  title: section.title,
                                  slug: section.slug,
                                  markdownContent: section.markdownContent,
                                  parentId: section.parentId || "",
                                  sortOrder: section.sortOrder,
                                  depth: section.depth,
                                })
                              }
                            >
                              수정
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteSection(section.id)}>
                              삭제
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="rounded-md border p-4 space-y-4">
                  <div className="font-medium">{sectionForm.id ? "섹션 수정" : "섹션 추가"}</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="section-title">제목</Label>
                      <Input
                        id="section-title"
                        value={sectionForm.title}
                        onChange={(e) => setSectionForm((prev) => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="section-slug">슬러그</Label>
                      <Input
                        id="section-slug"
                        value={sectionForm.slug}
                        onChange={(e) => setSectionForm((prev) => ({ ...prev, slug: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="section-parent">부모 섹션 ID</Label>
                      <Input
                        id="section-parent"
                        value={sectionForm.parentId}
                        onChange={(e) => setSectionForm((prev) => ({ ...prev, parentId: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="section-depth">깊이</Label>
                      <Input
                        id="section-depth"
                        type="number"
                        value={sectionForm.depth}
                        onChange={(e) => setSectionForm((prev) => ({ ...prev, depth: Number(e.target.value || 0) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="section-order">정렬 순서</Label>
                      <Input
                        id="section-order"
                        type="number"
                        value={sectionForm.sortOrder}
                        onChange={(e) => setSectionForm((prev) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="markdown-content">Markdown 본문</Label>
                    <Textarea
                      id="markdown-content"
                      rows={10}
                      value={sectionForm.markdownContent}
                      onChange={(e) => setSectionForm((prev) => ({ ...prev, markdownContent: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSection}>섹션 저장</Button>
                    <Button variant="outline" onClick={() => setSectionForm(emptySection)}>
                      초기화
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
