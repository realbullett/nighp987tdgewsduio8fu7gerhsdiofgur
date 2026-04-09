-- 1. Ensure the profiles table exists and has RLS enabled
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  updated_at timestamp with time zone,
  avatar_url text,
  website text
);

alter table public.profiles enable row level security;

-- 2. COMPLETELY RESET policies to ensure 'select' works for everyone
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Public profiles are viewable by everyone" 
  on public.profiles for select 
  using ( true );

create policy "Users can insert their own profile" 
  on public.profiles for insert 
  with check ( auth.uid() = id );

create policy "Users can update own profile" 
  on public.profiles for update 
  using ( auth.uid() = id );

-- 3. CRITICAL FIX: Backfill missing profiles
-- If you created users while the system was broken, they exist in auth.users
-- but NOT in public.profiles. This script inserts them now.
insert into public.profiles (id, username)
select id, email 
from auth.users 
where id not in (select id from public.profiles);
