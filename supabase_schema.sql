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

-- 5. Messages table for comms-agent (text, images, voice (transcription), documents <25MB)
create table if not exists messages (
    id uuid primary key default uuid_generate_v4(),
    user_id text not null,
    message_type text not null,      -- 'text', 'image', 'voice', 'document'
    content text,                    -- text, transcription, or file URL
    file_name text,                  -- original file name (if applicable)
    file_size bigint,                -- file size in bytes (if applicable)
    mime_type text,                  -- MIME type (if applicable)
    telegram_message_id bigint,      -- optional: for referencing the original Telegram message
    created_at timestamptz default now(),
    role text not null               -- 'user' or 'agent'
);

-- Enable RLS for messages
alter table messages enable row level security;

-- Only allow users to see their own messages
create policy "Users can view their own messages" on messages
  for select using (user_id = auth.uid());

-- Only allow users to insert their own messages
create policy "Users can insert their own messages" on messages
  for insert using (user_id = auth.uid());
