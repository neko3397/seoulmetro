import { type ReactNode, useEffect, useRef, useState } from "react";
import { CalendarDays, Download, FileText, Heart, MessageCircle, UserRound } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { CommunityPost } from "../../types/content";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { formatDateTime } from "../utils";

const mapPrototype = Map.prototype as Map<unknown, unknown> & {
  getOrInsert?: (key: unknown, defaultValue: unknown) => unknown;
  getOrInsertComputed?: (key: unknown, compute: (key: unknown) => unknown) => unknown;
};

if (!mapPrototype.getOrInsert) {
  Object.defineProperty(mapPrototype, "getOrInsert", {
    value(key: unknown, defaultValue: unknown) {
      if (!this.has(key)) this.set(key, defaultValue);
      return this.get(key);
    },
    configurable: true,
    writable: true,
  });
}

if (!mapPrototype.getOrInsertComputed) {
  Object.defineProperty(mapPrototype, "getOrInsertComputed", {
    value(key: unknown, compute: (key: unknown) => unknown) {
      if (!this.has(key)) this.set(key, compute(key));
      return this.get(key);
    },
    configurable: true,
    writable: true,
  });
}

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface CommunityPostDetailPageProps {
  post: CommunityPost | null;
}

interface PdfInlineRendererProps {
  url: string;
  title: string;
}

function DetailSection({
  title,
  description,
  action,
  children,
  contentClassName = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="rounded-[1.9rem] bg-[linear-gradient(135deg,rgba(14,165,233,0.22),rgba(59,130,246,0.14),rgba(255,255,255,0.9))] p-[1px] shadow-[0_22px_60px_-42px_rgba(15,23,42,0.45)]">
      <Card className="overflow-hidden rounded-[calc(1.9rem-1px)] border-0 bg-white/95 shadow-none">
        <CardHeader className="gap-3 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] px-4 pt-4 pb-4 md:px-5 md:pt-5 md:pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-950">{title}</CardTitle>
              {description ? <CardDescription className="text-sm leading-6 text-slate-500">{description}</CardDescription> : null}
            </div>
            {action}
          </div>
        </CardHeader>
        <CardContent className={`px-4 py-4 md:px-5 md:py-5 ${contentClassName}`}>{children}</CardContent>
      </Card>
    </div>
  );
}

function formatFileSize(size?: number | null) {
  if (!size || Number.isNaN(size)) return null;
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function PdfInlineRenderer({ url, title }: PdfInlineRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.floor(element.clientWidth);
      setContainerWidth((prev) => (prev !== nextWidth ? nextWidth : prev));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!url || !containerWidth) return;

    let cancelled = false;
    const abortController = new AbortController();
    const renderPdf = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }

        const pdfBytes = await response.arrayBuffer();
        const loadingTask = getDocument({
          data: pdfBytes,
          disableAutoFetch: true,
          disableStream: true,
          disableRange: true,
        });
        const pdf = await loadingTask.promise;
        const renderedPages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.max(containerWidth / baseViewport.width, 1);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          await page.render({ canvasContext: context, viewport, canvas }).promise;
          renderedPages.push(canvas.toDataURL("image/png"));
        }

        if (!cancelled) setPageImages(renderedPages);
      } catch (error) {
        console.error("Failed to render pdf inline:", error);
        if (!cancelled) {
          setLoadError("PDF를 화면에 표시하지 못했습니다. 원본 문서를 새 창에서 열어 확인해 주세요.");
          setPageImages([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [containerWidth, url]);

  return (
    <div ref={containerRef} className="space-y-4 bg-slate-100/80 p-4 md:p-6">
      {isLoading ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
          PDF를 불러오는 중입니다...
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">{loadError}</div>
      ) : null}

      {!isLoading && !loadError
        ? pageImages.map((pageImage, index) => (
          <figure
            key={`${title}-${index + 1}`}
            className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]"
          >
            <img src={pageImage} alt={`${title} ${index + 1}페이지`} className="block w-full" />
          </figure>
        ))
        : null}
    </div>
  );
}

export function CommunityPostDetailPage({ post }: CommunityPostDetailPageProps) {
  if (!post) return null;

  const imageAssets = post.assets.filter((asset) => asset.assetType === "image");
  const documentAssets = post.assets.filter((asset) => asset.assetType === "document");
  const pdfAssets = documentAssets.filter((asset) => asset.previewKind === "pdf-inline" && asset.previewUrl);
  const otherDocuments = documentAssets.filter((asset) => asset.previewKind !== "pdf-inline");
  const publishedAt = post.publishedAt || post.updatedAt;
  const postTypeLabel = post.postType === "notice" ? "공지" : "게시물";
  const totalAttachmentCount = imageAssets.length + documentAssets.length;
  const metaItems = [
    { icon: CalendarDays, label: "게시일", value: formatDateOnly(publishedAt) },
    { icon: UserRound, label: "작성자", value: post.authorName || "관리자" },
    { icon: Heart, label: "좋아요", value: String(post.likeCount) },
    { icon: MessageCircle, label: "댓글", value: String(post.commentCount) },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="rounded-[2.1rem] bg-[linear-gradient(135deg,rgba(14,165,233,0.22),rgba(59,130,246,0.18),rgba(255,255,255,0.92))] p-[1px] shadow-[0_26px_80px_-48px_rgba(15,23,42,0.5)]">
        <div className="rounded-[calc(2.1rem-1px)] bg-gradient-to-br from-white via-slate-50 to-blue-50 px-4 py-5 md:px-5 md:py-6 lg:px-6 lg:py-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <h2 className="text-3xl leading-tight font-bold tracking-tight text-slate-950 md:text-4xl">{post.title}</h2>
              {post.summary ? (
                <p className="max-w-3xl text-lg leading-8 font-medium text-slate-600">{post.summary}</p>
              ) : null}
            </div>
            <div className="overflow-x-auto pt-1">
              <div className="flex min-w-max items-center gap-3 rounded-full bg-white/85 px-3.5 py-2.5 text-sm text-slate-600 shadow-[0_14px_36px_-26px_rgba(15,23,42,0.35)] backdrop-blur">
                {metaItems.map(({ icon: Icon, label, value }, index) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-800">{value}</span>
                    {index < metaItems.length - 1 ? <span className="ml-1 text-slate-300">•</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="p-2" />

      <DetailSection title="" description={post.content ?? undefined}>
        <></>
      </DetailSection>

      {imageAssets.length > 0 ? (
        <DetailSection
          title="이미지 미리보기"
          description="첨부된 이미지를 같은 카드 규칙으로 정렬했습니다."
          contentClassName="grid gap-4 md:grid-cols-2"
        >
          {imageAssets.map((asset) => (
            <div
              key={asset.id}
              className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-50 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.4)]"
            >
              {asset.previewUrl || asset.thumbnailUrl ? (
                <img
                  src={asset.previewUrl || asset.thumbnailUrl || ""}
                  alt={asset.fileName}
                  className="h-72 w-full object-cover"
                />
              ) : null}
              <div className="space-y-1 border-t border-slate-200/80 bg-white px-4 py-4 md:px-5">
                <p className="font-medium text-slate-900">{asset.fileName}</p>
                {formatFileSize(asset.fileSize) ? (
                  <p className="text-sm text-slate-500">{formatFileSize(asset.fileSize)}</p>
                ) : null}
              </div>
            </div>
          ))}
        </DetailSection>
      ) : null}

      {pdfAssets.length > 0 ? (
        <div className="space-y-4">
          {pdfAssets.map((asset) => (
            <PdfInlineRenderer url={asset.previewUrl || ""} title={asset.fileName} />
          ))}
        </div>
      ) : null}

      {otherDocuments.length > 0 ? (
        <DetailSection
          title="기타 첨부 문서"
          description="PDF 외 문서는 새 창에서 원본 파일로 열 수 있습니다."
          contentClassName="space-y-4"
        >
          {otherDocuments.map((asset) => (
            <div
              key={asset.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 px-5 py-4"
            >
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{asset.fileName}</p>
                <p className="text-sm text-slate-500">
                  {[asset.mimeType || "문서", formatFileSize(asset.fileSize)].filter(Boolean).join(" · ")}
                </p>
              </div>
              {asset.downloadUrl || asset.previewUrl ? (
                <a
                  href={asset.downloadUrl || asset.previewUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  문서 열기
                </a>
              ) : null}
            </div>
          ))}
        </DetailSection>
      ) : null}
    </div>
  );
}
