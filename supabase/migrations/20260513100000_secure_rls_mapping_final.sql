-- 1. 마이그레이션 관리 설정 추가
insert into public.admin_settings (key, value)
values ('auth_migration', '{"mode": "hybrid"}'::jsonb)
on conflict (key) do nothing;

-- 2. 기존 데이터 백필 (metadata 기반으로 auth_user_id 매핑)
update public.users u
set auth_user_id = au.id
from auth.users au
where u.employee_id = (au.raw_user_meta_data ->> 'employee_id')
and u.auth_user_id is null;

update public.admins a
set auth_user_id = au.id
from auth.users au
where a.employee_id = (au.raw_user_meta_data ->> 'employee_id')
and a.auth_user_id is null;

-- 3. 자동 매핑 트리거 함수
create or replace function public.sync_user_mapping()
returns trigger as $$
begin
  update public.users
  set auth_user_id = new.id,
      updated_at = now()
  where employee_id = (new.raw_user_meta_data ->> 'employee_id');

  update public.admins
  set auth_user_id = new.id,
      updated_at = now()
  where employee_id = (new.raw_user_meta_data ->> 'employee_id');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync
  after insert or update of raw_user_meta_data on auth.users
  for each row execute procedure public.sync_user_mapping();

-- 4. 조건부 보안 함수 고도화 (Hybrid 모드 지원)
create or replace function public.is_migration_mode(target_mode text)
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_settings 
    where key = 'auth_migration' 
    and value->>'mode' = target_mode
  );
end;
$$ language plpgsql security definer;

create or replace function public.get_my_employee_id()
returns text as $$
declare
  _employee_id text;
begin
  -- 1. 신규 방식 (UUID 매핑) 확인
  select employee_id into _employee_id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
  
  -- 2. 하이브리드 모드이고 UUID 매핑이 없으면 기존 메타데이터 참조
  if _employee_id is null and public.is_migration_mode('hybrid') then
    _employee_id := (auth.jwt() -> 'user_metadata' ->> 'employee_id');
  end if;
  
  return _employee_id;
end;
$$ language plpgsql security definer;

create or replace function public.is_admin()
returns boolean as $$
begin
  -- 1. 신규 방식 (UUID 매핑) 확인
  if exists (
    select 1 from public.admins
    where auth_user_id = auth.uid()
    and is_active = true
  ) then
    return true;
  end if;

  -- 2. 하이브리드 모드이면 기존 메타데이터 참조
  if public.is_migration_mode('hybrid') then
    return exists (
      select 1 from public.admins
      where employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id')
      and is_active = true
    );
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- 5. 주요 테이블 RLS 정책 전면 갱신 (Conditional Logic 적용)

-- [users]
drop policy if exists "사용자 조회: 본인 및 관리자" on public.users;
create policy "사용자 조회: 본인 및 관리자" on public.users for select
  using (
    is_admin() 
    or auth_user_id = auth.uid()
    or (public.is_migration_mode('hybrid') and employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'))
  );

drop policy if exists "사용자 수정: 본인 및 관리자" on public.users;
create policy "사용자 수정: 본인 및 관리자" on public.users for update
  using (
    is_admin() 
    or auth_user_id = auth.uid()
    or (public.is_migration_mode('hybrid') and employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'))
  );

-- [user_video_progress]
drop policy if exists "진도율 조회: 본인 및 관리자" on public.user_video_progress;
create policy "진도율 조회: 본인 및 관리자" on public.user_video_progress for select
  using (is_admin() or employee_id = public.get_my_employee_id());

drop policy if exists "진도율 관리: 본인 및 관리자" on public.user_video_progress;
create policy "진도율 관리: 본인 및 관리자" on public.user_video_progress for all
  using (is_admin() or employee_id = public.get_my_employee_id());

-- [community_posts]
drop policy if exists "게시물 수정/삭제: 본인 및 관리자" on public.community_posts;
create policy "게시물 수정/삭제: 본인 및 관리자" on public.community_posts for all
  using (is_admin() or author_employee_id = public.get_my_employee_id());

-- [community_comments]
drop policy if exists "댓글 수정/삭제: 본인 및 관리자" on public.community_comments;
create policy "댓글 수정/삭제: 본인 및 관리자" on public.community_comments for all
  using (is_admin() or employee_id = public.get_my_employee_id());

-- [community_post_likes]
drop policy if exists "좋아요 관리: 본인 및 관리자" on public.community_post_likes;
create policy "좋아요 관리: 본인 및 관리자" on public.community_post_likes for all
  using (is_admin() or employee_id = public.get_my_employee_id());

-- [attendance_logs]
drop policy if exists "출석 로그 조회: 본인 및 관리자" on public.attendance_logs;
create policy "출석 로그 조회: 본인 및 관리자" on public.attendance_logs for select
  using (is_admin() or employee_id = public.get_my_employee_id());

drop policy if exists "출석 로그 기록: 본인 및 관리자" on public.attendance_logs;
create policy "출석 로그 기록: 본인 및 관리자" on public.attendance_logs for insert
  with check (is_admin() or employee_id = public.get_my_employee_id());

-- [chat_query_logs]
drop policy if exists "채팅 로그 조회: 본인 및 관리자" on public.chat_query_logs;
create policy "채팅 로그 조회: 본인 및 관리자" on public.chat_query_logs for select
  using (is_admin() or employee_id = public.get_my_employee_id());

-- 6. 보안 검사 완료 (Hybrid 모드 활성화)
-- 이제 admin_settings의 auth_migration 모드를 'secure'로 바꾸기 전까지는 
-- 기존 사번 기반과 신규 UUID 기반 인증을 모두 지원합니다.
