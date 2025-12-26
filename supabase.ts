
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ywvuugjhvyuooskaehrc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lXKhuTl9phDTUoc39GkIpw_az63tUKQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
