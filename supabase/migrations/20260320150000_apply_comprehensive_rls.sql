-- 1. Helper Function: 현재 사용자가 관리자인지 확인
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.admins
    -- JWT의 user_metadata 안에 있는 employee_id를 확인
    where employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id')
    and is_active = true
  );
end;
$$ language plpgsql security definer;

-- 2. 모든 테이블 RLS 활성화
alter table public.authorized_employees enable row level security;
alter table public.admins enable row level security;
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.videos enable row level security;
alter table public.user_video_progress enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.guides enable row level security;
alter table public.guide_sections enable row level security;
alter table public.admin_settings enable row level security;
alter table public.chat_settings enable row level security;
alter table public.attendance_logs enable row level security;

-- 3. 테이블별 상세 정책 적용

-- [authorized_employees] - 관리자 전용
create policy "관리자 전용 접근" on public.authorized_employees for all using (is_admin());

-- [admins] - 관리자 전용
create policy "관리자 조회 허용" on public.admins for select using (true);
create policy "관리자 관리 전용" on public.admins for all using (is_admin());

-- [users] - 관리자 전권 + 본인 조회/수정
create policy "사용자 조회: 본인 및 관리자" on public.users for select
  using (is_admin() or employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));
create policy "사용자 수정: 본인 및 관리자" on public.users for update
  using (is_admin() or employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));

-- [categories, videos] - 로그인한 모든 사용자 조회 + 관리자 관리
create policy "콘텐츠 조회: 모두" on public.categories for select using (auth.role() = 'authenticated');
create policy "콘텐츠 관리: 관리자" on public.categories for all using (is_admin());

create policy "영상 조회: 모두" on public.videos for select using (auth.role() = 'authenticated');
create policy "영상 관리: 관리자" on public.videos for all using (is_admin());

-- [user_video_progress] - 관리자 전권 + 본인 데이터만
create policy "진도율 조회: 본인 및 관리자" on public.user_video_progress for select
  using (is_admin() or employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));
create policy "진도율 관리: 본인 및 관리자" on public.user_video_progress for all
  using (is_admin() or employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));

-- [community_posts] - 게시물 조회는 모두 + 작성자/관리자만 수정
create policy "게시물 조회: 모두" on public.community_posts for select using (auth.role() = 'authenticated');
create policy "게시물 작성: 모두" on public.community_posts for insert with check (auth.role() = 'authenticated');
create policy "게시물 수정/삭제: 본인 및 관리자" on public.community_posts for all
  using (is_admin() or author_employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));

-- [community_comments] - 댓글 조회 모두 + 작성자/관리자만 수정
create policy "댓글 조회: 모두" on public.community_comments for select using (auth.role() = 'authenticated');
create policy "댓글 작성: 모두" on public.community_comments for insert with check (auth.role() = 'authenticated');
create policy "댓글 수정/삭제: 본인 및 관리자" on public.community_comments for all
  using (is_admin() or employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));

-- [community_post_likes] - 좋아요 조회 모두 + 본인만 삭제
create policy "좋아요 조회: 모두" on public.community_post_likes for select using (auth.role() = 'authenticated');
create policy "좋아요 관리: 본인 및 관리자" on public.community_post_likes for all
  using (is_admin() or employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));

-- [guides, guide_sections] - 가이드북 조회 모두 + 관리자 관리
create policy "가이드 조회: 모두" on public.guides for select using (auth.role() = 'authenticated');
create policy "가이드 관리: 관리자" on public.guides for all using (is_admin());

create policy "가이드 섹션 조회: 모두" on public.guide_sections for select using (auth.role() = 'authenticated');
create policy "가이드 섹션 관리: 관리자" on public.guide_sections for all using (is_admin());

-- [admin_settings, chat_settings] - 관리자 전용
create policy "시스템 설정 관리: 관리자" on public.admin_settings for all using (is_admin());
create policy "채팅 설정 관리: 관리자" on public.chat_settings for all using (is_admin());

-- [attendance_logs] - 출석 기록 보안 강화
-- 조회: 본인 기록만 혹은 관리자 전체
create policy "출석 로그 조회: 본인 및 관리자" on public.attendance_logs for select
  using (is_admin() or employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));

-- 기록: 본인 사번으로만 기록 가능 혹은 관리자가 직접 입력
create policy "출석 로그 기록: 본인 및 관리자" on public.attendance_logs for insert
  with check (is_admin() or employee_id = (auth.jwt() -> 'user_metadata' ->> 'employee_id'));

-- 수정 및 삭제: 오직 관리자만 가능
create policy "출석 로그 관리: 관리자 전용" on public.attendance_logs for update
  using (is_admin());

create policy "출석 로그 삭제: 관리자 전용" on public.attendance_logs for delete
  using (is_admin());
