create table if not exists public.community_posts (
  id text primary key,
  title text not null,
  summary text,
  content text,
  post_type text not null default 'notice',
  is_published boolean not null default false,
  author_employee_id text,
  author_name text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_post_type_check check (post_type in ('notice', 'gallery', 'document', 'video'))
);

create table if not exists public.community_assets (
  id text primary key,
  post_id text not null references public.community_posts(id) on delete cascade,
  drive_file_id text,
  file_name text not null,
  mime_type text,
  asset_type text not null default 'document',
  preview_url text,
  thumbnail_url text,
  file_size bigint,
  sort_order integer not null default 0,
  sync_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_assets_asset_type_check check (asset_type in ('document', 'image', 'video')),
  constraint community_assets_sync_status_check check (sync_status in ('pending', 'ready', 'failed'))
);

create table if not exists public.community_comments (
  id text primary key,
  post_id text not null references public.community_posts(id) on delete cascade,
  employee_id text not null,
  author_name text not null,
  content text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id text not null references public.community_posts(id) on delete cascade,
  employee_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, employee_id)
);

create table if not exists public.guides (
  id text primary key,
  title text not null,
  description text,
  slug text not null unique,
  is_published boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guide_sections (
  id text primary key,
  guide_id text not null references public.guides(id) on delete cascade,
  parent_id text references public.guide_sections(id) on delete cascade,
  title text not null,
  slug text not null,
  markdown_content text not null default '',
  sort_order integer not null default 0,
  depth integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.document_sources (
  id text primary key,
  source_type text not null,
  source_ref text not null,
  title text not null,
  content_text text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  is_indexed boolean not null default false,
  content_hash text,
  last_indexed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_sources_type_check check (source_type in ('guide', 'community_post', 'community_asset'))
);

create table if not exists public.document_chunks (
  id text primary key,
  source_id text not null references public.document_sources(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_settings (
  id text primary key,
  provider text not null default 'openai',
  model text not null default 'gpt-5.4',
  embedding_model text not null default 'text-embedding-3-small',
  retrieval_scope jsonb not null default '["guides","community"]'::jsonb,
  chunk_size integer not null default 800,
  chunk_overlap integer not null default 120,
  system_prompt text,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_query_logs (
  id text primary key,
  employee_id text,
  question text not null,
  answer text,
  model text,
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now(),
  constraint chat_query_logs_status_check check (status in ('success', 'no_context', 'error'))
);

create index if not exists idx_community_posts_published
  on public.community_posts (is_published, updated_at desc);

create index if not exists idx_community_assets_post
  on public.community_assets (post_id, sort_order asc);

create index if not exists idx_community_comments_post
  on public.community_comments (post_id, created_at asc);

create index if not exists idx_community_likes_employee
  on public.community_post_likes (employee_id, created_at desc);

create index if not exists idx_guides_published
  on public.guides (is_published, updated_at desc);

create index if not exists idx_guide_sections_guide
  on public.guide_sections (guide_id, sort_order asc);

create index if not exists idx_document_sources_ref
  on public.document_sources (source_type, source_ref);

create index if not exists idx_document_chunks_source
  on public.document_chunks (source_id, chunk_index asc);

insert into public.chat_settings (id)
values ('default')
on conflict (id) do nothing;

insert into public.admin_settings (key, value)
values
  ('google_drive', '{"enabled":false,"folderId":"","allowedMimeTypes":["application/pdf","image/png","image/jpeg","video/mp4"],"maxFileSizeMb":100,"previewMode":"restricted","credentialConfigured":false,"lastValidatedAt":null,"lastError":null}'::jsonb),
  ('ai_provider', '{"provider":"openai","apiKeyConfigured":false,"model":"gpt-5.4","embeddingModel":"text-embedding-3-small"}'::jsonb)
on conflict (key) do nothing;
