-- Relational refactor for make-server-a8898ff1
-- Safe to run multiple times.

create table if not exists public.authorized_employees (
  employee_id text primary key,
  name text not null,
  normalized_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  id text primary key,
  name text not null,
  employee_id text not null unique,
  password text not null,
  is_main_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id text primary key,
  employee_id text not null unique,
  name text not null,
  attendance boolean not null default false,
  attendance_dates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  title text not null,
  subtitle text,
  image text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id text primary key,
  category_id text not null references public.categories(id) on delete cascade,
  title text not null,
  description text,
  youtube_id text,
  video_url text,
  video_type text not null default 'youtube',
  duration text,
  thumbnail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint videos_video_type_check check (video_type in ('youtube', 'local'))
);

create table if not exists public.user_video_progress (
  employee_id text not null,
  video_id text not null,
  category_id text,
  progress numeric not null default 0,
  watch_time integer,
  last_watched timestamptz not null default now(),
  user_name text,
  primary key (employee_id, video_id),
  constraint user_video_progress_progress_check check (progress >= 0 and progress <= 100)
);

create table if not exists public.attendance_logs (
  key text primary key,
  employee_id text not null,
  timestamp timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_authorized_employees_active
  on public.authorized_employees (is_active, employee_id);

create index if not exists idx_admins_active
  on public.admins (is_active, employee_id);

create index if not exists idx_users_employee
  on public.users (employee_id);

create index if not exists idx_videos_category
  on public.videos (category_id, created_at desc);

create index if not exists idx_progress_employee
  on public.user_video_progress (employee_id, last_watched desc);

create index if not exists idx_progress_video
  on public.user_video_progress (video_id);

create index if not exists idx_attendance_employee_time
  on public.attendance_logs (employee_id, timestamp desc);
