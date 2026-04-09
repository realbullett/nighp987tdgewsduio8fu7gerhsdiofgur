import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://txpmghnjcaoojmomxhry.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tBAnI45AOKPD3_NpEDqeZw_75uBZxwh';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: any, res: any) {
    try {
        // Fetch the latest release from Supabase
        const { data, error } = await supabase
            .from('releases')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            // Fallback if DB fails
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch status',
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                status: 'unknown',
                message: 'No release data found'
            });
        }

        const responsePayload = {
            status: data.status || 'Undetected',
            version: data.version || '0.0.0',
            last_updated: data.created_at,
            deployment_uptime: process.uptime(),
            service_name: 'Glycon - #1 FREE Roblox External',
            motd: data.description || '',
            roblox_version: data.roblox_version || 'Unknown',
            changelogs: data.changelog || ''
        };

        res.status(200).json(responsePayload);

    } catch (e: any) {
        console.error('API Error:', e);
        res.status(500).json({ status: 'error', message: e.message });
    }
}
