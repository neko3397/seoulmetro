// @ts-nocheck
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { bearerAuth } from "npm:hono/bearer-auth";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

app.use("*", cors());
app.use("*", logger(console.log));
app.use(
  "*",
  bearerAuth({
    verifyToken: async (token) => {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      return Boolean(token && anonKey && token === anonKey);
    },
  }),
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const VIDEO_BUCKET = "make-a8898ff1-videos";
const IMAGE_BUCKET = "make-a8898ff1-images";
const NOW = () => new Date().toISOString();

const defaultCategories = [
  {
    id: "fire",
    title: "화재발생 시 대응요령",
    subtitle: "객실 화재 발생 시 승무원 행동요령",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop",
    description: "지하철 화재 발생 시 대응 방법을 학습합니다.",
  },
  {
    id: "safety",
    title: "지하철 안전운행",
    subtitle: "안전한 지하철 운행을 위한 기본 수칙",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop",
    description: "지하철 운행 안전 수칙과 주의사항을 학습합니다.",
  },
  {
    id: "emergency",
    title: "응급상황 대응",
    subtitle: "응급상황 발생 시 신속한 대응 방법",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop",
    description: "응급상황 발생 시 대응 방법을 학습합니다.",
  },
];

const defaultVideos = [
  {
    id: "fire_1",
    category_id: "fire",
    title: "지하철 화재 발생 시 초기 대응",
    description:
      "지하철에서 화재가 발생했을 때 승무원이 취해야 할 초기 대응 방법에 대해 학습합니다.",
    youtube_id: "dQw4w9WgXcQ",
    video_type: "youtube",
    duration: "5:30",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  },
  {
    id: "fire_2",
    category_id: "fire",
    title: "승객 대피 유도 방법",
    description: "화재 발생 시 승객을 안전하게 대피시키는 방법과 유의사항을 학습합니다.",
    youtube_id: "dQw4w9WgXcQ",
    video_type: "youtube",
    duration: "7:15",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  },
  {
    id: "fire_3",
    category_id: "fire",
    title: "화재 진압 장비 사용법",
    description: "지하철 내 화재 진압 장비의 올바른 사용 방법을 학습합니다.",
    video_url: "/demo-video.mp4",
    video_type: "local",
    duration: "6:45",
    thumbnail: "https://via.placeholder.com/480x270/ff6b6b/ffffff?text=Local+Video",
  },
  {
    id: "safety_1",
    category_id: "safety",
    title: "지하철 안전운행 기본 수칙",
    description: "지하철을 안전하게 운행하기 위한 기본적인 수칙과 절차를 학습합니다.",
    youtube_id: "dQw4w9WgXcQ",
    video_type: "youtube",
    duration: "8:20",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  },
];

const defaultGuide = {
  id: "guide_onboarding",
  title: "신입사원 기본 가이드",
  description: "신입사원이 알아야 할 운영 규정과 업무 흐름입니다.",
  slug: "new-hire-onboarding",
  is_published: true,
  version: 1,
};

const defaultGuideSections = [
  {
    id: "guide_onboarding_intro",
    guide_id: "guide_onboarding",
    parent_id: null,
    title: "개요",
    slug: "overview",
    markdown_content: "# 개요\n\n이 문서는 신입사원 온보딩을 위한 기본 가이드입니다.",
    sort_order: 0,
    depth: 0,
  },
  {
    id: "guide_onboarding_safety",
    guide_id: "guide_onboarding",
    parent_id: null,
    title: "안전 수칙",
    slug: "safety-rules",
    markdown_content: "## 안전 수칙\n\n- 출근 전 장비 상태 확인\n- 비상 연락망 숙지",
    sort_order: 1,
    depth: 0,
  },
];

const defaultCommunityPost = {
  id: "post_welcome",
  title: "커뮤니티 기능 안내",
  summary: "관리자는 문서를 올리고, 사용자는 댓글과 좋아요를 남길 수 있습니다.",
  content: "새로운 커뮤니티 공간입니다. 교육 자료와 공지사항을 이곳에 등록하세요.",
  post_type: "notice",
  is_published: true,
  author_employee_id: "ADMIN001",
  author_name: "시스템 관리자",
};

function canonicalizeEmployeeId(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

function canonicalizeEmployeeName(value: string) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || `item-${Date.now()}`;
}

function chunkText(text: string, chunkSize: number, overlap: number) {
  const normalized = String(text || "").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;
  const safeChunk = Math.max(200, chunkSize || 800);
  const safeOverlap = Math.max(0, Math.min(safeChunk - 50, overlap || 120));
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + safeChunk);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = end - safeOverlap;
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return -1;
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return -1;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function ensureBucket(name: string, isPublic: boolean) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const exists = (buckets || []).some((bucket) => bucket.name === name);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(name, { public: isPublic });
    if (createError) throw createError;
  } else if (isPublic) {
    await supabase.storage.updateBucket(name, { public: true });
  }
}


async function ensureDefaultAdmin() {
  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("is_active", true)
    .limit(1);
  if (error) throw error;
  if ((data || []).length > 0) return;
  const { error: insertError } = await supabase.from("admins").insert({
    id: "admin_001",
    name: "시스템 관리자",
    employee_id: "ADMIN001",
    password: "admin123!",
    is_main_admin: true,
    is_active: true,
  });
  if (insertError) throw insertError;
}

async function ensureDefaultEducationData() {
  const { data: categories, error: catError } = await supabase.from("categories").select("id").limit(1);
  if (catError) throw catError;
  if ((categories || []).length === 0) {
    const rows = defaultCategories.map((category) => ({
      ...category,
      created_at: NOW(),
      updated_at: NOW(),
    }));
    const { error } = await supabase.from("categories").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  const { data: videos, error: videoError } = await supabase.from("videos").select("id").limit(1);
  if (videoError) throw videoError;
  if ((videos || []).length === 0) {
    const rows = defaultVideos.map((video) => ({
      ...video,
      created_at: NOW(),
      updated_at: NOW(),
    }));
    const { error } = await supabase.from("videos").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
}

async function ensureDefaultGuideAndCommunity() {
  const { data: guides, error: guideError } = await supabase.from("guides").select("id").limit(1);
  if (guideError) throw guideError;
  if ((guides || []).length === 0) {
    const { error } = await supabase.from("guides").insert(defaultGuide);
    if (error) throw error;
    const { error: sectionError } = await supabase.from("guide_sections").insert(defaultGuideSections);
    if (sectionError) throw sectionError;
  }

  const { data: posts, error: postError } = await supabase.from("community_posts").select("id").limit(1);
  if (postError) throw postError;
  if ((posts || []).length === 0) {
    const { error } = await supabase.from("community_posts").insert(defaultCommunityPost);
    if (error) throw error;
  }
}

async function initializeServer() {
  await ensureBucket(VIDEO_BUCKET, false);
  await ensureBucket(IMAGE_BUCKET, true);
  await ensureDefaultAdmin();
  await ensureDefaultEducationData();
  await ensureDefaultGuideAndCommunity();
}

function mapAdmin(row: any) {
  return {
    id: row.id,
    name: row.name,
    employeeId: row.employee_id,
    password: row.password,
    isMainAdmin: Boolean(row.is_main_admin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategory(row: any) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image: row.image,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVideo(row: any) {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    youtubeId: row.youtube_id,
    videoUrl: row.video_url,
    videoType: row.video_type,
    duration: row.duration,
    thumbnail: row.thumbnail,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUser(row: any, progressRows: any[]) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    attendance: Boolean(row.attendance),
    attendanceDates: Array.isArray(row.attendance_dates) ? row.attendance_dates : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    progress: (progressRows || []).map((progress) => ({
      videoId: progress.video_id,
      categoryId: progress.category_id,
      progress: Number(progress.progress || 0),
      watchTime: progress.watch_time == null ? undefined : Number(progress.watch_time),
      lastWatched: progress.last_watched,
    })),
  };
}

async function fetchAuthorizedEmployees() {
  const { data, error } = await supabase
    .from("authorized_employees")
    .select("employee_id, name")
    .eq("is_active", true)
    .order("employee_id", { ascending: true });
  if (error) throw error;
  return (data || []).map((employee) => ({
    employeeId: employee.employee_id,
    name: employee.name,
  }));
}

async function getUserByEmployeeId(employeeId: string) {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, employee_id, name, attendance, attendance_dates, created_at, updated_at, last_login_at")
    .eq("employee_id", employeeId)
    .maybeSingle();
  if (error) throw error;
  if (!user) return null;
  const { data: progressRows, error: progressError } = await supabase
    .from("user_video_progress")
    .select("video_id, category_id, progress, watch_time, last_watched")
    .eq("employee_id", employeeId)
    .order("last_watched", { ascending: false });
  if (progressError) throw progressError;
  return mapUser(user, progressRows || []);
}

async function listUsers() {
  const { data: users, error } = await supabase
    .from("users")
    .select("id, employee_id, name, attendance, attendance_dates, created_at, updated_at, last_login_at")
    .order("employee_id", { ascending: true });
  if (error) throw error;
  const { data: progressRows, error: progressError } = await supabase
    .from("user_video_progress")
    .select("employee_id, video_id, category_id, progress, watch_time, last_watched");
  if (progressError) throw progressError;
  const progressMap = new Map<string, any[]>();
  for (const progress of progressRows || []) {
    if (!progressMap.has(progress.employee_id)) progressMap.set(progress.employee_id, []);
    progressMap.get(progress.employee_id)?.push(progress);
  }
  return (users || []).map((user) => mapUser(user, progressMap.get(user.employee_id) || []));
}

async function listCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, title, subtitle, image, description, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapCategory);
}

async function listVideos(categoryId: string) {
  const { data, error } = await supabase
    .from("videos")
    .select("id, category_id, title, description, youtube_id, video_url, video_type, duration, thumbnail, created_at, updated_at")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapVideo);
}

async function listAdmins() {
  const { data, error } = await supabase
    .from("admins")
    .select("id, name, employee_id, password, is_main_admin, created_at, updated_at")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapAdmin);
}

async function getSetting(key: string, fallback: any) {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return {
    value: data?.value ?? fallback,
    updatedAt: data?.updated_at ?? null,
  };
}

async function upsertSetting(key: string, value: any) {
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key, value, updated_at: NOW() }, { onConflict: "key" });
  if (error) throw error;
}

async function getChatSettings() {
  const { data, error } = await supabase
    .from("chat_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const fallback = {
    id: "default",
    provider: "openai",
    model: "gpt-5.4",
    embedding_model: "text-embedding-3-small",
    retrieval_scope: ["guides", "community"],
    chunk_size: 800,
    chunk_overlap: 120,
    is_enabled: true,
    system_prompt: "",
    updated_at: NOW(),
  };
  const { error: insertError } = await supabase.from("chat_settings").insert(fallback);
  if (insertError) throw insertError;
  return fallback;
}

async function upsertChatSettings(patch: any) {
  const current = await getChatSettings();
  const merged = {
    ...current,
    ...patch,
    id: "default",
    updated_at: NOW(),
  };
  const { error } = await supabase.from("chat_settings").upsert(merged, { onConflict: "id" });
  if (error) throw error;
  return merged;
}

async function buildDocumentSources() {
  const { data: guides, error: guideError } = await supabase
    .from("guides")
    .select("id, title, description, is_published");
  if (guideError) throw guideError;

  const { data: sections, error: sectionError } = await supabase
    .from("guide_sections")
    .select("id, guide_id, title, markdown_content, slug, sort_order");
  if (sectionError) throw sectionError;

  const { data: posts, error: postError } = await supabase
    .from("community_posts")
    .select("id, title, summary, content, is_published");
  if (postError) throw postError;

  const { data: assets, error: assetError } = await supabase
    .from("community_assets")
    .select("id, post_id, file_name, mime_type, metadata");
  if (assetError) throw assetError;

  const byGuide = new Map<string, any[]>();
  for (const section of sections || []) {
    if (!byGuide.has(section.guide_id)) byGuide.set(section.guide_id, []);
    byGuide.get(section.guide_id)?.push(section);
  }

  const sources: any[] = [];
  for (const guide of guides || []) {
    const guideSections = (byGuide.get(guide.id) || []).sort((a, b) => a.sort_order - b.sort_order);
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
        guideId: guide.id,
        isPublished: guide.is_published,
        sectionIds: guideSections.map((section) => section.id),
      },
    });
  }

  for (const post of posts || []) {
    const relatedAssets = (assets || []).filter((asset) => asset.post_id === post.id);
    const content = [
      post.title,
      post.summary || "",
      post.content || "",
      ...relatedAssets.map((asset) => `${asset.file_name} ${asset.mime_type || ""}`),
    ].join("\n\n");
    sources.push({
      id: `community_${post.id}`,
      source_type: "community_post",
      source_ref: post.id,
      title: post.title,
      content_text: content,
      metadata: {
        postId: post.id,
        isPublished: post.is_published,
        assetIds: relatedAssets.map((asset) => asset.id),
      },
    });
  }

  return sources;
}

async function generateEmbedding(input: string, settings: any) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
  return payload.data?.[0]?.embedding ?? null;
}

async function rebuildIndex() {
  const settings = await getChatSettings();
  const sources = await buildDocumentSources();
  const now = NOW();

  await supabase.from("document_chunks").delete().neq("id", "");
  await supabase.from("document_sources").delete().neq("id", "");

  for (const source of sources) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source.content_text));
    const contentHash = Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const sourceRow = {
      ...source,
      is_indexed: true,
      content_hash: contentHash,
      last_indexed_at: now,
      created_at: now,
      updated_at: now,
    };
    const { error: sourceError } = await supabase.from("document_sources").insert(sourceRow);
    if (sourceError) throw sourceError;

    const chunks = chunkText(source.content_text, settings.chunk_size, settings.chunk_overlap);
    for (let index = 0; index < chunks.length; index += 1) {
      const embedding = Deno.env.get("OPENAI_API_KEY")
        ? await generateEmbedding(chunks[index], settings)
        : null;
      const chunkRow = {
        id: `${source.id}_chunk_${index}`,
        source_id: source.id,
        chunk_index: index,
        content: chunks[index],
        embedding,
        metadata: source.metadata,
        created_at: now,
        updated_at: now,
      };
      const { error: chunkError } = await supabase.from("document_chunks").insert(chunkRow);
      if (chunkError) throw chunkError;
    }
  }

  return { indexedSourceCount: sources.length };
}

async function getIndexStatus() {
  const { count: sourceCount, error: sourceError } = await supabase
    .from("document_sources")
    .select("*", { count: "exact", head: true });
  if (sourceError) throw sourceError;
  const { count: chunkCount, error: chunkError } = await supabase
    .from("document_chunks")
    .select("*", { count: "exact", head: true });
  if (chunkError) throw chunkError;
  const { data: latest, error: latestError } = await supabase
    .from("document_sources")
    .select("last_indexed_at")
    .order("last_indexed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;
  return {
    sourceCount: sourceCount || 0,
    chunkCount: chunkCount || 0,
    lastIndexedAt: latest?.last_indexed_at || null,
  };
}

async function createChatAnswer(question: string, employeeId: string | null) {
  const settings = await getChatSettings();
  const { data: chunks, error } = await supabase
    .from("document_chunks")
    .select("id, source_id, content, embedding, metadata");
  if (error) throw error;

  let scoredChunks = (chunks || []).map((chunk) => ({
    ...chunk,
    score: 0,
  }));

  let queryEmbedding: number[] | null = null;
  if (Deno.env.get("OPENAI_API_KEY")) {
    queryEmbedding = await generateEmbedding(question, settings);
  }

  if (queryEmbedding) {
    scoredChunks = scoredChunks
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, Array.isArray(chunk.embedding) ? chunk.embedding : []),
      }))
      .sort((a, b) => b.score - a.score);
  } else {
    const tokens = question.toLowerCase().split(/\s+/).filter(Boolean);
    scoredChunks = scoredChunks
      .map((chunk) => {
        const haystack = String(chunk.content || "").toLowerCase();
        const matches = tokens.filter((token) => haystack.includes(token)).length;
        return { ...chunk, score: matches };
      })
      .sort((a, b) => b.score - a.score);
  }

  const topChunks = scoredChunks.filter((chunk) => chunk.score > -1).slice(0, 5);
  if (topChunks.length === 0 || topChunks.every((chunk) => chunk.score <= 0)) {
    return {
      status: "no_context",
      answer: "관련 문서를 찾지 못했습니다. 질문 범위를 좁히거나 관리자에게 문서 색인을 요청하세요.",
      sources: [],
      model: settings.model,
    };
  }

  const context = topChunks
    .map((chunk, index) => `문서 ${index + 1}\n${chunk.content}`)
    .join("\n\n");

  if (!Deno.env.get("OPENAI_API_KEY")) {
    return {
      status: "success",
      answer: `OpenAI API 키가 설정되지 않아 요약 모드로 응답합니다.\n\n질문: ${question}\n\n관련 문서 요약:\n${topChunks.map((chunk) => `- ${String(chunk.content).slice(0, 180)}`).join("\n")}`,
      sources: topChunks.map((chunk) => ({ sourceId: chunk.source_id, metadata: chunk.metadata })),
      model: "local-fallback",
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: settings.model || "gpt-5.4",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                settings.system_prompt ||
                "당신은 사내 교육 문서를 바탕으로 답하는 챗봇입니다. 근거가 없는 추측은 하지 말고, 답변 끝에 관련 문서가 무엇인지 짧게 정리하세요.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `질문: ${question}\n\n참고 문서:\n${context}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Responses API failed: ${message}`);
  }

  const payload = await response.json();
  const answer =
    payload.output_text ||
    payload.output?.map((item: any) => item.content?.map((part: any) => part.text || "").join("")).join("\n") ||
    "응답을 생성하지 못했습니다.";

  return {
    status: "success",
    answer,
    sources: topChunks.map((chunk) => ({ sourceId: chunk.source_id, metadata: chunk.metadata })),
    model: settings.model,
  };
}

async function logChatQuery(question: string, answer: string, status: string, model: string, sources: any[], employeeId: string | null, errorMessage?: string) {
  const { error } = await supabase.from("chat_query_logs").insert({
    id: makeId("chat"),
    employee_id: employeeId,
    question,
    answer,
    model,
    sources,
    status,
    error_message: errorMessage || null,
  });
  if (error) {
    console.warn("Failed to log chat query:", error);
  }
}

async function fetchCommunityPosts(includeDrafts = true, employeeId?: string | null) {
  let query = supabase
    .from("community_posts")
    .select("id, title, summary, content, post_type, is_published, author_employee_id, author_name, published_at, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (!includeDrafts) query = query.eq("is_published", true);
  const { data: posts, error } = await query;
  if (error) throw error;
  const postIds = (posts || []).map((post) => post.id);
  const { data: assets, error: assetsError } = await supabase
    .from("community_assets")
    .select("*")
    .in("post_id", postIds.length ? postIds : ["__none__"]);
  if (assetsError) throw assetsError;
  const { data: comments, error: commentsError } = await supabase
    .from("community_comments")
    .select("id, post_id, employee_id, author_name, content, is_deleted, created_at, updated_at")
    .in("post_id", postIds.length ? postIds : ["__none__"]);
  if (commentsError) throw commentsError;
  const { data: likes, error: likesError } = await supabase
    .from("community_post_likes")
    .select("post_id, employee_id, created_at")
    .in("post_id", postIds.length ? postIds : ["__none__"]);
  if (likesError) throw likesError;

  return (posts || []).map((post) => {
    const postAssets = (assets || [])
      .filter((asset) => asset.post_id === post.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((asset) => ({
        id: asset.id,
        postId: asset.post_id,
        driveFileId: asset.drive_file_id,
        fileName: asset.file_name,
        mimeType: asset.mime_type,
        assetType: asset.asset_type,
        previewUrl: asset.preview_url,
        thumbnailUrl: asset.thumbnail_url,
        fileSize: asset.file_size,
        sortOrder: asset.sort_order,
        syncStatus: asset.sync_status,
        metadata: asset.metadata,
        createdAt: asset.created_at,
        updatedAt: asset.updated_at,
      }));
    const postComments = (comments || [])
      .filter((comment) => comment.post_id === post.id)
      .map((comment) => ({
        id: comment.id,
        postId: comment.post_id,
        employeeId: comment.employee_id,
        authorName: comment.author_name,
        content: comment.content,
        isDeleted: Boolean(comment.is_deleted),
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
      }));
    const postLikes = (likes || []).filter((like) => like.post_id === post.id);
    return {
      id: post.id,
      title: post.title,
      summary: post.summary,
      content: post.content,
      postType: post.post_type,
      isPublished: Boolean(post.is_published),
      authorEmployeeId: post.author_employee_id,
      authorName: post.author_name,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      assets: postAssets,
      comments: postComments,
      likeCount: postLikes.length,
      likedByMe: Boolean(employeeId && postLikes.some((like) => like.employee_id === employeeId)),
      commentCount: postComments.filter((comment) => !comment.isDeleted).length,
    };
  });
}

async function fetchGuides(includeDrafts = true) {
  let query = supabase
    .from("guides")
    .select("id, title, description, slug, is_published, version, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (!includeDrafts) query = query.eq("is_published", true);
  const { data: guides, error } = await query;
  if (error) throw error;
  const guideIds = (guides || []).map((guide) => guide.id);
  const { data: sections, error: sectionError } = await supabase
    .from("guide_sections")
    .select("id, guide_id, parent_id, title, slug, markdown_content, sort_order, depth, created_at, updated_at")
    .in("guide_id", guideIds.length ? guideIds : ["__none__"])
    .order("sort_order", { ascending: true });
  if (sectionError) throw sectionError;
  return (guides || []).map((guide) => ({
    id: guide.id,
    title: guide.title,
    description: guide.description,
    slug: guide.slug,
    isPublished: Boolean(guide.is_published),
    version: guide.version,
    createdAt: guide.created_at,
    updatedAt: guide.updated_at,
    sectionCount: (sections || []).filter((section) => section.guide_id === guide.id).length,
    sections: (sections || [])
      .filter((section) => section.guide_id === guide.id)
      .map((section) => ({
        id: section.id,
        guideId: section.guide_id,
        parentId: section.parent_id,
        title: section.title,
        slug: section.slug,
        markdownContent: section.markdown_content,
        sortOrder: section.sort_order,
        depth: section.depth,
        createdAt: section.created_at,
        updatedAt: section.updated_at,
      })),
  }));
}

app.get("/make-server-a8898ff1/health", (c) =>
  c.json({ status: "ok", message: "Server is running", timestamp: NOW() }),
);

app.post("/make-server-a8898ff1/images/upload", async (c: any) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return c.json({ error: "파일이 필요합니다." }, 400);
    }
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: "파일 크기는 5MB를 초과할 수 없습니다." }, 400);
    }
    if (!file.type.startsWith("image/")) {
      return c.json({ error: "이미지 파일만 업로드 가능합니다." }, 400);
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `categories/category-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false });
    if (error) return c.json({ error: error.message }, 500);
    const { data: publicUrl } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);
    return c.json({ success: true, path: data?.path ?? filePath, publicUrl: publicUrl.publicUrl });
  } catch (error) {
    console.error("Image upload failed:", error);
    return c.json({ error: "이미지 업로드 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/upload-video", async (c: any) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") || formData.get("video");
    const categoryId = String(formData.get("categoryId") || "");
    if (!(file instanceof File) || !categoryId) {
      return c.json({ error: "비디오 파일과 카테고리 ID가 필요합니다." }, 400);
    }
    if (file.size > 100 * 1024 * 1024) {
      return c.json({ error: "파일 크기는 100MB를 초과할 수 없습니다." }, 400);
    }
    if (!file.type.startsWith("video/")) {
      return c.json({ error: "지원되지 않는 파일 형식입니다." }, 400);
    }
    const path = `${categoryId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return c.json({ error: error.message }, 500);
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(VIDEO_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedUrlError) return c.json({ error: signedUrlError.message }, 500);
    return c.json({ success: true, url: signedUrlData.signedUrl, fileName: path });
  } catch (error) {
    console.error("Video upload failed:", error);
    return c.json({ error: "파일 업로드 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/admin/login", async (c: any) => {
  try {
    const { employeeId, password } = await c.req.json();
    const { data, error } = await supabase
      .from("admins")
      .select("id, name, employee_id, password, is_main_admin")
      .eq("employee_id", String(employeeId || "").trim())
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.password !== password) {
      return c.json({ error: "사번 또는 비밀번호가 올바르지 않습니다." }, 401);
    }
    return c.json({
      success: true,
      admin: {
        id: data.id,
        name: data.name,
        employeeId: data.employee_id,
        isMainAdmin: Boolean(data.is_main_admin),
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return c.json({ error: "로그인 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/admin/list", async (c: any) => {
  try {
    return c.json({ admins: await listAdmins() });
  } catch (error) {
    console.error("Admin list error:", error);
    return c.json({ error: "관리자 목록 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/admin/create", async (c: any) => {
  try {
    const { name, employeeId, password } = await c.req.json();
    const normalizedEmployeeId = String(employeeId || "").trim();
    const { data: existing, error: existingError } = await supabase
      .from("admins")
      .select("id")
      .eq("employee_id", normalizedEmployeeId)
      .eq("is_active", true)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return c.json({ error: "이미 존재하는 사번입니다." }, 400);
    const row = {
      id: makeId("admin"),
      name: String(name || "").trim(),
      employee_id: normalizedEmployeeId,
      password: String(password || "").trim(),
      is_main_admin: false,
      is_active: true,
      created_at: NOW(),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("admins").insert(row);
    if (error) throw error;
    return c.json({ success: true, admin: mapAdmin(row) });
  } catch (error) {
    console.error("Create admin error:", error);
    return c.json({ error: "관리자 생성 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/admin/:id", async (c: any) => {
  try {
    const adminId = c.req.param("id");
    const { name, employeeId, password } = await c.req.json();
    const { data: existing, error: existingError } = await supabase
      .from("admins")
      .select("*")
      .eq("id", adminId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return c.json({ error: "관리자를 찾을 수 없습니다." }, 404);
    const updateRow = {
      name: String(name || existing.name).trim(),
      employee_id: String(employeeId || existing.employee_id).trim(),
      password: password ? String(password).trim() : existing.password,
      updated_at: NOW(),
    };
    const { error } = await supabase.from("admins").update(updateRow).eq("id", adminId);
    if (error) throw error;
    return c.json({ success: true, admin: mapAdmin({ ...existing, ...updateRow }) });
  } catch (error) {
    console.error("Update admin error:", error);
    return c.json({ error: "관리자 수정 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/admin/:id", async (c: any) => {
  try {
    const adminId = c.req.param("id");
    const { data: existing, error: existingError } = await supabase
      .from("admins")
      .select("id, is_main_admin")
      .eq("id", adminId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return c.json({ error: "관리자를 찾을 수 없습니다." }, 404);
    if (existing.is_main_admin) return c.json({ error: "메인 관리자는 삭제할 수 없습니다." }, 400);
    const { error } = await supabase
      .from("admins")
      .update({ is_active: false, updated_at: NOW() })
      .eq("id", adminId);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete admin error:", error);
    return c.json({ error: "관리자 삭제 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/users/validate", async (c: any) => {
  try {
    const { employeeId, name } = await c.req.json();
    const normalizedEmployeeId = canonicalizeEmployeeId(employeeId);
    const normalizedName = canonicalizeEmployeeName(name);
    if (!normalizedEmployeeId || !normalizedName) {
      return c.json({ success: false, error: "사번과 이름을 모두 입력해주세요." }, 400);
    }
    const employees = await fetchAuthorizedEmployees();
    const isAuthorized = employees.some(
      (employee) =>
        canonicalizeEmployeeId(employee.employeeId) === normalizedEmployeeId &&
        canonicalizeEmployeeName(employee.name) === normalizedName,
    );
    return c.json({ success: isAuthorized });
  } catch (error) {
    console.error("Validate user error:", error);
    return c.json({ success: false, error: "사번 검증 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/users", async (c: any) => {
  try {
    const { id, employeeId, name } = await c.req.json();
    const normalizedEmployeeId = canonicalizeEmployeeId(employeeId);
    const displayName = String(name || "").trim();
    if (normalizedEmployeeId.length !== 8) {
      return c.json({ error: "사번은 8자리 숫자여야 합니다." }, 400);
    }
    const employees = await fetchAuthorizedEmployees();
    const isAuthorized = employees.some(
      (employee) =>
        canonicalizeEmployeeId(employee.employeeId) === normalizedEmployeeId &&
        canonicalizeEmployeeName(employee.name) === canonicalizeEmployeeName(displayName),
    );
    if (!isAuthorized) {
      return c.json({ error: "승인된 사용자만 로그인할 수 있습니다." }, 403);
    }
    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("*")
      .eq("employee_id", normalizedEmployeeId)
      .maybeSingle();
    if (existingError) throw existingError;
    const row = {
      id: existing?.id || String(id || normalizedEmployeeId),
      employee_id: normalizedEmployeeId,
      name: displayName,
      attendance: Boolean(existing?.attendance),
      attendance_dates: Array.isArray(existing?.attendance_dates) ? existing.attendance_dates : [],
      created_at: existing?.created_at || NOW(),
      updated_at: NOW(),
      last_login_at: NOW(),
    };
    const { error } = await supabase.from("users").upsert(row, { onConflict: "employee_id" });
    if (error) throw error;
    return c.json({ success: true, user: await getUserByEmployeeId(normalizedEmployeeId) });
  } catch (error) {
    console.error("Save user error:", error);
    return c.json({ error: "사용자 정보를 저장하지 못했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/users", async (c: any) => {
  try {
    return c.json({ users: await listUsers() });
  } catch (error) {
    console.error("List users error:", error);
    return c.json({ error: "사용자 정보를 조회하지 못했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/users/:employeeId/record", async (c: any) => {
  try {
    const employeeId = canonicalizeEmployeeId(c.req.param("employeeId"));
    const user = await getUserByEmployeeId(employeeId);
    if (!user) return c.json({ error: "사용자를 찾을 수 없습니다." }, 404);
    return c.json({ user });
  } catch (error) {
    console.error("Get user record error:", error);
    return c.json({ error: "사용자 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/users/:employeeId/attendance", async (c: any) => {
  try {
    const employeeId = canonicalizeEmployeeId(c.req.param("employeeId"));
    const { attendance } = await c.req.json();
    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("*")
      .eq("employee_id", employeeId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return c.json({ error: "사용자를 찾을 수 없습니다." }, 404);
    const dateOnly = new Date().toISOString().slice(0, 10);
    const attendanceDates = Array.isArray(existing.attendance_dates) ? existing.attendance_dates : [];
    const nextDates = attendance
      ? Array.from(new Set([...attendanceDates, dateOnly]))
      : attendanceDates;
    const { error } = await supabase
      .from("users")
      .update({
        attendance: Boolean(attendance),
        attendance_dates: nextDates,
        updated_at: NOW(),
      })
      .eq("employee_id", employeeId);
    if (error) throw error;
    if (attendance) {
      await supabase.from("attendance_logs").upsert({
        key: `attendance_log_${employeeId}_${dateOnly}`,
        employee_id: employeeId,
        timestamp: new Date(`${dateOnly}T12:00:00.000Z`).toISOString(),
        payload: { employeeId, timestamp: new Date(`${dateOnly}T12:00:00.000Z`).toISOString() },
      });
    }
    return c.json({ success: true, user: await getUserByEmployeeId(employeeId) });
  } catch (error) {
    console.error("Update attendance error:", error);
    return c.json({ error: "출석 정보 업데이트 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/users/:employeeId/attendance/log", async (c: any) => {
  try {
    const employeeId = canonicalizeEmployeeId(c.req.param("employeeId"));
    const body = await c.req.json();
    const timestamp = body?.timestamp ? new Date(body.timestamp).toISOString() : NOW();
    const key = `attendance_log_${employeeId}_${Date.now()}`;
    const { error } = await supabase.from("attendance_logs").insert({
      key,
      employee_id: employeeId,
      timestamp,
      payload: { employeeId, timestamp },
    });
    if (error) throw error;
    const user = await getUserByEmployeeId(employeeId);
    if (user) {
      const dateOnly = timestamp.slice(0, 10);
      const nextDates = Array.from(new Set([...(user.attendanceDates || []), dateOnly]));
      await supabase
        .from("users")
        .update({ attendance: true, attendance_dates: nextDates, updated_at: NOW() })
        .eq("employee_id", employeeId);
    }
    return c.json({ success: true, entry: { employeeId, timestamp } });
  } catch (error) {
    console.error("Create attendance log error:", error);
    return c.json({ error: "출석 로그 기록 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/users/:employeeId/attendance/logs", async (c: any) => {
  try {
    const employeeId = canonicalizeEmployeeId(c.req.param("employeeId"));
    const month = String(c.req.query("month") || "");
    const { data, error } = await supabase
      .from("attendance_logs")
      .select("employee_id, timestamp, payload")
      .eq("employee_id", employeeId)
      .order("timestamp", { ascending: false });
    if (error) throw error;
    let logs = (data || []).map((row) => ({
      employeeId: row.employee_id,
      timestamp: row.timestamp,
      date: row.timestamp,
      ...row.payload,
    }));
    if (month) {
      logs = logs.filter((log) => String(log.timestamp).startsWith(month));
    }
    return c.json({ logs });
  } catch (error) {
    console.error("List attendance logs error:", error);
    return c.json({ error: "출석 로그 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/categories", async (c: any) => {
  try {
    return c.json({ categories: await listCategories() });
  } catch (error) {
    console.error("List categories error:", error);
    return c.json({ error: "카테고리 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/categories", async (c: any) => {
  try {
    const { title, subtitle, image, description } = await c.req.json();
    const row = {
      id: makeId("cat"),
      title: String(title || "").trim(),
      subtitle: subtitle || null,
      image: image || null,
      description: description || null,
      created_at: NOW(),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("categories").insert(row);
    if (error) throw error;
    return c.json({ success: true, category: mapCategory(row) });
  } catch (error) {
    console.error("Create category error:", error);
    return c.json({ error: "카테고리 생성 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/categories/:id", async (c: any) => {
  try {
    const categoryId = c.req.param("id");
    const { title, subtitle, image, description } = await c.req.json();
    const { error } = await supabase
      .from("categories")
      .update({
        title: String(title || "").trim(),
        subtitle: subtitle || null,
        image: image || null,
        description: description || null,
        updated_at: NOW(),
      })
      .eq("id", categoryId);
    if (error) throw error;
    const categories = await listCategories();
    return c.json({ success: true, category: categories.find((category) => category.id === categoryId) });
  } catch (error) {
    console.error("Update category error:", error);
    return c.json({ error: "카테고리 수정 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/categories/:id", async (c: any) => {
  try {
    const categoryId = c.req.param("id");
    const { error } = await supabase.from("categories").delete().eq("id", categoryId);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return c.json({ error: "카테고리 삭제 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/videos/:categoryId", async (c: any) => {
  try {
    return c.json({ videos: await listVideos(c.req.param("categoryId")) });
  } catch (error) {
    console.error("List videos error:", error);
    return c.json({ error: "영상 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/videos", async (c: any) => {
  try {
    const body = await c.req.json();
    const categoryId = body.categoryId;
    const videoInput = body.video || body;
    const videoType = videoInput.videoType || "youtube";
    const row = {
      id: makeId("video"),
      category_id: categoryId,
      title: String(videoInput.title || "").trim(),
      description: videoInput.description || null,
      youtube_id: videoType === "youtube" ? videoInput.youtubeId || null : null,
      video_url: videoType === "local" ? videoInput.videoUrl || null : null,
      video_type: videoType,
      duration: String(videoInput.duration || "").trim(),
      thumbnail:
        videoInput.thumbnail ||
        (videoType === "youtube" && videoInput.youtubeId
          ? `https://img.youtube.com/vi/${videoInput.youtubeId}/hqdefault.jpg`
          : "https://via.placeholder.com/480x270/1f2937/ffffff?text=Video"),
      created_at: NOW(),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("videos").insert(row);
    if (error) throw error;
    return c.json({ success: true, video: mapVideo(row) });
  } catch (error) {
    console.error("Create video error:", error);
    return c.json({ error: "영상 생성 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/videos/:categoryId/:videoId", async (c: any) => {
  try {
    const categoryId = c.req.param("categoryId");
    const videoId = c.req.param("videoId");
    const body = await c.req.json();
    const videoType = body.videoType || "youtube";
    const updateRow = {
      category_id: categoryId,
      title: String(body.title || "").trim(),
      description: body.description || null,
      youtube_id: videoType === "youtube" ? body.youtubeId || null : null,
      video_url: videoType === "local" ? body.videoUrl || null : null,
      video_type: videoType,
      duration: String(body.duration || "").trim(),
      thumbnail:
        body.thumbnail ||
        (videoType === "youtube" && body.youtubeId
          ? `https://img.youtube.com/vi/${body.youtubeId}/hqdefault.jpg`
          : "https://via.placeholder.com/480x270/1f2937/ffffff?text=Video"),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("videos").update(updateRow).eq("id", videoId);
    if (error) throw error;
    const videos = await listVideos(categoryId);
    return c.json({ success: true, video: videos.find((video) => video.id === videoId) });
  } catch (error) {
    console.error("Update video error:", error);
    return c.json({ error: "영상 수정 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/videos/:categoryId/:videoId", async (c: any) => {
  try {
    const videoId = c.req.param("videoId");
    const { error } = await supabase.from("videos").delete().eq("id", videoId);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete video error:", error);
    return c.json({ error: "영상 삭제 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/progress", async (c: any) => {
  try {
    const { employeeId, videoId, categoryId, progress, watchTime } = await c.req.json();
    const normalizedEmployeeId = canonicalizeEmployeeId(employeeId);
    const { error } = await supabase
      .from("user_video_progress")
      .upsert(
        {
          employee_id: normalizedEmployeeId,
          video_id: videoId,
          category_id: categoryId || null,
          progress: Number(progress || 0),
          watch_time: watchTime == null ? null : Number(watchTime),
          last_watched: NOW(),
        },
        { onConflict: "employee_id,video_id" },
      );
    if (error) throw error;
    return c.json({ success: true, user: await getUserByEmployeeId(normalizedEmployeeId) });
  } catch (error) {
    console.error("Save progress error:", error);
    return c.json({ error: "진행률 저장 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/progress/:employeeId", async (c: any) => {
  try {
    const user = await getUserByEmployeeId(canonicalizeEmployeeId(c.req.param("employeeId")));
    if (!user) return c.json({ error: "사용자를 찾을 수 없습니다." }, 404);
    return c.json({ progress: user.progress || [] });
  } catch (error) {
    console.error("Get progress error:", error);
    return c.json({ error: "진행률 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/admin/progress", async (c: any) => {
  try {
    const users = await listUsers();
    const progress = users.flatMap((user) =>
      (user.progress || []).map((entry) => ({
        id: user.employeeId,
        employeeId: user.employeeId,
        name: user.name,
        ...entry,
      })),
    );
    return c.json({ progress });
  } catch (error) {
    console.error("Admin progress error:", error);
    return c.json({ error: "전체 진행률 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/community/posts", async (c: any) => {
  try {
    const includeDrafts = c.req.query("includeDrafts") !== "false";
    const employeeId = canonicalizeEmployeeId(c.req.query("employeeId") || "");
    const posts = await fetchCommunityPosts(includeDrafts, employeeId || null);
    return c.json({ posts });
  } catch (error) {
    console.error("List community posts error:", error);
    return c.json({ error: "게시물 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/community/posts", async (c: any) => {
  try {
    const body = await c.req.json();
    const row = {
      id: makeId("post"),
      title: String(body.title || "").trim(),
      summary: body.summary || null,
      content: body.content || null,
      post_type: body.postType || "notice",
      is_published: Boolean(body.isPublished),
      author_employee_id: body.authorEmployeeId || null,
      author_name: body.authorName || null,
      published_at: body.isPublished ? NOW() : null,
      created_at: NOW(),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("community_posts").insert(row);
    if (error) throw error;
    const assets = Array.isArray(body.assets) ? body.assets : [];
    if (assets.length > 0) {
      const assetRows = assets.map((asset: any, index: number) => ({
        id: makeId("asset"),
        post_id: row.id,
        drive_file_id: asset.driveFileId || null,
        file_name: asset.fileName || `asset-${index + 1}`,
        mime_type: asset.mimeType || null,
        asset_type: asset.assetType || "document",
        preview_url: asset.previewUrl || null,
        thumbnail_url: asset.thumbnailUrl || null,
        file_size: asset.fileSize || null,
        sort_order: typeof asset.sortOrder === "number" ? asset.sortOrder : index,
        sync_status: asset.syncStatus || "ready",
        metadata: asset.metadata || {},
        created_at: NOW(),
        updated_at: NOW(),
      }));
      const { error: assetError } = await supabase.from("community_assets").insert(assetRows);
      if (assetError) throw assetError;
    }
    const posts = await fetchCommunityPosts(true);
    return c.json({ success: true, post: posts.find((post) => post.id === row.id) });
  } catch (error) {
    console.error("Create community post error:", error);
    return c.json({ error: "게시물 생성 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/community/posts/:postId", async (c: any) => {
  try {
    const employeeId = canonicalizeEmployeeId(c.req.query("employeeId") || "");
    const posts = await fetchCommunityPosts(true, employeeId || null);
    const post = posts.find((item) => item.id === c.req.param("postId"));
    if (!post) return c.json({ error: "게시물을 찾을 수 없습니다." }, 404);
    return c.json({ post });
  } catch (error) {
    console.error("Get community post error:", error);
    return c.json({ error: "게시물 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/community/posts/:postId", async (c: any) => {
  try {
    const postId = c.req.param("postId");
    const body = await c.req.json();
    const { error } = await supabase
      .from("community_posts")
      .update({
        title: String(body.title || "").trim(),
        summary: body.summary || null,
        content: body.content || null,
        post_type: body.postType || "notice",
        is_published: Boolean(body.isPublished),
        published_at: body.isPublished ? NOW() : null,
        updated_at: NOW(),
      })
      .eq("id", postId);
    if (error) throw error;
    if (Array.isArray(body.assets)) {
      await supabase.from("community_assets").delete().eq("post_id", postId);
      if (body.assets.length > 0) {
        const assetRows = body.assets.map((asset: any, index: number) => ({
          id: asset.id || makeId("asset"),
          post_id: postId,
          drive_file_id: asset.driveFileId || null,
          file_name: asset.fileName || `asset-${index + 1}`,
          mime_type: asset.mimeType || null,
          asset_type: asset.assetType || "document",
          preview_url: asset.previewUrl || null,
          thumbnail_url: asset.thumbnailUrl || null,
          file_size: asset.fileSize || null,
          sort_order: typeof asset.sortOrder === "number" ? asset.sortOrder : index,
          sync_status: asset.syncStatus || "ready",
          metadata: asset.metadata || {},
          updated_at: NOW(),
        }));
        const { error: assetError } = await supabase.from("community_assets").insert(assetRows);
        if (assetError) throw assetError;
      }
    }
    const posts = await fetchCommunityPosts(true);
    return c.json({ success: true, post: posts.find((post) => post.id === postId) });
  } catch (error) {
    console.error("Update community post error:", error);
    return c.json({ error: "게시물 수정 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/community/posts/:postId", async (c: any) => {
  try {
    const { error } = await supabase.from("community_posts").delete().eq("id", c.req.param("postId"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete community post error:", error);
    return c.json({ error: "게시물 삭제 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/community/posts/:postId/assets", async (c: any) => {
  try {
    const postId = c.req.param("postId");
    const body = await c.req.json();
    const row = {
      id: makeId("asset"),
      post_id: postId,
      drive_file_id: body.driveFileId || null,
      file_name: body.fileName || "untitled",
      mime_type: body.mimeType || null,
      asset_type: body.assetType || "document",
      preview_url: body.previewUrl || null,
      thumbnail_url: body.thumbnailUrl || null,
      file_size: body.fileSize || null,
      sort_order: body.sortOrder || 0,
      sync_status: body.syncStatus || "ready",
      metadata: body.metadata || {},
      created_at: NOW(),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("community_assets").insert(row);
    if (error) throw error;
    return c.json({ success: true, asset: row });
  } catch (error) {
    console.error("Create asset error:", error);
    return c.json({ error: "첨부 자산 저장 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/community/posts/:postId/comments", async (c: any) => {
  try {
    const { data, error } = await supabase
      .from("community_comments")
      .select("id, post_id, employee_id, author_name, content, is_deleted, created_at, updated_at")
      .eq("post_id", c.req.param("postId"))
      .order("created_at", { ascending: true });
    if (error) throw error;
    return c.json({
      comments: (data || []).map((comment) => ({
        id: comment.id,
        postId: comment.post_id,
        employeeId: comment.employee_id,
        authorName: comment.author_name,
        content: comment.content,
        isDeleted: Boolean(comment.is_deleted),
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
      })),
    });
  } catch (error) {
    console.error("List comments error:", error);
    return c.json({ error: "댓글 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/community/posts/:postId/comments", async (c: any) => {
  try {
    const body = await c.req.json();
    const row = {
      id: makeId("comment"),
      post_id: c.req.param("postId"),
      employee_id: canonicalizeEmployeeId(body.employeeId),
      author_name: String(body.authorName || "").trim() || "사용자",
      content: String(body.content || "").trim(),
      is_deleted: false,
      created_at: NOW(),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("community_comments").insert(row);
    if (error) throw error;
    return c.json({
      success: true,
      comment: {
        id: row.id,
        postId: row.post_id,
        employeeId: row.employee_id,
        authorName: row.author_name,
        content: row.content,
        isDeleted: false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("Create comment error:", error);
    return c.json({ error: "댓글 작성 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/community/comments/:commentId", async (c: any) => {
  try {
    const { content } = await c.req.json();
    const { error } = await supabase
      .from("community_comments")
      .update({ content: String(content || "").trim(), updated_at: NOW() })
      .eq("id", c.req.param("commentId"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Update comment error:", error);
    return c.json({ error: "댓글 수정 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/community/comments/:commentId", async (c: any) => {
  try {
    const { error } = await supabase
      .from("community_comments")
      .update({ is_deleted: true, updated_at: NOW(), content: "[삭제된 댓글]" })
      .eq("id", c.req.param("commentId"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return c.json({ error: "댓글 삭제 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/community/posts/:postId/like", async (c: any) => {
  try {
    const { employeeId } = await c.req.json();
    const row = {
      post_id: c.req.param("postId"),
      employee_id: canonicalizeEmployeeId(employeeId),
      created_at: NOW(),
    };
    const { error } = await supabase
      .from("community_post_likes")
      .upsert(row, { onConflict: "post_id,employee_id" });
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Like post error:", error);
    return c.json({ error: "좋아요 처리 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/community/posts/:postId/like", async (c: any) => {
  try {
    const employeeId = canonicalizeEmployeeId(c.req.query("employeeId") || "");
    const { error } = await supabase
      .from("community_post_likes")
      .delete()
      .eq("post_id", c.req.param("postId"))
      .eq("employee_id", employeeId);
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Unlike post error:", error);
    return c.json({ error: "좋아요 취소 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/guides", async (c: any) => {
  try {
    const includeDrafts = c.req.query("includeDrafts") !== "false";
    return c.json({ guides: await fetchGuides(includeDrafts) });
  } catch (error) {
    console.error("List guides error:", error);
    return c.json({ error: "가이드북 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/guides", async (c: any) => {
  try {
    const body = await c.req.json();
    const row = {
      id: makeId("guide"),
      title: String(body.title || "").trim(),
      description: body.description || null,
      slug: slugify(body.slug || body.title),
      is_published: Boolean(body.isPublished),
      version: Number(body.version || 1),
      created_at: NOW(),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("guides").insert(row);
    if (error) throw error;
    return c.json({ success: true, guide: (await fetchGuides(true)).find((guide) => guide.id === row.id) });
  } catch (error) {
    console.error("Create guide error:", error);
    return c.json({ error: "가이드북 생성 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/guides/:guideId", async (c: any) => {
  try {
    const guide = (await fetchGuides(true)).find((item) => item.id === c.req.param("guideId"));
    if (!guide) return c.json({ error: "가이드북을 찾을 수 없습니다." }, 404);
    return c.json({ guide });
  } catch (error) {
    console.error("Get guide error:", error);
    return c.json({ error: "가이드북 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/guides/:guideId", async (c: any) => {
  try {
    const body = await c.req.json();
    const guideId = c.req.param("guideId");
    const { error } = await supabase
      .from("guides")
      .update({
        title: String(body.title || "").trim(),
        description: body.description || null,
        slug: slugify(body.slug || body.title),
        is_published: Boolean(body.isPublished),
        version: Number(body.version || 1),
        updated_at: NOW(),
      })
      .eq("id", guideId);
    if (error) throw error;
    return c.json({ success: true, guide: (await fetchGuides(true)).find((guide) => guide.id === guideId) });
  } catch (error) {
    console.error("Update guide error:", error);
    return c.json({ error: "가이드북 수정 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/guides/:guideId", async (c: any) => {
  try {
    const { error } = await supabase.from("guides").delete().eq("id", c.req.param("guideId"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete guide error:", error);
    return c.json({ error: "가이드북 삭제 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/guides/:guideId/sections", async (c: any) => {
  try {
    const body = await c.req.json();
    const row = {
      id: makeId("section"),
      guide_id: c.req.param("guideId"),
      parent_id: body.parentId || null,
      title: String(body.title || "").trim(),
      slug: slugify(body.slug || body.title),
      markdown_content: body.markdownContent || "",
      sort_order: Number(body.sortOrder || 0),
      depth: Number(body.depth || 0),
      created_at: NOW(),
      updated_at: NOW(),
    };
    const { error } = await supabase.from("guide_sections").insert(row);
    if (error) throw error;
    return c.json({ success: true, section: row });
  } catch (error) {
    console.error("Create guide section error:", error);
    return c.json({ error: "섹션 생성 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/guide-sections/:sectionId", async (c: any) => {
  try {
    const body = await c.req.json();
    const { error } = await supabase
      .from("guide_sections")
      .update({
        parent_id: body.parentId || null,
        title: String(body.title || "").trim(),
        slug: slugify(body.slug || body.title),
        markdown_content: body.markdownContent || "",
        sort_order: Number(body.sortOrder || 0),
        depth: Number(body.depth || 0),
        updated_at: NOW(),
      })
      .eq("id", c.req.param("sectionId"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Update guide section error:", error);
    return c.json({ error: "섹션 수정 중 오류가 발생했습니다." }, 500);
  }
});

app.delete("/make-server-a8898ff1/guide-sections/:sectionId", async (c: any) => {
  try {
    const { error } = await supabase.from("guide_sections").delete().eq("id", c.req.param("sectionId"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete guide section error:", error);
    return c.json({ error: "섹션 삭제 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/admin/integrations/google-drive", async (c: any) => {
  try {
    const setting = await getSetting("google_drive", {
      enabled: false,
      folderId: "",
      allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "video/mp4"],
      maxFileSizeMb: 100,
      previewMode: "restricted",
      credentialConfigured: Boolean(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") && Deno.env.get("GOOGLE_PRIVATE_KEY")),
      lastValidatedAt: null,
      lastError: null,
    });
    return c.json(setting);
  } catch (error) {
    console.error("Get Google Drive settings error:", error);
    return c.json({ error: "Google Drive 설정 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/admin/integrations/google-drive", async (c: any) => {
  try {
    const body = await c.req.json();
    const nextValue = {
      enabled: Boolean(body.enabled),
      folderId: String(body.folderId || "").trim(),
      allowedMimeTypes: Array.isArray(body.allowedMimeTypes) ? body.allowedMimeTypes : ["application/pdf", "image/png", "image/jpeg", "video/mp4"],
      maxFileSizeMb: Number(body.maxFileSizeMb || 100),
      previewMode: body.previewMode || "restricted",
      credentialConfigured: Boolean(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") && Deno.env.get("GOOGLE_PRIVATE_KEY")),
      lastValidatedAt: body.lastValidatedAt || null,
      lastError: body.lastError || null,
    };
    await upsertSetting("google_drive", nextValue);
    return c.json({ success: true, value: nextValue });
  } catch (error) {
    console.error("Update Google Drive settings error:", error);
    return c.json({ error: "Google Drive 설정 저장 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/admin/integrations/google-drive/validate", async (c: any) => {
  try {
    const current = await getSetting("google_drive", {});
    const credentialConfigured = Boolean(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") && Deno.env.get("GOOGLE_PRIVATE_KEY"));
    const folderId = String(current.value.folderId || "").trim();
    const success = credentialConfigured && Boolean(folderId);
    const nextValue = {
      ...current.value,
      credentialConfigured,
      lastValidatedAt: NOW(),
      lastError: success ? null : "서비스 계정 자격 증명 또는 폴더 ID가 설정되지 않았습니다.",
    };
    await upsertSetting("google_drive", nextValue);
    return c.json({ success, value: nextValue });
  } catch (error) {
    console.error("Validate Google Drive settings error:", error);
    return c.json({ error: "Google Drive 설정 검증 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/admin/ai/settings", async (c: any) => {
  try {
    const settings = await getChatSettings();
    const providerSetting = await getSetting("ai_provider", {
      provider: settings.provider,
      apiKeyConfigured: Boolean(Deno.env.get("OPENAI_API_KEY")),
      model: settings.model,
      embeddingModel: settings.embedding_model,
    });
    return c.json({
      settings: {
        provider: settings.provider,
        model: settings.model,
        embeddingModel: settings.embedding_model,
        retrievalScope: settings.retrieval_scope,
        chunkSize: settings.chunk_size,
        chunkOverlap: settings.chunk_overlap,
        systemPrompt: settings.system_prompt || "",
        isEnabled: Boolean(settings.is_enabled),
      },
      provider: providerSetting.value,
    });
  } catch (error) {
    console.error("Get AI settings error:", error);
    return c.json({ error: "AI 설정 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.put("/make-server-a8898ff1/admin/ai/settings", async (c: any) => {
  try {
    const body = await c.req.json();
    const settings = await upsertChatSettings({
      provider: body.provider || "openai",
      model: body.model || "gpt-5.4",
      embedding_model: body.embeddingModel || "text-embedding-3-small",
      retrieval_scope: Array.isArray(body.retrievalScope) ? body.retrievalScope : ["guides", "community"],
      chunk_size: Number(body.chunkSize || 800),
      chunk_overlap: Number(body.chunkOverlap || 120),
      system_prompt: body.systemPrompt || "",
      is_enabled: body.isEnabled !== false,
    });
    await upsertSetting("ai_provider", {
      provider: settings.provider,
      apiKeyConfigured: Boolean(Deno.env.get("OPENAI_API_KEY")),
      model: settings.model,
      embeddingModel: settings.embedding_model,
    });
    return c.json({ success: true, settings });
  } catch (error) {
    console.error("Update AI settings error:", error);
    return c.json({ error: "AI 설정 저장 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/admin/ai/reindex", async (c: any) => {
  try {
    const result = await rebuildIndex();
    return c.json({ success: true, ...result, status: await getIndexStatus() });
  } catch (error) {
    console.error("Reindex error:", error);
    return c.json({ error: "문서 재색인 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/admin/ai/index-status", async (c: any) => {
  try {
    return c.json({ status: await getIndexStatus() });
  } catch (error) {
    console.error("Index status error:", error);
    return c.json({ error: "색인 상태 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.get("/make-server-a8898ff1/admin/ai/query-logs", async (c: any) => {
  try {
    const { data, error } = await supabase
      .from("chat_query_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return c.json({ logs: data || [] });
  } catch (error) {
    console.error("Query log error:", error);
    return c.json({ error: "쿼리 로그 조회 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/chat/query", async (c: any) => {
  let question = "";
  let employeeId: string | null = null;
  try {
    const body = await c.req.json();
    question = String(body.question || "").trim();
    employeeId = body.employeeId ? canonicalizeEmployeeId(body.employeeId) : null;
    if (!question) return c.json({ error: "질문이 필요합니다." }, 400);
    const result = await createChatAnswer(question, employeeId);
    await logChatQuery(question, result.answer, result.status, result.model, result.sources, employeeId);
    return c.json(result);
  } catch (error) {
    console.error("Chat query error:", error);
    await logChatQuery(question, "", "error", "unknown", [], employeeId, String(error));
    return c.json({ error: "챗봇 응답 생성 중 오류가 발생했습니다." }, 500);
  }
});

app.post("/make-server-a8898ff1/admin/migrate-legacy-kv", async (c: any) => {
  try {
    const kv = await import("./kv_store.ts");
    const result = await kv.migrateLegacyKvToRelational();
    return c.json({ success: true, ...result });
  } catch (error) {
    console.error("Legacy migration error:", error);
    return c.json({ error: "레거시 KV 마이그레이션 중 오류가 발생했습니다." }, 500);
  }
});

console.log("Starting relational server initialization...");
await initializeServer()
  .then(() => console.log("✓ Relational initialization completed"))
  .catch((error) => {
    console.error("✗ Relational initialization failed:", error);
    console.log("Server will continue running but some features may not work");
  });

console.log("Server is ready to accept requests");
Deno.serve(app.fetch);
