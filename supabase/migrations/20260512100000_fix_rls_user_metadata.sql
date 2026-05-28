-- 1. 매핑 컬럼 추가
alter table public.users add column if not exists auth_user_id uuid;
alter table public.admins add column if not exists auth_user_id uuid;

create index if not exists idx_users_auth_user_id on public.users(auth_user_id);
create index if not exists idx_admins_auth_user_id on public.admins(auth_user_id);

-- 나머지 로직은 20260513 마이그레이션에서 통합 관리됩니다.
