-- 1. 상위-하위(Parent-Child) 청킹 지원을 위한 parent_content 컬럼 추가
alter table public.document_chunks add column if not exists parent_content text;

-- 2. 카테고리 필터링 및 parent_content 반환이 적용된 match_chunks RPC 함수로 덮어쓰기
create or replace function public.match_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  allowed_source_ids text[],
  filter_category_id text default null
)
returns table (
  id text,
  source_id text,
  content text,
  parent_content text,
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
    dc.parent_content,
    dc.metadata,
    (1 - (dc.embedding <=> query_embedding))::float as score
  from public.document_chunks dc
  where dc.source_id = any(allowed_source_ids)
    and dc.embedding is not null
    and (filter_category_id is null or (dc.metadata->>'categoryId') = filter_category_id)
    and 1 - (dc.embedding <=> query_embedding) >= match_threshold
  order by dc.embedding <=> query_embedding asc
  limit match_count;
end;
$$;
