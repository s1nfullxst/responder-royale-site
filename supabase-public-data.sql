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

-- Private staff review access. Staff membership is tied to the authenticated
-- Supabase user, never to a value supplied by the browser.
create table if not exists public.staff_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reviewer' check (role in ('owner','admin','reviewer')),
  created_at timestamptz not null default now()
);

alter table public.tester_applications add column if not exists reviewed_at timestamptz;
alter table public.tester_applications add column if not exists reviewed_by uuid references auth.users(id);
alter table public.tester_applications add column if not exists notification_sent_at timestamptz;
alter table public.staff_reviewers enable row level security;

create or replace function public.is_staff(check_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists(select 1 from public.staff_reviewers where user_id = check_user); $$;

revoke all on function public.is_staff(uuid) from public;
grant execute on function public.is_staff(uuid) to authenticated;

drop policy if exists "Staff read own reviewer record" on public.staff_reviewers;
create policy "Staff read own reviewer record" on public.staff_reviewers
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Staff read tester applications" on public.tester_applications;
create policy "Staff read tester applications" on public.tester_applications
  for select to authenticated using (public.is_staff(auth.uid()));
drop policy if exists "Staff review tester applications" on public.tester_applications;
create policy "Staff review tester applications" on public.tester_applications
  for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

grant select on public.staff_reviewers to authenticated;

-- Register the bot owner as a reviewer after they have logged in with Discord.
insert into public.staff_reviewers (user_id, role)
select id, 'owner'
from auth.users
where raw_user_meta_data->>'provider_id' = '1199709751240577066'
   or raw_user_meta_data->>'sub' = '1199709751240577066'
on conflict (user_id) do update set role = excluded.role;

create or replace function public.protect_tester_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff(auth.uid()) then
    new.status := case when tg_op = 'INSERT' then 'pending' else old.status end;
    new.reviewed_at := case when tg_op = 'INSERT' then null else old.reviewed_at end;
    new.reviewed_by := case when tg_op = 'INSERT' then null else old.reviewed_by end;
    new.notification_sent_at := case when tg_op = 'INSERT' then null else old.notification_sent_at end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_tester_review_fields on public.tester_applications;
create trigger protect_tester_review_fields
before insert or update on public.tester_applications
for each row execute function public.protect_tester_review_fields();
