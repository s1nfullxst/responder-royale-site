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
