import { markdownToHtml } from "../app/utils";

interface MarkdownContentProps {
  value?: string | null;
  className?: string;
  compact?: boolean;
}

export function MarkdownContent({ value, className = "", compact = false }: MarkdownContentProps) {
  const html = markdownToHtml(value);
  const densityClassName = compact ? "markdown-content-compact" : "";

  return (
    <div
      className={`markdown-content ${densityClassName} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
