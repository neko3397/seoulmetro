-- Drop the old, unused overloaded version of match_chunks (without filter_category_id)
drop function if exists public.match_chunks(vector, double precision, integer, text[]);

-- Secure the active match_chunks function's search_path
alter function public.match_chunks(vector, double precision, integer, text[], text) set search_path = public;
