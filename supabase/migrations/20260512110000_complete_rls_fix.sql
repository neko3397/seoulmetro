-- 1. RLS 활성화 (누락된 테이블들)
alter table public.community_assets enable row level security;
alter table public.document_sources enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chat_query_logs enable row level security;
alter table public.personalized_recommendation_rules enable row level security;
alter table public.guide_categories enable row level security;

-- 상세 정책은 20260513 마이그레이션에서 통합 관리됩니다.
