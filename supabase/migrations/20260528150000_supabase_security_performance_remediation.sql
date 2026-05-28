-- 1. DROP EXISTING CONFLICTING POLICIES TO AVOID MULTIPLE PERMISSIVE POLICIES
drop policy if exists "콘텐츠 조회: 모두" on public.categories;
drop policy if exists "콘텐츠 관리: 관리자" on public.categories;
drop policy if exists "콘텐츠 추가: 관리자" on public.categories;
drop policy if exists "콘텐츠 수정: 관리자" on public.categories;
drop policy if exists "콘텐츠 삭제: 관리자" on public.categories;

drop policy if exists "영상 조회: 모두" on public.videos;
drop policy if exists "영상 관리: 관리자" on public.videos;
drop policy if exists "영상 추가: 관리자" on public.videos;
drop policy if exists "영상 수정: 관리자" on public.videos;
drop policy if exists "영상 삭제: 관리자" on public.videos;

drop policy if exists "가이드 조회: 모두" on public.guides;
drop policy if exists "가이드 관리: 관리자" on public.guides;
drop policy if exists "가이드 추가: 관리자" on public.guides;
drop policy if exists "가이드 수정: 관리자" on public.guides;
drop policy if exists "가이드 삭제: 관리자" on public.guides;

drop policy if exists "가이드 섹션 조회: 모두" on public.guide_sections;
drop policy if exists "가이드 섹션 관리: 관리자" on public.guide_sections;
drop policy if exists "가이드 섹션 추가: 관리자" on public.guide_sections;
drop policy if exists "가이드 섹션 수정: 관리자" on public.guide_sections;
drop policy if exists "가이드 섹션 삭제: 관리자" on public.guide_sections;

drop policy if exists "관리자 조회 허용" on public.admins;
drop policy if exists "관리자 관리 전용" on public.admins;
drop policy if exists "관리자 추가: 관리자" on public.admins;
drop policy if exists "관리자 수정: 관리자" on public.admins;
drop policy if exists "관리자 삭제: 관리자" on public.admins;

drop policy if exists "사용자 조회: 본인 및 관리자" on public.users;
drop policy if exists "사용자 수정: 본인 및 관리자" on public.users;

drop policy if exists "진도율 조회: 본인 및 관리자" on public.user_video_progress;
drop policy if exists "진도율 관리: 본인 및 관리자" on public.user_video_progress;
drop policy if exists "진도율 추가: 본인 및 관리자" on public.user_video_progress;
drop policy if exists "진도율 수정: 본인 및 관리자" on public.user_video_progress;
drop policy if exists "진도율 삭제: 본인 및 관리자" on public.user_video_progress;

drop policy if exists "게시물 조회: 모두" on public.community_posts;
drop policy if exists "게시물 작성: 모두" on public.community_posts;
drop policy if exists "게시물 수정/삭제: 본인 및 관리자" on public.community_posts;
drop policy if exists "게시물 수정: 본인 및 관리자" on public.community_posts;
drop policy if exists "게시물 삭제: 본인 및 관리자" on public.community_posts;

drop policy if exists "댓글 조회: 모두" on public.community_comments;
drop policy if exists "댓글 작성: 모두" on public.community_comments;
drop policy if exists "댓글 수정/삭제: 본인 및 관리자" on public.community_comments;
drop policy if exists "댓글 수정: 본인 및 관리자" on public.community_comments;
drop policy if exists "댓글 삭제: 본인 및 관리자" on public.community_comments;

drop policy if exists "좋아요 조회: 모두" on public.community_post_likes;
drop policy if exists "좋아요 관리: 본인 및 관리자" on public.community_post_likes;
drop policy if exists "좋아요 추가: 본인 및 관리자" on public.community_post_likes;
drop policy if exists "좋아요 삭제: 본인 및 관리자" on public.community_post_likes;

drop policy if exists "출석 로그 조회: 본인 및 관리자" on public.attendance_logs;
drop policy if exists "출석 로그 기록: 본인 및 관리자" on public.attendance_logs;
drop policy if exists "출석 로그 관리: 관리자 전용" on public.attendance_logs;
drop policy if exists "출석 로그 삭제: 관리자 전용" on public.attendance_logs;
drop policy if exists "출석 로그 수정: 관리자 전용" on public.attendance_logs;

drop policy if exists "채팅 로그 조회: 본인 및 관리자" on public.chat_query_logs;
drop policy if exists "채팅기록" on public.chat_query_logs;
drop policy if exists "채팅 로그 조회/기록" on public.chat_query_logs;
drop policy if exists "채팅 로그 조회" on public.chat_query_logs;
drop policy if exists "채팅 로그 기록" on public.chat_query_logs;

drop policy if exists "커뮤니티 파일" on public.community_assets;
drop policy if exists "커뮤니티 파일 조회" on public.community_assets;
drop policy if exists "커뮤니티 파일 관리" on public.community_assets;
drop policy if exists "커뮤니티 파일 추가" on public.community_assets;
drop policy if exists "커뮤니티 파일 수정" on public.community_assets;
drop policy if exists "커뮤니티 파일 삭제" on public.community_assets;

drop policy if exists "문서 청크" on public.document_chunks;
drop policy if exists "문서 청크 조회" on public.document_chunks;
drop policy if exists "문서 청크 관리" on public.document_chunks;
drop policy if exists "문서 청크 추가" on public.document_chunks;
drop policy if exists "문서 청크 수정" on public.document_chunks;
drop policy if exists "문서 청크 삭제" on public.document_chunks;

drop policy if exists "문서 소스" on public.document_sources;
drop policy if exists "문서 소스 조회" on public.document_sources;
drop policy if exists "문서 소스 관리" on public.document_sources;
drop policy if exists "문서 소스 추가" on public.document_sources;
drop policy if exists "문서 소스 수정" on public.document_sources;
drop policy if exists "문서 소스 삭제" on public.document_sources;

drop policy if exists "문서 카테고리" on public.guide_categories;
drop policy if exists "문서 카테고리 조회" on public.guide_categories;
drop policy if exists "문서 카테고리 관리" on public.guide_categories;
drop policy if exists "문서 카테고리 추가" on public.guide_categories;
drop policy if exists "문서 카테고리 수정" on public.guide_categories;
drop policy if exists "문서 카테고리 삭제" on public.guide_categories;

drop policy if exists "개인화 영상 규칙" on public.personalized_recommendation_rules;
drop policy if exists "개인화 영상 규칙 조회" on public.personalized_recommendation_rules;
drop policy if exists "개인화 영상 규칙 관리" on public.personalized_recommendation_rules;
drop policy if exists "개인화 영상 규칙 추가" on public.personalized_recommendation_rules;
drop policy if exists "개인화 영상 규칙 수정" on public.personalized_recommendation_rules;
drop policy if exists "개인화 영상 규칙 삭제" on public.personalized_recommendation_rules;

drop policy if exists "AllTrue" on public.kv_store_a8898ff1;
drop policy if exists "Server-only access" on public.kv_store_a8898ff1;
drop policy if exists "KV 조회: 관리자" on public.kv_store_a8898ff1;
drop policy if exists "KV 추가: 관리자" on public.kv_store_a8898ff1;
drop policy if exists "KV 수정: 관리자" on public.kv_store_a8898ff1;
drop policy if exists "KV 삭제: 관리자" on public.kv_store_a8898ff1;


-- 2. RE-DEFINE SECURITY DEFINER FUNCTIONS WITH EXPLICIT SEARCH_PATH AND ACCESS RESTRICTIONS
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
$$ language plpgsql security definer set search_path = public;

create or replace function public.is_migration_mode(target_mode text)
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_settings 
    where key = 'auth_migration' 
    and value->>'mode' = target_mode
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.get_my_employee_id()
returns text as $$
declare
  _employee_id text;
begin
  -- 1. UUID 매핑 확인
  select employee_id into _employee_id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
  
  return _employee_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.admins
    where auth_user_id = auth.uid()
    and is_active = true
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Revoke execute from public/anon for added security
revoke execute on function public.sync_user_mapping() from public;
revoke execute on function public.is_migration_mode(text) from public;
revoke execute on function public.get_my_employee_id() from public;
revoke execute on function public.is_admin() from public;

-- Grant execution specifically to authenticated users & service role (needed for RLS evaluation)
grant execute on function public.is_migration_mode(text) to authenticated, service_role;
grant execute on function public.get_my_employee_id() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;


-- 3. DEFINE HIGH-PERFORMANCE AND SECURE ROW LEVEL SECURITY POLICIES

-- [users]
create policy "사용자 조회: 본인 및 관리자" on public.users for select to authenticated
  using (is_admin() or auth_user_id = (select auth.uid()));

create policy "사용자 수정: 본인 및 관리자" on public.users for update to authenticated
  using (is_admin() or auth_user_id = (select auth.uid()));

-- [categories]
create policy "콘텐츠 조회: 모두" on public.categories for select to authenticated
  using (true);
create policy "콘텐츠 추가: 관리자" on public.categories for insert to authenticated
  with check (is_admin());
create policy "콘텐츠 수정: 관리자" on public.categories for update to authenticated
  using (is_admin());
create policy "콘텐츠 삭제: 관리자" on public.categories for delete to authenticated
  using (is_admin());

-- [videos]
create policy "영상 조회: 모두" on public.videos for select to authenticated
  using (true);
create policy "영상 추가: 관리자" on public.videos for insert to authenticated
  with check (is_admin());
create policy "영상 수정: 관리자" on public.videos for update to authenticated
  using (is_admin());
create policy "영상 삭제: 관리자" on public.videos for delete to authenticated
  using (is_admin());

-- [user_video_progress]
create policy "진도율 조회: 본인 및 관리자" on public.user_video_progress for select to authenticated
  using (is_admin() or employee_id = (select public.get_my_employee_id()));
create policy "진도율 추가: 본인 및 관리자" on public.user_video_progress for insert to authenticated
  with check (is_admin() or employee_id = (select public.get_my_employee_id()));
create policy "진도율 수정: 본인 및 관리자" on public.user_video_progress for update to authenticated
  using (is_admin() or employee_id = (select public.get_my_employee_id()));
create policy "진도율 삭제: 본인 및 관리자" on public.user_video_progress for delete to authenticated
  using (is_admin() or employee_id = (select public.get_my_employee_id()));

-- [community_posts]
create policy "게시물 조회: 모두" on public.community_posts for select to authenticated
  using (true);
create policy "게시물 작성: 모두" on public.community_posts for insert to authenticated
  with check (true);
create policy "게시물 수정: 본인 및 관리자" on public.community_posts for update to authenticated
  using (is_admin() or author_employee_id = (select public.get_my_employee_id()));
create policy "게시물 삭제: 본인 및 관리자" on public.community_posts for delete to authenticated
  using (is_admin() or author_employee_id = (select public.get_my_employee_id()));

-- [community_comments]
create policy "댓글 조회: 모두" on public.community_comments for select to authenticated
  using (true);
create policy "댓글 작성: 모두" on public.community_comments for insert to authenticated
  with check (true);
create policy "댓글 수정: 본인 및 관리자" on public.community_comments for update to authenticated
  using (is_admin() or employee_id = (select public.get_my_employee_id()));
create policy "댓글 삭제: 본인 및 관리자" on public.community_comments for delete to authenticated
  using (is_admin() or employee_id = (select public.get_my_employee_id()));

-- [community_post_likes]
create policy "좋아요 조회: 모두" on public.community_post_likes for select to authenticated
  using (true);
create policy "좋아요 추가: 본인 및 관리자" on public.community_post_likes for insert to authenticated
  with check (true);
create policy "좋아요 삭제: 본인 및 관리자" on public.community_post_likes for delete to authenticated
  using (is_admin() or employee_id = (select public.get_my_employee_id()));

-- [guides]
create policy "가이드 조회: 모두" on public.guides for select to authenticated
  using (true);
create policy "가이드 추가: 관리자" on public.guides for insert to authenticated
  with check (is_admin());
create policy "가이드 수정: 관리자" on public.guides for update to authenticated
  using (is_admin());
create policy "가이드 삭제: 관리자" on public.guides for delete to authenticated
  using (is_admin());

-- [guide_sections]
create policy "가이드 섹션 조회: 모두" on public.guide_sections for select to authenticated
  using (true);
create policy "가이드 섹션 추가: 관리자" on public.guide_sections for insert to authenticated
  with check (is_admin());
create policy "가이드 섹션 수정: 관리자" on public.guide_sections for update to authenticated
  using (is_admin());
create policy "가이드 섹션 삭제: 관리자" on public.guide_sections for delete to authenticated
  using (is_admin());

-- [attendance_logs]
create policy "출석 로그 조회: 본인 및 관리자" on public.attendance_logs for select to authenticated
  using (is_admin() or employee_id = (select public.get_my_employee_id()));
create policy "출석 로그 기록: 본인 및 관리자" on public.attendance_logs for insert to authenticated
  with check (is_admin() or employee_id = (select public.get_my_employee_id()));
create policy "출석 로그 수정: 관리자 전용" on public.attendance_logs for update to authenticated
  using (is_admin());
create policy "출석 로그 삭제: 관리자 전용" on public.attendance_logs for delete to authenticated
  using (is_admin());

-- [chat_query_logs]
create policy "채팅 로그 조회" on public.chat_query_logs for select to authenticated
  using (is_admin() or employee_id = (select public.get_my_employee_id()));
create policy "채팅 로그 기록" on public.chat_query_logs for insert to authenticated
  with check (is_admin() or employee_id = (select public.get_my_employee_id()));

-- [admins]
create policy "관리자 조회 허용" on public.admins for select to authenticated
  using (true);
create policy "관리자 추가: 관리자" on public.admins for insert to authenticated
  with check (is_admin());
create policy "관리자 수정: 관리자" on public.admins for update to authenticated
  using (is_admin());
create policy "관리자 삭제: 관리자" on public.admins for delete to authenticated
  using (is_admin());

-- [community_assets]
create policy "커뮤니티 파일 조회" on public.community_assets for select to authenticated
  using (true);
create policy "커뮤니티 파일 추가" on public.community_assets for insert to authenticated
  with check (is_admin() or exists (
    select 1 from public.community_posts
    where id = post_id
    and author_employee_id = (select public.get_my_employee_id())
  ));
create policy "커뮤니티 파일 수정" on public.community_assets for update to authenticated
  using (is_admin() or exists (
    select 1 from public.community_posts
    where id = post_id
    and author_employee_id = (select public.get_my_employee_id())
  ));
create policy "커뮤니티 파일 삭제" on public.community_assets for delete to authenticated
  using (is_admin() or exists (
    select 1 from public.community_posts
    where id = post_id
    and author_employee_id = (select public.get_my_employee_id())
  ));

-- [document_chunks]
create policy "문서 청크 조회" on public.document_chunks for select to authenticated
  using (true);
create policy "문서 청크 추가" on public.document_chunks for insert to authenticated
  with check (is_admin());
create policy "문서 청크 수정" on public.document_chunks for update to authenticated
  using (is_admin());
create policy "문서 청크 삭제" on public.document_chunks for delete to authenticated
  using (is_admin());

-- [document_sources]
create policy "문서 소스 조회" on public.document_sources for select to authenticated
  using (true);
create policy "문서 소스 추가" on public.document_sources for insert to authenticated
  with check (is_admin());
create policy "문서 소스 수정" on public.document_sources for update to authenticated
  using (is_admin());
create policy "문서 소스 삭제" on public.document_sources for delete to authenticated
  using (is_admin());

-- [guide_categories]
create policy "문서 카테고리 조회" on public.guide_categories for select to authenticated
  using (true);
create policy "문서 카테고리 추가" on public.guide_categories for insert to authenticated
  with check (is_admin());
create policy "문서 카테고리 수정" on public.guide_categories for update to authenticated
  using (is_admin());
create policy "문서 카테고리 삭제" on public.guide_categories for delete to authenticated
  using (is_admin());

-- [personalized_recommendation_rules]
create policy "개인화 영상 규칙 조회" on public.personalized_recommendation_rules for select to authenticated
  using (true);
create policy "개인화 영상 규칙 추가" on public.personalized_recommendation_rules for insert to authenticated
  with check (is_admin());
create policy "개인화 영상 규칙 수정" on public.personalized_recommendation_rules for update to authenticated
  using (is_admin());
create policy "개인화 영상 규칙 삭제" on public.personalized_recommendation_rules for delete to authenticated
  using (is_admin());

-- [kv_store_a8898ff1]
-- Legacy KV fallback table: Enable RLS but restrict client access entirely. 
-- Service role key queries from server-side code (which bypass RLS) will still function correctly.
create policy "KV 조회: 관리자" on public.kv_store_a8898ff1 for select to authenticated
  using (is_admin());
create policy "KV 추가: 관리자" on public.kv_store_a8898ff1 for insert to authenticated
  with check (is_admin());
create policy "KV 수정: 관리자" on public.kv_store_a8898ff1 for update to authenticated
  using (is_admin());
create policy "KV 삭제: 관리자" on public.kv_store_a8898ff1 for delete to authenticated
  using (is_admin());
