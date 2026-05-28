-- 1. pgvector 확장 활성화
create extension if not exists vector;

-- 2.기존 jsonb embedding 컬럼 삭제 후 vector(1536) 타입으로 재생성 (OpenAI text-embedding-3-small 등 1536차원 최적화)
alter table public.document_chunks drop column if exists embedding;
alter table public.document_chunks add column embedding vector(1536);

-- 3. 코사인 유사도 연산 최적화를 위한 HNSW 인덱스 구축
create index if not exists idx_document_chunks_embedding_hnsw
  on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

-- 4. 데이터베이스 수준에서 유사도 연산을 수행하고 결과를 돌려주는 RPC 함수(match_chunks) 정의
create or replace function public.match_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  allowed_source_ids text[]
)
returns table (
  id text,
  source_id text,
  content text,
  metadata jsonb,
  score float
)
language plpgsql
stable
as $$
begin
  return query
  select
    dc.id,
    dc.source_id,
    dc.content,
    dc.metadata,
    (1 - (dc.embedding <=> query_embedding))::float as score
  from public.document_chunks dc
  where dc.source_id = any(allowed_source_ids)
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) >= match_threshold
  order by dc.embedding <=> query_embedding asc
  limit match_count;
end;
$$;
