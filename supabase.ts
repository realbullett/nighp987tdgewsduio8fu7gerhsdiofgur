
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://txpmghnjcaoojmomxhry.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tBAnI45AOKPD3_NpEDqeZw_75uBZxwh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
