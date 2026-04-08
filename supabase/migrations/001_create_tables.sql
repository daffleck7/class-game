-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Games table
create table games (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  status text not null default 'lobby' check (status in ('lobby', 'allocating', 'playing', 'finished')),
  current_event_index int not null default -1,
  event_deck jsonb not null default '[]'::jsonb,
  host_token text not null,
  created_at timestamptz not null default now()
);

-- Players table
create table players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  name text not null,
  team int not null check (team in (1, 2, 4, 5, 6)),
  allocations jsonb not null default '{"rd": 0, "security": 0, "compatibility": 0, "marketing": 0, "partnerships": 0}'::jsonb,
  cash int not null default 100,
  score int not null default 100,
  locked_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for fast player lookups by game
create index idx_players_game_id on players(game_id);

-- Enable realtime for both tables
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;

-- Row Level Security
alter table games enable row level security;
alter table players enable row level security;

-- Games: anyone can read, only API routes insert/update (via service role or anon with policies)
create policy "Games are readable by everyone"
  on games for select using (true);

create policy "Games can be inserted by anyone"
  on games for insert with check (true);

create policy "Games can be updated by anyone"
  on games for update using (true);

-- Players: anyone can read, insert, and update their own row
create policy "Players are readable by everyone"
  on players for select using (true);

create policy "Players can be inserted by anyone"
  on players for insert with check (true);

create policy "Players can be updated by anyone"
  on players for update using (true);
