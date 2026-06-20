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
