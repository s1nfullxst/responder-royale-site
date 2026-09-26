-- Responder Royale public website contract.
-- Run once in Supabase SQL Editor. The bot writes with the service-role key;
-- browsers can only read the deliberately public fields below.
create table if not exists public.public_vehicles (
  vehicle_key text primary key,
  name text not null,
  country text not null,
  vehicle_type text not null,
  rarity text not null check (rarity in ('Common','Rare','Epic','Legendary','Mythic','Secret')),
  emoji text default '🚒',
  updated_at timestamptz not null default now()
);

create table if not exists public.public_leaderboard (
  public_id text primary key,
  display_name text not null,
  points bigint not null default 0,
  streak integer not null default 0,
  level integer not null default 1,
  vehicles_collected integer not null default 0,
  achievements integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.public_vehicles enable row level security;
alter table public.public_leaderboard enable row level security;

drop policy if exists "Public vehicle catalogue" on public.public_vehicles;
create policy "Public vehicle catalogue" on public.public_vehicles for select to anon, authenticated using (true);
drop policy if exists "Public leaderboard" on public.public_leaderboard;
create policy "Public leaderboard" on public.public_leaderboard for select to anon, authenticated using (true);

revoke insert, update, delete on public.public_vehicles from anon, authenticated;
revoke insert, update, delete on public.public_leaderboard from anon, authenticated;
grant select on public.public_vehicles to anon, authenticated;
grant select on public.public_leaderboard to anon, authenticated;

create index if not exists public_vehicles_rarity_idx on public.public_vehicles (rarity);
create index if not exists public_leaderboard_points_idx on public.public_leaderboard (points desc);
create index if not exists public_leaderboard_streak_idx on public.public_leaderboard (streak desc);

create table if not exists public.public_activity (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  activity_type text not null default 'game',
  created_at timestamptz not null default now()
);

create table if not exists public.public_servers (
  guild_id text primary key,
  name text not null,
  description text default '',
  member_count integer not null default 0,
  featured boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.tester_applications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discord_name text not null,
  timezone text not null,
  availability text not null,
  experience text not null,
  motivation text not null,
  report_example text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  details text not null,
  status text not null default 'open' check (status in ('open','reviewing','closed')),
  created_at timestamptz not null default now()
);

alter table public.public_activity enable row level security;
alter table public.public_servers enable row level security;
alter table public.tester_applications enable row level security;
alter table public.community_feedback enable row level security;

drop policy if exists "Public activity feed" on public.public_activity;
create policy "Public activity feed" on public.public_activity for select to anon, authenticated using (true);
drop policy if exists "Public featured servers" on public.public_servers;
create policy "Public featured servers" on public.public_servers for select to anon, authenticated using (featured = true);
drop policy if exists "Users submit own tester application" on public.tester_applications;
create policy "Users submit own tester application" on public.tester_applications for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own tester application" on public.tester_applications;
create policy "Users update own tester application" on public.tester_applications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users read own tester application" on public.tester_applications;
create policy "Users read own tester application" on public.tester_applications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users submit feedback" on public.community_feedback;
create policy "Users submit feedback" on public.community_feedback for insert to authenticated with check (auth.uid() = user_id);

grant select on public.public_activity, public.public_servers to anon, authenticated;
grant select, insert, update on public.tester_applications to authenticated;
grant insert on public.community_feedback to authenticated;
revoke insert, update, delete on public.public_activity, public.public_servers from anon, authenticated;

create index if not exists public_activity_created_idx on public.public_activity (created_at desc);
create index if not exists public_servers_featured_idx on public.public_servers (featured, member_count desc);
create index if not exists tester_applications_status_idx on public.tester_applications (status, created_at desc);
create index if not exists community_feedback_status_idx on public.community_feedback (status, created_at desc);
