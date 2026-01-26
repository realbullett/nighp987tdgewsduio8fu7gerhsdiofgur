-- Run this script in your Supabase SQL Editor to REMOVE the old access key restriction
-- This fixes the 500 Internal Server Error by removing the trigger that checks for a key.

-- 1. Drop the trigger that runs before user creation
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Drop the function that the trigger used
drop function if exists public.validate_signup_key();

-- 3. (Optional) You can leave the table if you want to keep data, or drop it:
-- drop table if exists public.access_keys;
