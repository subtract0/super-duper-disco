-- Supabase Auth & Multi-Tenancy Schema
-- 1. Users table (auth.users is managed by Supabase Auth)
-- 2. Profiles table (one per user)
create table if not exists profiles (
    id uuid references auth.users not null primary key,
    email text unique,
    full_name text,
    company_id uuid references companies(id),
    role text default 'user',
    created_at timestamptz default now()
);

-- 3. Companies table
create table if not exists companies (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    created_at timestamptz default now()
);

-- 4. RLS Policies
-- Enable RLS
alter table profiles enable row level security;
alter table companies enable row level security;

-- Only allow users to see/update their own profile
create policy "Users can view/update their own profile" on profiles
  for select using (auth.uid() = id)
  with check (auth.uid() = id);

-- Only allow users to see their company
create policy "Users can view their company" on companies
  for select using (id = (select company_id from profiles where id = auth.uid()));

-- Insert policy for company creation
create policy "Anyone can create a company" on companies
  for insert using (true);

-- Insert policy for profile creation
create policy "Anyone can create a profile" on profiles
  for insert using (true);
