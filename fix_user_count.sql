-- Create the profiles table if it doesn't exist (safety check)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  updated_at timestamp with time zone,
  avatar_url text,
  website text
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Create policies

-- 1. Everyone can read profiles (needed for user count)
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select 
  using ( true );

-- 2. Users can insert their own profile
create policy "Users can insert their own profile" 
  on public.profiles for insert 
  with check ( auth.uid() = id );

-- 3. Users can update their own profile
create policy "Users can update own profile" 
  on public.profiles for update 
  using ( auth.uid() = id );
