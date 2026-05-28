alter table public.chat_query_logs
  add column if not exists failure_stage text,
  add column if not exists diagnostics jsonb not null default '{}'::jsonb;

alter table public.chat_query_logs
  drop constraint if exists chat_query_logs_failure_stage_check;

alter table public.chat_query_logs
  add constraint chat_query_logs_failure_stage_check
  check (failure_stage in ('retrieval', 'generation') or failure_stage is null);
