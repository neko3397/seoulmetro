export interface ParsedGuideSection {
  title: string;
  slug: string;
  depth: number;
  sortOrder: number;
  markdownContent: string;
  parentOrder: number | null;
}

export interface ParsedGuideDocument {
  title: string;
  description: string;
  sections: ParsedGuideSection[];
}

interface ParseGuideMarkdownOptions {
  fallbackTitle?: string;
}

interface WorkingSection {
  level: number;
  title: string;
  markdownContent: string;
}

const TOC_TITLE = "목차";

export function normalizeGuideMarkdown(markdown: string) {
  return String(markdown || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
}

function slugify(value: string, fallback: string) {
  return (
    String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || fallback
  );
}

function trimBlankLines(value: string) {
  return value.replace(/^\s*\n+/, "").replace(/\n+\s*$/, "").trim();
}

function normalizeHeadingTitle(value: string) {
  return String(value || "")
    .replace(/\s+#+$/, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractDescription(lines: string[]) {
  const text = trimBlankLines(lines.join("\n"));
  if (!text) return "";

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    if (/^(#|>|\- |\* |\d+\. )/.test(paragraph)) continue;
    return paragraph;
  }

  return "";
}

function makeUniqueSlug(title: string, index: number, usedSlugs: Map<string, number>) {
  const baseSlug = slugify(title, `section-${index + 1}`);
  const seenCount = usedSlugs.get(baseSlug) || 0;
  usedSlugs.set(baseSlug, seenCount + 1);
  return seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`;
}

export function parseGuideMarkdown(markdown: string, options: ParseGuideMarkdownOptions = {}): ParsedGuideDocument {
  const normalized = normalizeGuideMarkdown(markdown);
  const lines = normalized.split("\n");
  const fallbackTitle = String(options.fallbackTitle || "").trim() || "가이드북";

  let guideTitle = fallbackTitle;
  let sawTitle = false;
  let isSkippingToc = false;
  let currentSection: { title: string; level: number; contentLines: string[] } | null = null;
  const preambleLines: string[] = [];
  const workingSections: WorkingSection[] = [];

  const pushCurrentSection = () => {
    if (!currentSection) return;
    workingSections.push({
      level: currentSection.level,
      title: currentSection.title,
      markdownContent: trimBlankLines(currentSection.contentLines.join("\n")),
    });
    currentSection = null;
  };

  for (const rawLine of lines) {
    const anchorOnly = rawLine.trim().match(/^<a\s+id="[^"]+"\s*><\/a>$/i);
    if (anchorOnly) continue;

    const headingMatch = rawLine.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = normalizeHeadingTitle(headingMatch[2]);

      if (level === 1 && title && !sawTitle) {
        guideTitle = title;
        sawTitle = true;
        continue;
      }

      if (title === TOC_TITLE) {
        pushCurrentSection();
        isSkippingToc = true;
        continue;
      }

      isSkippingToc = false;

      if (level >= 2) {
        pushCurrentSection();
        currentSection = { title, level, contentLines: [] };
        continue;
      }
    }

    if (isSkippingToc) continue;

    if (currentSection) {
      currentSection.contentLines.push(rawLine);
    } else {
      preambleLines.push(rawLine);
    }
  }

  pushCurrentSection();

  const preambleContent = trimBlankLines(preambleLines.join("\n"));

  if (preambleContent) {
    workingSections.unshift({
      level: 2,
      title: workingSections.length > 0 ? "개요" : "본문",
      markdownContent: preambleContent,
    });
  }

  if (workingSections.length === 0) {
    workingSections.push({
      level: 2,
      title: "본문",
      markdownContent: "",
    });
  }

  const baseLevel = workingSections.reduce((min, section) => Math.min(min, section.level), Number.POSITIVE_INFINITY);
  const levelStack: Array<{ level: number; order: number }> = [];
  const usedSlugs = new Map<string, number>();

  const sections = workingSections.map((section, index) => {
    while (levelStack.length > 0 && levelStack[levelStack.length - 1].level >= section.level) {
      levelStack.pop();
    }

    const depth = Math.max(0, section.level - (Number.isFinite(baseLevel) ? baseLevel : 2));
    const parentOrder = levelStack.length > 0 ? levelStack[levelStack.length - 1].order : null;

    const parsedSection: ParsedGuideSection = {
      title: section.title || `섹션 ${index + 1}`,
      slug: makeUniqueSlug(section.title, index, usedSlugs),
      depth,
      sortOrder: index,
      markdownContent: section.markdownContent,
      parentOrder,
    };

    levelStack.push({ level: section.level, order: index });
    return parsedSection;
  });

  return {
    title: guideTitle,
    description: extractDescription(preambleLines),
    sections,
  };
}

export function buildGuideMarkdown(
  guideTitle: string,
  description: string | null | undefined,
  sections: Array<{ title: string; depth?: number | null; sortOrder?: number | null; markdownContent?: string | null }>,
) {
  const orderedSections = [...(sections || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  const blocks = orderedSections.map((section) => {
    const depth = Math.max(0, Number(section.depth || 0));
    const headingLevel = Math.min(depth + 2, 6);
    const heading = `${"#".repeat(headingLevel)} ${String(section.title || "섹션").trim()}`;
    const content = trimBlankLines(String(section.markdownContent || ""));
    return content ? `${heading}\n\n${content}` : heading;
  });

  return [
    `# ${String(guideTitle || "가이드북").trim()}`,
    trimBlankLines(String(description || "")),
    ...blocks,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
