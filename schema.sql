-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

create table public.alarms (
  id         bigint  generated always as identity primary key,
  user_id    uuid    references auth.users(id) on delete cascade not null,
  time       text    not null,
  label      text    not null default '',
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.alarms enable row level security;

create policy "Users manage their own alarms"
  on public.alarms for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
