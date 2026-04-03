alter table public.community_assets
  add column if not exists storage_path text;

alter table public.community_posts
  add column if not exists approval_status text not null default 'published';

alter table public.community_posts
  drop constraint if exists community_posts_approval_status_check;

alter table public.community_posts
  add constraint community_posts_approval_status_check
  check (approval_status in ('draft', 'pending_review', 'published', 'rejected'));

create index if not exists idx_community_posts_approval_status
  on public.community_posts (approval_status, updated_at desc);
