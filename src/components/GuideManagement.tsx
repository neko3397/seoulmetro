import React, { useEffect, useMemo, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { apiRequest, apiRequestJson } from "../lib/api";
import { notifyContentChanged } from "../lib/contentSync";
import { buildGuideMarkdown, normalizeGuideMarkdown, parseGuideMarkdown } from "../lib/guideMarkdown";
import { markdownToHtml } from "../app/utils";
import type { GuideCategory, GuideDetail } from "../types/content";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface GuideManagementProps {
  onUpdated: () => void;
}

type UploadKind = "markdown" | "pdf" | null;

interface GuideFormState {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  isPublished: boolean;
  version: number;
  markdownContent: string;
}

const createEmptyGuide = (categoryId = ""): GuideFormState => ({
  id: "",
  categoryId,
  title: "",
  description: "",
  isPublished: true,
  version: 1,
  markdownContent: "",
});

const buildFormFromGuide = (guide: GuideDetail, categories: GuideCategory[]): GuideFormState => ({
  id: guide.id,
  categoryId: guide.categoryId || categories[0]?.id || "",
  title: guide.title,
  description: guide.description || "",
  isPublished: Boolean(guide.isPublished),
  version: Number(guide.version || 1),
  markdownContent: buildGuideMarkdown(guide.title, guide.description || "", guide.sections || []),
});

export function GuideManagement({ onUpdated }: GuideManagementProps) {
  const [categories, setCategories] = useState<GuideCategory[]>([]);
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [uploadKind, setUploadKind] = useState<UploadKind>(null);
  const [guideForm, setGuideForm] = useState<GuideFormState>(createEmptyGuide());

  const parsedMarkdown = useMemo(
    () => parseGuideMarkdown(guideForm.markdownContent, { fallbackTitle: guideForm.title }),
    [guideForm.markdownContent, guideForm.title],
  );

  const markdownPreviewHtml = useMemo(() => {
    if (uploadKind !== "markdown") return "";
    return markdownToHtml(guideForm.markdownContent);
  }, [guideForm.markdownContent, uploadKind]);

  const load = async (preferredGuideId?: string) => {
    try {
      setLoading(true);
      const [guideData, categoryData] = await Promise.all([
        apiRequestJson<{ guides?: GuideDetail[] }>("/guides?includeDrafts=true"),
        apiRequestJson<{ categories?: GuideCategory[] }>("/document-categories"),
      ]);
      const nextGuides = (guideData.guides || []) as GuideDetail[];
      const nextCategories = (categoryData.categories || []) as GuideCategory[];

      setGuides(nextGuides);
      setCategories(nextCategories);

      if (nextGuides.length === 0) {
        setSelectedGuideId("");
        setGuideForm(createEmptyGuide(nextCategories[0]?.id || ""));
        setUploadKind(null);
        return;
      }

      const activeGuide =
        nextGuides.find((guide) => guide.id === preferredGuideId) ||
        nextGuides.find((guide) => guide.id === selectedGuideId) ||
        nextGuides[0];

      setSelectedGuideId(activeGuide.id);
      setGuideForm(buildFormFromGuide(activeGuide, nextCategories));
      setUploadKind(null);
    } catch (error) {
      console.error("Failed to load guides:", error);
      setGuides([]);
      setCategories([]);
      setSelectedGuideId("");
      setGuideForm(createEmptyGuide());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectGuide = (guideId: string) => {
    const targetGuide = guides.find((guide) => guide.id === guideId);
    if (!targetGuide) return;
    setSelectedGuideId(guideId);
    setGuideForm(buildFormFromGuide(targetGuide, categories));
    setUploadKind(null);
  };

  const resetForNewGuide = () => {
    setSelectedGuideId("");
    setGuideForm(createEmptyGuide(categories[0]?.id || ""));
    setUploadKind(null);
  };

  const updateMarkdown = (value: string) => {
    const normalized = normalizeGuideMarkdown(value);
    const parsed = parseGuideMarkdown(normalized, { fallbackTitle: guideForm.title });

    setGuideForm((prev) => ({
      ...prev,
      title: parsed.title || prev.title,
      description: parsed.description,
      markdownContent: normalized,
    }));
  };

  const extractPdfMarkdown = async (file: File) => {
    const fileBuffer = await file.arrayBuffer();
    const loadingTask = getDocument({
      data: fileBuffer,
      disableAutoFetch: true,
      disableStream: true,
      disableRange: true,
    });

    try {
      const pdf = await loadingTask.promise;
      const titleFromFile = file.name.replace(/\.[^.]+$/, "").trim() || "가이드북";
      const pages: string[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (text) {
          pages.push(`## ${pageNumber}페이지\n\n${text}`);
        }

        page.cleanup();
      }

      pdf.cleanup();
      await pdf.destroy();

      return [`# ${guideForm.title.trim() || titleFromFile}`, ...pages].filter(Boolean).join("\n\n").trim();
    } finally {
      void loadingTask.destroy();
    }
  };

  const handleGuideFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportingFile(true);

      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const nextUploadKind: UploadKind = isPdf ? "pdf" : "markdown";
      const nextMarkdown = isPdf ? await extractPdfMarkdown(file) : normalizeGuideMarkdown(await file.text());

      setUploadKind(nextUploadKind);
      updateMarkdown(nextMarkdown);
    } catch (error) {
      console.error("Failed to read guide file:", error);
      alert("파일을 읽는 중 오류가 발생했습니다. Markdown 또는 PDF 파일인지 확인하세요.");
    } finally {
      setImportingFile(false);
      event.target.value = "";
    }
  };

  const handleSaveGuide = async () => {
    if (!guideForm.markdownContent.trim()) {
      alert("가이드북 Markdown 본문을 업로드하거나 입력하세요.");
      return;
    }

    try {
      setSaving(true);
      const targetGuideId = guideForm.id || selectedGuideId;
      const method = targetGuideId ? "PUT" : "POST";
      const path = targetGuideId ? `/guides/${targetGuideId}` : "/guides";

      const response = await apiRequest(path, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: guideForm.categoryId || categories[0]?.id || null,
          title: guideForm.title,
          description: guideForm.description,
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

      const savedGuideId = data.guide?.id ? String(data.guide.id) : targetGuideId;
      await load(savedGuideId);
      notifyContentChanged(["guides"]);
      onUpdated();
    } catch (error) {
      console.error("Failed to save guide:", error);
      alert("가이드북 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
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
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>가이드북 목록</CardTitle>
            <CardDescription>기존 가이드북을 선택하거나 새 문서를 작성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full" onClick={resetForNewGuide}>
              새 가이드북
            </Button>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>공개</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guides.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        등록된 가이드북이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    guides.map((guide) => (
                      <TableRow key={guide.id} className={guide.id === selectedGuideId ? "bg-muted/50" : undefined}>
                        <TableCell>
                          <div className="font-medium">{guide.title}</div>
                          <div className="text-xs text-muted-foreground">{guide.sectionCount}개 섹션</div>
                        </TableCell>
                        <TableCell>{guide.isPublished ? "공개" : "비공개"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => selectGuide(guide.id)}>
                              선택
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteGuide(guide.id)}>
                              삭제
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
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{guideForm.id ? "가이드북 수정" : "가이드북 생성"}</CardTitle>
            <CardDescription>Markdown 또는 PDF를 업로드하고, 필요하면 본문을 수정한 뒤 저장합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guide-title">제목</Label>
                <Input
                  id="guide-title"
                  value={guideForm.title}
                  onChange={(e) => setGuideForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guide-category">카테고리</Label>
                <select
                  id="guide-category"
                  className="flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-sm outline-none"
                  value={guideForm.categoryId || categories[0]?.id || ""}
                  onChange={(e) => setGuideForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_120px_140px]">
              <div className="space-y-2">
                <Label htmlFor="guide-description">설명</Label>
                <Input
                  id="guide-description"
                  value={guideForm.description}
                  onChange={(e) => setGuideForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guide-version">버전</Label>
                <Input
                  id="guide-version"
                  type="number"
                  min={1}
                  value={guideForm.version}
                  onChange={(e) =>
                    setGuideForm((prev) => ({
                      ...prev,
                      version: Math.max(1, Number(e.target.value || 1)),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guide-published">공개 여부</Label>
                <label
                  htmlFor="guide-published"
                  className="flex h-9 items-center gap-2 rounded-md border border-input bg-input-background px-3 text-sm"
                >
                  <input
                    id="guide-published"
                    type="checkbox"
                    checked={guideForm.isPublished}
                    onChange={(e) => setGuideForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  />
                  공개
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guide-file">Markdown 또는 PDF 업로드</Label>
              <Input
                id="guide-file"
                type="file"
                accept=".md,.markdown,text/markdown,text/plain,.pdf,application/pdf"
                onChange={handleGuideFileChange}
              />
              <div className="text-sm text-muted-foreground">
                Markdown 파일은 렌더링 미리보기를 보여주고, PDF는 텍스트를 추출해 Markdown 본문으로 변환합니다.
              </div>
              {importingFile ? <div className="text-sm text-muted-foreground">파일 내용을 불러오는 중...</div> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guide-markdown-content">Markdown 본문</Label>
              <Textarea
                id="guide-markdown-content"
                rows={18}
                value={guideForm.markdownContent}
                onChange={(e) => updateMarkdown(e.target.value)}
                placeholder="# 문서 제목&#10;&#10;## 1장&#10;본문..."
              />
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-3 font-medium">자동 생성 목차</div>
              {parsedMarkdown.sections.length === 0 ? (
                <div className="text-sm text-muted-foreground">섹션 제목이 아직 없습니다.</div>
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

            {uploadKind === "markdown" ? (
              <div className="rounded-md border p-4">
                <div className="mb-3 font-medium">Markdown 렌더링 미리보기</div>
                {guideForm.markdownContent.trim() ? (
                  <div
                    className="space-y-4 leading-relaxed text-slate-700 [&_a]:break-all [&_blockquote]:my-4 [&_code]:font-mono [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mt-5 [&_h4]:text-lg [&_h4]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_p]:my-4 [&_pre]:my-5 [&_ul]:my-4"
                    dangerouslySetInnerHTML={{ __html: markdownPreviewHtml }}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">미리볼 Markdown 본문이 없습니다.</div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={handleSaveGuide} disabled={saving || importingFile}>
                {saving ? "저장 중..." : "가이드북 저장"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
