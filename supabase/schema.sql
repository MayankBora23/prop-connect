-- RealCRM Supabase schema
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  budget text,
  location text,
  property_type text,
  source text,
  stage text,
  assigned_to text,
  tags text[],
  notes text[],
  created_at date default now(),
  last_contact date
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text,
  bhk text,
  area text,
  price text,
  description text,
  status text,
  images text[],
  created_at date default now()
);

create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  lead_name text,
  property_id uuid references properties(id),
  property_title text,
  date date,
  time text,
  assigned_to text,
  status text,
  feedback text
);

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  lead_name text,
  type text,
  date date,
  time text,
  notes text,
  status text
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  lead_name text,
  phone text,
  content text,
  timestamp timestamptz default now(),
  direction text,
  status text,
  type text,
  meta_message_id text,
  meta_status text,
  meta_error text
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  role text,
  avatar text,
  leads_assigned integer default 0,
  deals_closed integer default 0
);

-- Auth profile (maps to supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text default 'agent',
  full_name text,
  phone text,
  created_at timestamptz default now()
);

-- Notifications for workflows and events
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  title text,
  body text,
  category text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  name text,
  trigger text,
  action text,
  status text,
  last_run text,
  runs_count integer default 0
);

create table if not exists analytics (
  id int primary key default 1,
  total_leads integer,
  new_leads_today integer,
  hot_leads integer,
  closed_won integer,
  closed_lost integer,
  conversion_rate numeric,
  leads_by_source jsonb,
  leads_by_stage jsonb,
  agent_performance jsonb,
  property_interest jsonb
);

