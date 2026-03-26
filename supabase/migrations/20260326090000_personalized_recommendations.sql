create table if not exists public.personalized_recommendation_rules (
  id text primary key,
  role text not null,
  career_stage text not null,
  video_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personalized_recommendation_rules_role_check check (role in ('기관사', '차장')),
  constraint personalized_recommendation_rules_career_stage_check check (career_stage in ('신입', '경력')),
  constraint personalized_recommendation_rules_unique_role_stage unique (role, career_stage)
);

create index if not exists idx_personalized_recommendation_rules_role_stage
  on public.personalized_recommendation_rules (role, career_stage);
