create extension if not exists "pgcrypto";

create table if not exists public.mailbox_questions (
  id uuid primary key default gen_random_uuid(),
  author text not null default '匿名同学',
  text text not null default '',
  image text not null default '',
  comments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mailbox_questions enable row level security;

drop policy if exists "Anyone can read mailbox questions" on public.mailbox_questions;
create policy "Anyone can read mailbox questions"
on public.mailbox_questions
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can create mailbox questions" on public.mailbox_questions;
create policy "Anyone can create mailbox questions"
on public.mailbox_questions
for insert
to anon, authenticated
with check (true);

create or replace function public.add_mailbox_comment(
  question_id uuid,
  comment_author text,
  comment_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mailbox_questions
  set comments = comments || jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'author', left(coalesce(nullif(trim(comment_author), ''), '匿名同学'), 30),
      'text', left(coalesce(trim(comment_text), ''), 160),
      'createdAt', floor(extract(epoch from now()) * 1000)
    )
  )
  where id = question_id
    and coalesce(trim(comment_text), '') <> '';
end;
$$;

create or replace function public.delete_mailbox_question(
  question_id uuid,
  admin_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if admin_key <> '102938' then
    raise exception '密钥不正确';
  end if;

  delete from public.mailbox_questions
  where id = question_id;
end;
$$;

grant execute on function public.add_mailbox_comment(uuid, text, text) to anon, authenticated;
grant execute on function public.delete_mailbox_question(uuid, text) to anon, authenticated;
