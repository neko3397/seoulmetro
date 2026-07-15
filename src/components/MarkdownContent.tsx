import { ChatSource } from "../types/content";
import { markdownToHtml, highlightHtml, extractHighlightText } from "../app/utils";

interface MarkdownContentProps {
  value?: string | null;
  className?: string;
  compact?: boolean;
  highlightSource?: ChatSource | null;
}

export function MarkdownContent({ value, className = "", compact = false, highlightSource }: MarkdownContentProps) {
  let html = markdownToHtml(value);
  const densityClassName = compact ? "markdown-content-compact" : "";

  if (highlightSource && highlightSource.snippet) {
    const highlightText = extractHighlightText(highlightSource.snippet);
    html = highlightHtml(html, highlightText);
  }

  return (
    <div
      className={`markdown-content ${densityClassName} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
