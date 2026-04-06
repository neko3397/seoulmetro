#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const APPENDIX_TITLE_LINE =
  /^(?:\s*)(?:\[|〔)?\s*(별(?:표|지)\s*(?:제\s*)?\d+[^\n\]]*(?:\]|\〕)?(?:\s*\[[^\]]+\])?)\s*$/m;
const APPENDIX_INLINE =
  /(?:\[|〔)?\s*별(?:표|지)\s*(?:제\s*)?\d+/;
const PAGE_NUMBER_LINE = /^\s*-\s*\d+\s*-\s*$/;
const BLANK_LINE = /^\s*$/;
const HEADING_LINE = /^(제\d+장|제\d+절|제\d+조(?:\([^)]+\))?)/;
const LIST_LINE = /^(-|\*|\d+\.)\s+/;
const SUB_ITEM_LINE = /^[가-힣A-Za-z]\./;
const TABLEISH_LINE = /^[가-힣A-Za-z0-9()（）\[\]〔〕\/\s·,:;'"-]{1,30}$/;

function parseArgs(argv) {
  const options = {
    scale: 2,
    outputDir: null,
    outputName: null,
    appendixStartPage: null,
    appendixPages: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') {
      options.input = argv[index + 1];
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = argv[index + 1];
      index += 1;
    } else if (arg === '--output-name') {
      options.outputName = argv[index + 1];
      index += 1;
    } else if (arg === '--scale') {
      options.scale = Number(argv[index + 1] || '2');
      index += 1;
    } else if (arg === '--appendix-start-page') {
      options.appendixStartPage = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--appendix-pages') {
      options.appendixPages = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!options.input) {
    throw new Error('--input is required');
  }

  if (!Number.isFinite(options.scale) || options.scale <= 0) {
    throw new Error('--scale must be a positive number');
  }

  if (
    options.appendixStartPage != null &&
    (!Number.isInteger(options.appendixStartPage) || options.appendixStartPage < 1)
  ) {
    throw new Error('--appendix-start-page must be a positive integer');
  }

  return options;
}

function printUsage() {
  console.log(`usage:
  node scripts/convert-pdf-to-md.mjs --input /path/to/file.pdf [--output-dir ./out] [--output-name file.md] [--scale 2] [--appendix-start-page 87] [--appendix-pages 87-100]

output structure:
  <output-dir>/
    <output-name>.md
    assets/appendices/page-XXX.png
    manifest.json`);
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function sanitizeStem(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[\/\\]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._()-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'converted';
}

function runSwift(args) {
  const stdout = execFileSync(
    'osascript',
    ['-l', 'JavaScript', path.resolve('scripts/pdf_tool.jxa'), ...args],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  return stdout;
}

function flattenOutline(items, bucket = []) {
  for (const item of items || []) {
    bucket.push(item);
    flattenOutline(item.children, bucket);
  }
  return bucket;
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trimEnd();
}

function firstAppendixTitle(text) {
  const match = normalizeText(text).match(APPENDIX_TITLE_LINE);
  return match ? match[1].trim() : null;
}

function pageLooksLikeAppendix(page, outlineTitles) {
  if (firstAppendixTitle(page.text)) {
    return true;
  }

  const outlineTitle = outlineTitles.get(page.index);
  if (outlineTitle && APPENDIX_INLINE.test(outlineTitle)) {
    return true;
  }

  return false;
}

function buildAppendixEntries(pages, outlineTitles) {
  const appendixStarts = [];

  for (const page of pages) {
    if (!pageLooksLikeAppendix(page, outlineTitles)) {
      continue;
    }

    const title = firstAppendixTitle(page.text) || outlineTitles.get(page.index) || `부록 ${page.index}`;
    appendixStarts.push({ pageIndex: page.index, title });
  }

  const uniqueStarts = [];
  const seenPages = new Set();
  for (const entry of appendixStarts.sort((a, b) => a.pageIndex - b.pageIndex)) {
    if (seenPages.has(entry.pageIndex)) {
      continue;
    }
    uniqueStarts.push(entry);
    seenPages.add(entry.pageIndex);
  }

  const entries = [];
  for (let index = 0; index < uniqueStarts.length; index += 1) {
    const start = uniqueStarts[index];
    const next = uniqueStarts[index + 1];
    const endPage = next ? next.pageIndex - 1 : pages.at(-1)?.index ?? start.pageIndex;
    const pageIndexes = [];
    for (let pageIndex = start.pageIndex; pageIndex <= endPage; pageIndex += 1) {
      pageIndexes.push(pageIndex);
    }
    entries.push({
      title: start.title,
      startPage: start.pageIndex,
      endPage,
      pageIndexes,
    });
  }

  return entries;
}

function buildManualAppendixEntries(pages, pageIndexes, outlineTitles) {
  const normalized = [...new Set(pageIndexes)].sort((a, b) => a - b);
  const entries = [];
  let current = null;

  for (const pageIndex of normalized) {
    const page = pages.find((candidate) => candidate.index === pageIndex);
    const title = page ? firstAppendixTitle(page.text) : null;
    const outlineTitle = outlineTitles.get(pageIndex);
    const resolvedTitle = title || (outlineTitle && APPENDIX_INLINE.test(outlineTitle) ? outlineTitle : null);

    if (!current || resolvedTitle) {
      if (current) {
        entries.push(current);
      }
      current = {
        title: resolvedTitle || `별표/별지 ${pageIndex}`,
        startPage: pageIndex,
        endPage: pageIndex,
        pageIndexes: [pageIndex],
      };
      continue;
    }

    current.endPage = pageIndex;
    current.pageIndexes.push(pageIndex);
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

function isStandaloneLine(line) {
  return (
    BLANK_LINE.test(line) ||
    HEADING_LINE.test(line) ||
    LIST_LINE.test(line) ||
    SUB_ITEM_LINE.test(line) ||
    PAGE_NUMBER_LINE.test(line)
  );
}

function shouldInsertBlankLine(prev, next) {
  if (!prev || !next) {
    return false;
  }

  if (/[.:;!?)]$/.test(prev)) {
    return false;
  }

  if (TABLEISH_LINE.test(prev) && TABLEISH_LINE.test(next)) {
    return true;
  }

  return false;
}

function cleanPageText(text) {
  const lines = normalizeText(text)
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .filter((line) => !PAGE_NUMBER_LINE.test(line));

  const output = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    output.push(paragraph.join(' '));
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') {
      flushParagraph();
      if (output.at(-1) !== '') {
        output.push('');
      }
      continue;
    }

    if (isStandaloneLine(line)) {
      flushParagraph();
      output.push(line);
      continue;
    }

    if (paragraph.length > 0 && shouldInsertBlankLine(paragraph.at(-1), line)) {
      flushParagraph();
    }

    paragraph.push(line);
  }

  flushParagraph();

  while (output[0] === '') {
    output.shift();
  }
  while (output.at(-1) === '') {
    output.pop();
  }

  return output.join('\n');
}

function buildBodyMarkdown(pages, appendixStartPage) {
  const bodyPages = pages.filter((page) => appendixStartPage == null || page.index < appendixStartPage);
  const parts = [];

  for (const page of bodyPages) {
    const cleaned = cleanPageText(page.text);
    if (!cleaned) {
      continue;
    }
    parts.push(cleaned);
  }

  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function renderAppendixPages(inputPath, assetsDir, pageIndexes, scale) {
  if (pageIndexes.length === 0) {
    return [];
  }

  const pageSpec = compressPageIndexes(pageIndexes);
  const output = runSwift(['render', inputPath, assetsDir, pageSpec, String(scale)]);
  return JSON.parse(output);
}

function compressPageIndexes(pageIndexes) {
  if (pageIndexes.length === 0) {
    return '';
  }

  const ranges = [];
  let rangeStart = pageIndexes[0];
  let previous = pageIndexes[0];

  for (let index = 1; index < pageIndexes.length; index += 1) {
    const current = pageIndexes[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`);
    rangeStart = current;
    previous = current;
  }

  ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`);
  return ranges.join(',');
}

function parsePageSpec(pageSpec) {
  const pages = new Set();

  for (const rawSegment of String(pageSpec || '').split(',')) {
    const segment = rawSegment.trim();
    if (!segment) {
      continue;
    }

    if (segment.includes('-')) {
      const [rawStart, rawEnd] = segment.split('-').map((value) => value.trim());
      const start = Number(rawStart);
      const end = Number(rawEnd);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
        throw new Error(`invalid appendix page range: ${segment}`);
      }
      for (let pageIndex = start; pageIndex <= end; pageIndex += 1) {
        pages.add(pageIndex);
      }
      continue;
    }

    const pageIndex = Number(segment);
    if (!Number.isInteger(pageIndex) || pageIndex < 1) {
      throw new Error(`invalid appendix page: ${segment}`);
    }
    pages.add(pageIndex);
  }

  return [...pages].sort((a, b) => a - b);
}

function buildAppendixMarkdown(entries, renderedFiles, markdownDir) {
  if (entries.length === 0) {
    return '';
  }

  const renderedMap = new Map(renderedFiles.map((item) => [item.pageIndex, item.outputPath]));
  const parts = ['## 별표/별지'];

  for (const entry of entries) {
    parts.push(`### ${entry.title}`);
    for (const pageIndex of entry.pageIndexes) {
      const outputPath = renderedMap.get(pageIndex);
      if (!outputPath) {
        continue;
      }
      const relativePath = path.relative(markdownDir, outputPath).split(path.sep).join('/');
      parts.push(`![${entry.title} ${pageIndex}페이지](./${relativePath})`);
    }
    parts.push('');
  }

  return parts.join('\n').trim();
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.input);
  const stem = sanitizeStem(path.basename(inputPath));
  const outputDir = path.resolve(options.outputDir || path.join('docs', 'generated', stem));
  const outputFilename = options.outputName || `${stem}.md`;
  const markdownPath = path.join(outputDir, outputFilename);
  const assetsDir = path.join(outputDir, 'assets', 'appendices');
  const manifestPath = path.join(outputDir, 'manifest.json');

  ensureDirectory(outputDir);
  ensureDirectory(assetsDir);

  const analysis = JSON.parse(runSwift(['analyze', inputPath]));
  const outlineTitles = new Map(
    flattenOutline(analysis.outline)
      .filter((item) => item.pageIndex && item.title)
      .map((item) => [item.pageIndex, item.title.trim()]),
  );

  let appendixEntries = buildAppendixEntries(analysis.pages, outlineTitles);
  let detectionMode = 'auto';

  if (options.appendixPages) {
    appendixEntries = buildManualAppendixEntries(
      analysis.pages,
      parsePageSpec(options.appendixPages),
      outlineTitles,
    );
    detectionMode = 'manual-pages';
  } else if (options.appendixStartPage != null) {
    const manualPageIndexes = analysis.pages
      .filter((page) => page.index >= options.appendixStartPage)
      .map((page) => page.index);
    appendixEntries = buildManualAppendixEntries(analysis.pages, manualPageIndexes, outlineTitles);
    detectionMode = 'manual-start-page';
  }

  const appendixStartPage = appendixEntries[0]?.startPage ?? null;
  const bodyMarkdown = buildBodyMarkdown(analysis.pages, appendixStartPage);
  const appendixPageIndexes = appendixEntries.flatMap((entry) => entry.pageIndexes);
  const renderedFiles = renderAppendixPages(inputPath, assetsDir, appendixPageIndexes, options.scale);
  const appendixMarkdown = buildAppendixMarkdown(appendixEntries, renderedFiles, outputDir);

  const header = `# ${path.basename(inputPath, path.extname(inputPath))}`;
  const markdown = [header, bodyMarkdown, appendixMarkdown].filter(Boolean).join('\n\n').trim() + '\n';
  fs.writeFileSync(markdownPath, markdown, 'utf8');

  const manifest = {
    sourcePdf: inputPath,
    markdownPath,
    assetsDir,
    pageCount: analysis.pageCount,
    appendixEntries,
    renderedFiles,
    detectionMode,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({ markdownPath, manifestPath, appendixCount: appendixEntries.length }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
