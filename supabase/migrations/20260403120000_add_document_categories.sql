create table if not exists public.guide_categories (
  id text primary key,
  title text not null,
  subtitle text,
  image text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guides
  add column if not exists category_id text references public.guide_categories(id) on delete set null;

create index if not exists idx_guide_categories_created
  on public.guide_categories (created_at asc);

create index if not exists idx_guides_category
  on public.guides (category_id, updated_at desc);
