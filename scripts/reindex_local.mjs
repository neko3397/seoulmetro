#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// ===== Colors =====
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const BLUE = '\x1b[0;34m';
const CYAN = '\x1b[0;36m';
const NC = '\x1b[0m';

function logInfo(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function logSuccess(msg) {
  console.log(`${GREEN}[SUCCESS] ${msg}${NC}`);
}

function logWarn(msg) {
  console.log(`${YELLOW}[WARN] ${msg}${NC}`);
}

function logError(msg) {
  console.error(`${RED}[ERROR] ${msg}${NC}`);
}

// Load .env file manually
function loadEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    });
    logInfo('.env file loaded successfully.');
  } else {
    logWarn('.env file not found. Falling back to system environment variables.');
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logError('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

if (!openaiApiKey) {
  logError('OPENAI_API_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ===== RAG Chunking Logic ই식 =====

function normalizeChunkText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitBlockIntoUnits(block, maxLength) {
  const normalizedBlock = normalizeChunkText(block);
  if (!normalizedBlock) return [];
  if (normalizedBlock.length <= maxLength) return [normalizedBlock];

  const lines = normalizedBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const listLikeLines = lines.filter((line) => /^([\-*•]\s+|\d+[.)]\s+)/.test(line));
  if (listLikeLines.length >= 2 && listLikeLines.length === lines.length) {
    const groups = [];
    for (const line of listLikeLines) {
      const current = groups[groups.length - 1] || "";
      const candidate = current ? `${current}\n${line}` : line;
      if (!current) {
        groups.push(line);
        continue;
      }
      if (candidate.length <= maxLength) {
        groups[groups.length - 1] = candidate;
        continue;
      }
      groups.push(line);
    }
    return groups;
  }

  const sentenceUnits = normalizedBlock
    .split(/(?<=[.!?])\s+|\n+/)
    .map((unit) => unit.trim())
    .filter(Boolean);
  if (sentenceUnits.length > 1) {
    const grouped = [];
    let current = "";
    for (const sentence of sentenceUnits) {
      if (!current) {
        current = sentence;
        continue;
      }
      if (`${current} ${sentence}`.length <= maxLength) {
        current = `${current} ${sentence}`;
        continue;
      }
      grouped.push(current);
      current = sentence;
    }
    if (current) grouped.push(current);
    return grouped.flatMap((unit) => {
      if (unit.length <= maxLength) return [unit];
      const slices = [];
      let start = 0;
      while (start < unit.length) {
        const end = Math.min(unit.length, start + maxLength);
        slices.push(unit.slice(start, end).trim());
        if (end >= unit.length) break;
        start = end;
      }
      return slices.filter(Boolean);
    });
  }

  const slices = [];
  let start = 0;
  while (start < normalizedBlock.length) {
    const end = Math.min(normalizedBlock.length, start + maxLength);
    slices.push(normalizedBlock.slice(start, end).trim());
    if (end >= normalizedBlock.length) break;
    start = end;
  }
  return slices.filter(Boolean);
}

function buildSemanticChunks(text, chunkSize, overlap) {
  const normalized = normalizeChunkText(text);
  if (!normalized) return [];

  const safeChunk = Math.max(240, chunkSize || 800);
  if (normalized.length <= safeChunk) {
    return [normalized];
  }
  const safeOverlap = Math.max(0, Math.min(safeChunk - 80, overlap || 120));
  const rawBlocks = normalized
    .split(/\n\s*\n/)
    .map((block) => normalizeChunkText(block))
    .filter(Boolean);
  const units = rawBlocks.flatMap((block) => splitBlockIntoUnits(block, Math.max(160, safeChunk - 80)));
  if (!units.length) return [normalized];

  const chunks = [];
  let cursor = 0;

  while (cursor < units.length) {
    const chunkUnits = [];
    let chunkLength = 0;
    let nextCursor = cursor;

    while (nextCursor < units.length) {
      const unit = units[nextCursor];
      const separatorLength = chunkUnits.length > 0 ? 2 : 0;
      if (chunkUnits.length > 0 && chunkLength + separatorLength + unit.length > safeChunk) break;
      chunkUnits.push(unit);
      chunkLength += separatorLength + unit.length;
      nextCursor += 1;
    }

    if (!chunkUnits.length) {
      chunkUnits.push(units[nextCursor]);
      nextCursor += 1;
    }

    chunks.push(chunkUnits.join("\n\n"));
    if (nextCursor >= units.length) break;

    let overlapLength = 0;
    let overlapCount = 0;
    for (let index = chunkUnits.length - 1; index >= 0; index -= 1) {
      const unitLength = chunkUnits[index].length + (overlapCount > 0 ? 2 : 0);
      if (overlapCount > 0 && overlapLength + unitLength > safeOverlap) break;
      overlapLength += unitLength;
      overlapCount += 1;
    }

    cursor = Math.max(cursor + 1, nextCursor - overlapCount);
  }

  return chunks;
}

function getDocumentTypeLabel(sourceType, postType) {
  if (sourceType === "guide") return "사내규정";
  if (postType === "notice") return "공지";
  if (postType === "document") return "문서 게시물";
  return "공지/문서";
}

function buildSectionAwareChunks(source, settings) {
  const metadata = source.metadata || {};
  const rawSections = Array.isArray(metadata.sections) ? metadata.sections : [];
  const sections = rawSections.length
    ? rawSections
    : [
        {
          id: metadata.sectionId || `${source.id}_section_0`,
          title: metadata.sectionTitle || source.title,
          content: source.content_text,
          order: 0,
        },
      ];

  const chunkRows = [];

  for (const [sectionIndex, section] of sections.entries()) {
    const sectionTitle = String(section?.title || source.title || "본문").trim() || source.title || "본문";
    const sectionContent = String(section?.content || "").trim();
    if (!sectionContent) continue;
    const sectionPath = Array.isArray(section?.pathTitles)
      ? section.pathTitles.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const sectionPathText = sectionPath.length ? sectionPath.join(" > ") : sectionTitle;
    const pieces = buildSemanticChunks(sectionContent, settings.chunk_size, settings.chunk_overlap);
    const formattedPieces = pieces.length ? pieces : [sectionContent];

    const decoratedParentContent = [
      `문서 제목: ${source.title}`,
      metadata.documentTypeLabel ? `문서 유형: ${metadata.documentTypeLabel}` : "",
      sectionPathText ? `섹션 경로: ${sectionPathText}` : "",
      sectionTitle && sectionTitle !== source.title ? `섹션 제목: ${sectionTitle}` : "",
      "",
      sectionContent,
    ]
      .filter(Boolean)
      .join("\n");

    for (const [pieceIndex, piece] of formattedPieces.entries()) {
      const chunkTitle =
        formattedPieces.length > 1 ? `${sectionTitle} (${pieceIndex + 1}/${formattedPieces.length})` : sectionTitle;
      const decoratedContent = [
        `문서 제목: ${source.title}`,
        metadata.documentTypeLabel ? `문서 유형: ${metadata.documentTypeLabel}` : "",
        sectionPathText ? `섹션 경로: ${sectionPathText}` : "",
        sectionTitle && sectionTitle !== source.title ? `섹션 제목: ${sectionTitle}` : "",
        "",
        piece,
      ]
        .filter(Boolean)
        .join("\n");

      chunkRows.push({
        content: decoratedContent,
        parentContent: decoratedParentContent,
        metadata: {
          ...metadata,
          documentTitle: source.title,
          sectionTitle,
          sectionPath,
          sectionPathText,
          sectionId: String(section?.id || `${source.id}_section_${sectionIndex}`),
          sectionParentId: section?.parentId ? String(section.parentId) : null,
          sectionSlug: section?.slug ? String(section.slug) : null,
          sectionOrder: Number(section?.order ?? sectionIndex),
          sectionDepth: Number(section?.depth ?? 0),
          chunkTitle,
          chunkOrder: pieceIndex,
          sectionChunkCount: formattedPieces.length,
        },
      });
    }
  }

  return chunkRows;
}

// ===== OpenAI Embeddings Helper =====

async function generateEmbedding(input, settings) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: settings.embedding_model || "text-embedding-3-small",
      input,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Embedding request failed: ${message}`);
  }
  const payload = await response.json();
  if (Array.isArray(input)) {
    return payload.data?.map((item) => item.embedding) ?? [];
  }
  return payload.data?.[0]?.embedding ?? null;
}

function parseEmbeddingValue(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      const cleaned = val.trim();
      if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
        return cleaned.slice(1, -1).split(",").map(Number);
      }
    }
  }
  return null;
}

// ===== Main Reindexing Pipeline =====

async function getChatSettings() {
  const { data, error } = await supabase
    .from("chat_settings")
    .select("*")
    .eq("id", "default")
    .single();
  if (error || !data) {
    return {
      provider: "openai",
      model: "gpt-5.4",
      embedding_model: "text-embedding-3-small",
      chunk_size: 800,
      chunk_overlap: 120,
    };
  }
  return data;
}

async function buildDocumentSources() {
  const { data: guides, error: guideError } = await supabase
    .from("guides")
    .select("id, title, description, is_published, category_id");
  if (guideError) throw guideError;

  const { data: sections, error: sectionError } = await supabase
    .from("guide_sections")
    .select("id, guide_id, parent_id, title, markdown_content, slug, sort_order, depth");
  if (sectionError) throw sectionError;

  const { data: posts, error: postError } = await supabase
    .from("community_posts")
    .select("id, title, summary, content, is_published, approval_status, post_type");
  if (postError) throw postError;

  const byGuide = new Map();
  for (const section of sections || []) {
    if (!byGuide.has(section.guide_id)) byGuide.set(section.guide_id, []);
    byGuide.get(section.guide_id).push(section);
  }

  const sources = [];
  for (const guide of (guides || []).filter((guide) => guide.is_published)) {
    const guideSections = (byGuide.get(guide.id) || []).sort((a, b) => a.sort_order - b.sort_order);
    const sectionMap = new Map(guideSections.map((section) => [section.id, section]));
    const sectionPathCache = new Map();
    const getSectionPathTitles = (section) => {
      if (!section?.id) return [String(section?.title || guide.title || "본문").trim()].filter(Boolean);
      if (sectionPathCache.has(section.id)) return sectionPathCache.get(section.id) || [];

      const pathTitles = [];
      const seenIds = new Set();
      let current = section;
      while (current?.id && !seenIds.has(current.id)) {
        seenIds.add(current.id);
        const title = String(current.title || "").trim();
        if (title) pathTitles.unshift(title);
        current = current.parent_id ? sectionMap.get(current.parent_id) : null;
      }

      const normalizedPath = pathTitles.length ? pathTitles : [String(section?.title || guide.title || "본문").trim()].filter(Boolean);
      sectionPathCache.set(section.id, normalizedPath);
      return normalizedPath;
    };
    const content = [
      guide.title,
      guide.description || "",
      ...guideSections.map((section) => `${section.title}\n${section.markdown_content}`),
    ].join("\n\n");
    sources.push({
      id: `guide_${guide.id}`,
      source_type: "guide",
      source_ref: guide.id,
      title: guide.title,
      content_text: content,
      metadata: {
        title: guide.title,
        categoryId: guide.category_id,
        sourceType: "guide",
        targetType: "guide",
        targetId: guide.id,
        guideId: guide.id,
        documentType: "guide",
        documentTypeLabel: getDocumentTypeLabel("guide"),
        description: guide.description || "",
        scope: "guides",
        isPublished: true,
        sectionIds: guideSections.map((section) => section.id),
        sections: guideSections.map((section, index) => ({
          id: section.id,
          parentId: section.parent_id,
          slug: section.slug,
          title: section.title,
          content: section.markdown_content,
          order: index,
          depth: Number(section.depth || 0),
          pathTitles: getSectionPathTitles(section),
        })),
      },
    });
  }

  for (const post of (posts || []).filter(
    (post) =>
      post.is_published &&
      post.approval_status === "published" &&
      ["notice", "document"].includes(String(post.post_type || "")),
  )) {
    const content = [
      post.title,
      post.summary || "",
      post.content || "",
    ].join("\n\n");
    sources.push({
      id: `community_${post.id}`,
      source_type: "community_post",
      source_ref: post.id,
      title: post.title,
      content_text: content,
      metadata: {
        title: post.title,
        categoryId: post.post_type || "notice",
        sourceType: "community_post",
        targetType: "post",
        targetId: post.id,
        postId: post.id,
        postType: post.post_type,
        documentType: post.post_type || "notice",
        documentTypeLabel: getDocumentTypeLabel("community_post", post.post_type),
        scope: "notices",
        isPublished: true,
        sections: [
          {
            id: `${post.id}_summary`,
            title: "요약",
            content: post.summary || "",
            order: 0,
            depth: 0,
            pathTitles: ["요약"],
          },
          {
            id: `${post.id}_content`,
            title: "본문",
            content: post.content || "",
            order: 1,
            depth: 0,
            pathTitles: ["본문"],
          },
        ].filter((section) => String(section.content || "").trim()),
      },
    });
  }

  return sources;
}

// Helper to encrypt content hash using crypto (SHA-256)
async function calculateHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function runLocalReindex() {
  logInfo("Starting local RAG Reindexing pipeline...");

  const settings = await getChatSettings();
  logInfo(`Fetched settings: chunk_size=${settings.chunk_size}, chunk_overlap=${settings.chunk_overlap}, embedding_model=${settings.embedding_model}`);
  
  const sources = await buildDocumentSources();
  logInfo(`Fetched document sources from database: count=${sources.length}`);

  const now = new Date().toISOString();

  // 1. Fetch existing document sources to determine what changed
  logInfo("Fetching existing document sources from database...");
  const { data: existingSources, error: selectSourcesError } = await supabase
    .from("document_sources")
    .select("id, content_hash, metadata");
  
  if (selectSourcesError) {
    logError(`Error fetching existing sources: ${JSON.stringify(selectSourcesError)}`);
    process.exit(1);
  }
  logInfo(`Successfully fetched existing sources: count=${existingSources.length}`);

  // Fetch chunk counts per source to detect corrupted/empty sources
  const chunkCountMap = new Map();
  logInfo("Fetching chunk counts from database...");
  const countsPromises = existingSources.map(async (src) => {
    const { count, error } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true })
      .eq("source_id", src.id);
    if (!error && count !== null) {
      chunkCountMap.set(src.id, count);
    } else if (error) {
      logError(`Error fetching chunk count for source ${src.id}: ${JSON.stringify(error)}`);
    }
  });
  await Promise.all(countsPromises);
  logInfo(`Successfully fetched chunk counts for ${chunkCountMap.size} sources.`);

  const existingSourcesMap = new Map(existingSources.map(s => [s.id, s]));

  // 2. Classify sources
  const force = process.argv.includes('--force') || process.argv.includes('-f');
  if (force) {
    logInfo("Force flag (-f/--force) detected. Reindexing all documents.");
  }

  const currentModel = settings.embedding_model || "text-embedding-3-small";
  const currentChunkSize = Number(settings.chunk_size || 800);
  const currentChunkOverlap = Number(settings.chunk_overlap || 120);

  const sourcesToProcess = [];
  const activeSourceIds = new Set();

  for (const source of sources) {
    activeSourceIds.add(source.id);

    const contentHash = await calculateHash(source.content_text);

    const existing = existingSourcesMap.get(source.id);
    const existingChunkCount = chunkCountMap.get(source.id) || 0;
    const isUnmodified =
      !force &&
      existing &&
      existingChunkCount > 0 &&
      existing.content_hash === contentHash &&
      existing.metadata?.chunk_size === currentChunkSize &&
      existing.metadata?.chunk_overlap === currentChunkOverlap &&
      existing.metadata?.embedding_model === currentModel;

    if (isUnmodified) {
      continue;
    }

    sourcesToProcess.push({
      source,
      contentHash,
    });
  }

  // Determine deleted sources
  const deletedSourceIds = [];
  for (const src of existingSources) {
    if (!activeSourceIds.has(src.id)) {
      deletedSourceIds.push(src.id);
    }
  }

  logInfo(`Sources classified: totalToProcess=${sourcesToProcess.length}, totalDeleted=${deletedSourceIds.length}`);

  // Delete removed sources
  if (deletedSourceIds.length > 0) {
    for (const deletedId of deletedSourceIds) {
      logInfo(`Deleting removed source: id=${deletedId}`);
      await supabase.from("document_sources").delete().eq("id", deletedId);
    }
    logSuccess(`Deleted removed sources from database.`);
  }

  if (sourcesToProcess.length === 0) {
    logSuccess("All documents are up-to-date. Nothing to index!");
    return;
  }

  // 3. Process all dirty sources sequentially
  for (let idx = 0; idx < sourcesToProcess.length; idx++) {
    const { source, contentHash } = sourcesToProcess[idx];
    logInfo(`[${idx + 1}/${sourcesToProcess.length}] Processing source: id=${source.id}, title="${source.title}"...`);

    // Fetch existing chunks to build local cache
    const embeddingCache = new Map();
    const existingChunksCountForSource = chunkCountMap.get(source.id) || 0;
    if (existingChunksCountForSource > 0) {
      try {
        logInfo(`Fetching existing chunks for source ${source.id} from database to build embedding cache...`);
        const { data: existingChunks, error: chunkError } = await supabase
          .from("document_chunks")
          .select("content, embedding, metadata")
          .eq("source_id", source.id)
          .not("embedding", "is", null);
        if (!chunkError && existingChunks) {
          let cachedCount = 0;
          for (const row of existingChunks) {
            if (row.content && row.embedding) {
              const oldModel = row.metadata?.embedding_model || "text-embedding-3-small";
              if (oldModel === currentModel) {
                const parsed = parseEmbeddingValue(row.embedding);
                if (parsed) {
                  embeddingCache.set(row.content, parsed);
                  cachedCount++;
                }
              }
            }
          }
          logInfo(`Built embedding cache: cachedCount=${cachedCount}`);
        }
      } catch (err) {
        logError(`Failed to build embedding cache: ${err.message || err}`);
      }
    }

    // Upsert source record
    const sourceRow = {
      ...source,
      is_indexed: true,
      content_hash: contentHash,
      last_indexed_at: now,
      created_at: now,
      updated_at: now,
      metadata: {
        ...source.metadata,
        chunk_size: currentChunkSize,
        chunk_overlap: currentChunkOverlap,
        embedding_model: currentModel,
      },
    };
    const { error: sourceError } = await supabase.from("document_sources").upsert(sourceRow);
    if (sourceError) {
      logError(`Error upserting source ${source.id}: ${JSON.stringify(sourceError)}`);
      throw sourceError;
    }

    // Delete existing chunks for this source
    logInfo(`Deleting existing chunks for source: id=${source.id}`);
    const { error: delChunksError } = await supabase.from("document_chunks").delete().eq("source_id", source.id);
    if (delChunksError) {
      logError(`Error deleting chunks for ${source.id}: ${JSON.stringify(delChunksError)}`);
    }

    // Chunk the text
    logInfo(`Chunking content...`);
    const chunks = buildSectionAwareChunks(source, settings);
    logInfo(`Generated chunks count: ${chunks.length}`);

    let cacheHitCount = 0;
    const batchSize = 50;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const chunkBatch = chunks.slice(i, i + batchSize);
      const chunkRowsToInsert = [];
      const chunksToEmbedInBatch = [];

      for (let j = 0; j < chunkBatch.length; j += 1) {
        const globalIndex = i + j;
        const chunk = chunkBatch[j];
        const content = chunk.content;
        const cachedEmbedding = embeddingCache.get(content) || null;
        if (cachedEmbedding) {
          cacheHitCount++;
        }

        const row = {
          id: `${source.id}_chunk_${globalIndex}`,
          source_id: source.id,
          chunk_index: globalIndex,
          content: content,
          parent_content: chunk.parentContent,
          embedding: cachedEmbedding,
          metadata: {
            ...chunk.metadata,
            embedding_model: currentModel,
          },
          created_at: now,
          updated_at: now,
        };

        chunkRowsToInsert.push(row);
        if (!row.embedding) {
          chunksToEmbedInBatch.push(row);
        }
      }

      // Generate missing embeddings
      if (chunksToEmbedInBatch.length > 0) {
        const batchContents = chunksToEmbedInBatch.map(c => String(c.content || "").trim()).map(c => c || "본문");
        logInfo(`Requesting embeddings for batch [index ${i} to ${i + chunkBatch.length}]: count=${chunksToEmbedInBatch.length}...`);
        try {
          const embeddings = await generateEmbedding(batchContents, settings);
          if (embeddings && Array.isArray(embeddings)) {
            logInfo(`Received embeddings: count=${embeddings.length}`);
            for (let k = 0; k < chunksToEmbedInBatch.length; k += 1) {
              chunksToEmbedInBatch[k].embedding = embeddings[k] ?? null;
            }
          }
        } catch (openaiErr) {
          logError(`Error generating embedding batch: ${openaiErr.message || openaiErr}`);
          throw openaiErr;
        }
      }

      // Insert this batch immediately in smaller slices to prevent database timeouts
      if (chunkRowsToInsert.length > 0) {
        const dbBatchSize = 10;
        for (let k = 0; k < chunkRowsToInsert.length; k += dbBatchSize) {
          const subBatch = chunkRowsToInsert.slice(k, k + dbBatchSize);
          logInfo(`Inserting chunks batch [index ${i + k} to ${i + k + subBatch.length}]: count=${subBatch.length}...`);
          const { error: chunkError } = await supabase.from("document_chunks").insert(subBatch);
          if (chunkError) {
            logError(`Error inserting chunks batch: ${JSON.stringify(chunkError)}`);
            throw chunkError;
          }
        }
      }
    }

    logSuccess(`Source index complete: "${source.title}" (Total chunks: ${chunks.length}, Cache hits: ${cacheHitCount})`);
  }

  logSuccess("Local RAG Reindexing pipeline completed successfully!");
}

runLocalReindex().catch(err => {
  logError(`Pipeline failed: ${err.message || err}`);
  process.exit(1);
});
