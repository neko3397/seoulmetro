alter table public.chat_settings
  add column if not exists daily_question_limit integer not null default 20;

alter table public.chat_settings
  alter column model set default 'gpt-5.4-mini',
  alter column retrieval_scope set default '["guides","notices"]'::jsonb,
  alter column daily_question_limit set default 20;

update public.chat_settings
set
  model = coalesce(nullif(model, ''), 'gpt-5.4-mini'),
  retrieval_scope = case
    when retrieval_scope is null or retrieval_scope = '[]'::jsonb then '["guides","notices"]'::jsonb
    else retrieval_scope
  end,
  daily_question_limit = coalesce(daily_question_limit, 20),
  updated_at = now()
where id = 'default';

alter table public.chat_query_logs
  drop constraint if exists chat_query_logs_status_check;

alter table public.chat_query_logs
  add constraint chat_query_logs_status_check
  check (status in ('success', 'no_context', 'disabled', 'rate_limited', 'error'));
