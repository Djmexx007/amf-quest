-- ============================================================
-- AMF QUEST — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -------------------------------------------------------
-- BRANCHES
-- -------------------------------------------------------
create table if not exists branches (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  color text not null,
  icon text not null,
  exam_provider text,
  is_active boolean default true,
  unlock_level integer default 1,
  order_index integer default 0,
  created_by uuid,
  created_at timestamptz default now()
);

-- -------------------------------------------------------
-- USERS
-- -------------------------------------------------------
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text,
  full_name text not null,
  role text not null default 'user' check (role in ('god', 'admin', 'moderator', 'user')),
  status text not null default 'pending' check (status in ('active', 'pending', 'suspended', 'banned', 'expired')),
  account_type text default 'permanent' check (account_type in ('permanent', 'temporary')),
  expires_at timestamptz,
  selected_branch_id uuid references branches(id),
  branch_locked boolean default false,
  invited_by uuid references users(id),
  suspension_reason text,
  suspension_ends_at timestamptz,
  ban_reason text,
  notes text,
  last_login_at timestamptz,
  login_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------
-- INVITATIONS
-- -------------------------------------------------------
create table if not exists invitations (
  id uuid primary key default uuid_generate_v4(),
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  email text not null,
  full_name text,
  invited_by uuid references users(id),
  role text default 'user' check (role in ('god', 'admin', 'moderator', 'user')),
  account_type text default 'permanent' check (account_type in ('permanent', 'temporary')),
  account_duration_days integer,
  suggested_branch_id uuid references branches(id),
  status text default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz default now() + interval '72 hours',
  accepted_at timestamptz,
  created_at timestamptz default now()
);

-- -------------------------------------------------------
-- CHARACTERS (one per user per branch)
-- -------------------------------------------------------
create table if not exists characters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  branch_id uuid references branches(id),
  name text not null,
  class_name text default 'Recrue',
  level integer default 1,
  xp bigint default 0,
  xp_to_next_level integer default 500,
  coins integer default 0,
  hp integer default 100,
  hp_max integer default 100,
  mp integer default 100,
  mp_max integer default 100,
  streak_days integer default 0,
  last_activity_date date,
  total_games_played integer default 0,
  total_questions_answered integer default 0,
  total_correct_answers integer default 0,
  avatar_config jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, branch_id)
);

-- -------------------------------------------------------
-- MODULES
-- -------------------------------------------------------
create table if not exists modules (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references branches(id),
  slug text not null,
  title text not null,
  description text,
  icon text default '📚',
  unlock_level integer default 1,
  order_index integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(branch_id, slug)
);

-- -------------------------------------------------------
-- QUESTIONS
-- -------------------------------------------------------
create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid references modules(id),
  branch_id uuid references branches(id),
  question_text text not null,
  context_text text,
  icon text default '❓',
  difficulty integer default 1 check (difficulty in (1, 2, 3)),
  game_types text[] default '{"quiz"}',
  explanation text not null,
  tip text,
  tags text[],
  is_active boolean default true,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- -------------------------------------------------------
-- ANSWERS
-- -------------------------------------------------------
create table if not exists answers (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid references questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean default false,
  order_index integer default 0
);

-- -------------------------------------------------------
-- GAME SESSIONS
-- -------------------------------------------------------
create table if not exists game_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  branch_id uuid references branches(id),
  game_type text not null,
  module_id uuid references modules(id),
  difficulty text,
  score integer default 0,
  xp_earned integer default 0,
  coins_earned integer default 0,
  questions_total integer default 0,
  questions_correct integer default 0,
  best_streak integer default 0,
  avg_time_seconds numeric default 0,
  completed boolean default false,
  metadata jsonb default '{}',
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- -------------------------------------------------------
-- USER MODULE PROGRESS
-- -------------------------------------------------------
create table if not exists user_module_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  branch_id uuid references branches(id),
  module_id uuid references modules(id),
  completion_pct integer default 0,
  questions_answered integer default 0,
  correct_answers integer default 0,
  best_score integer default 0,
  time_spent_seconds integer default 0,
  last_activity_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, branch_id, module_id)
);

-- -------------------------------------------------------
-- DAILY MISSIONS
-- -------------------------------------------------------
create table if not exists daily_missions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  branch_id uuid references branches(id),
  mission_type text not null,
  title text not null,
  description text,
  target_value integer default 1,
  current_value integer default 0,
  xp_reward integer default 100,
  coin_reward integer default 50,
  completed boolean default false,
  mission_date date default current_date,
  completed_at timestamptz,
  unique(user_id, branch_id, mission_type, mission_date)
);

-- -------------------------------------------------------
-- ACHIEVEMENTS
-- -------------------------------------------------------
create table if not exists achievements (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references branches(id),
  slug text not null,
  title text not null,
  description text,
  icon text default '🏆',
  condition_type text not null,
  condition_value integer default 1,
  xp_reward integer default 0,
  coin_reward integer default 0,
  rarity text default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  unique(branch_id, slug)
);

-- -------------------------------------------------------
-- USER ACHIEVEMENTS
-- -------------------------------------------------------
create table if not exists user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  branch_id uuid references branches(id),
  achievement_id uuid references achievements(id),
  unlocked_at timestamptz default now(),
  unique(user_id, branch_id, achievement_id)
);

-- -------------------------------------------------------
-- SHOP ITEMS
-- -------------------------------------------------------
create table if not exists shop_items (
  id uuid primary key default uuid_generate_v4(),
  branch_id uuid references branches(id),
  name text not null,
  description text,
  icon text,
  item_type text check (item_type in ('avatar', 'title', 'boost', 'cosmetic')),
  cost_coins integer default 0,
  effect jsonb,
  rarity text default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- -------------------------------------------------------
-- USER INVENTORY
-- -------------------------------------------------------
create table if not exists user_inventory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  branch_id uuid references branches(id),
  item_id uuid references shop_items(id),
  acquired_at timestamptz default now(),
  is_equipped boolean default false,
  unique(user_id, branch_id, item_id)
);

-- -------------------------------------------------------
-- ADMIN LOGS
-- -------------------------------------------------------
create table if not exists admin_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references users(id),
  action text not null,
  target_user_id uuid references users(id),
  details jsonb default '{}',
  ip_address text,
  created_at timestamptz default now()
);

-- -------------------------------------------------------
-- NOTIFICATIONS
-- -------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info', 'warning', 'success', 'admin')),
  is_read boolean default false,
  sent_by uuid references users(id),
  created_at timestamptz default now()
);

-- -------------------------------------------------------
-- INDEXES (performance)
-- -------------------------------------------------------
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_status on users(status);
create index if not exists idx_users_role on users(role);
create index if not exists idx_invitations_token on invitations(token);
create index if not exists idx_invitations_email on invitations(email);
create index if not exists idx_characters_user_branch on characters(user_id, branch_id);
create index if not exists idx_game_sessions_user_branch on game_sessions(user_id, branch_id);
create index if not exists idx_game_sessions_completed_at on game_sessions(completed_at);
create index if not exists idx_questions_branch on questions(branch_id);
create index if not exists idx_questions_module on questions(module_id);
create index if not exists idx_daily_missions_user_date on daily_missions(user_id, mission_date);
create index if not exists idx_admin_logs_admin on admin_logs(admin_id);
create index if not exists idx_admin_logs_created on admin_logs(created_at desc);
create index if not exists idx_notifications_user_read on notifications(user_id, is_read);

-- -------------------------------------------------------
-- AUTO-UPDATE updated_at trigger
-- -------------------------------------------------------
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger characters_updated_at
  before update on characters
  for each row execute function update_updated_at();

-- -------------------------------------------------------
-- SEED: Initial branches
-- -------------------------------------------------------
insert into branches (slug, name, description, color, icon, exam_provider, order_index)
values
  (
    'assurance',
    'Assurance de Personnes',
    'Prépare l''examen AMF — Assurance vie, invalidité, maladies graves, fonds distincts',
    '#25C292',
    '🛡️',
    'AMF',
    0
  ),
  (
    'fonds-mutuel',
    'Fonds Communs de Placement',
    'Prépare l''examen CSI — Fonds communs, profil investisseur, conformité',
    '#4D8BFF',
    '📈',
    'CSI',
    1
  )
on conflict (slug) do nothing;

-- -------------------------------------------------------
-- pg_cron: expire accounts hourly (enable pg_cron extension in Supabase first)
-- -------------------------------------------------------
-- select cron.schedule(
--   'expire-accounts',
--   '0 * * * *',
--   $$
--     update users
--     set status = 'expired'
--     where account_type = 'temporary'
--       and expires_at < now()
--       and status = 'active';
--   $$
-- );
