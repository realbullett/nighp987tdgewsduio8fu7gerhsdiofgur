import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://txpmghnjcaoojmomxhry.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tBAnI45AOKPD3_NpEDqeZw_75uBZxwh';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: any, res: any) {
    try {
        const { data, error } = await supabase
            .from('offsets')
            .select('content')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to fetch offsets',
                error: error.message
            });
        }

        if (!data) {
            return res.status(404).json({
                status: 'error',
                message: 'No offset data found'
            });
        }

        // Try to parse the content as JSON to return a "real" JSON response
        try {
            const jsonContent = JSON.parse(data.content);
            return res.setHeader('Content-Type', 'application/json').status(200).send(JSON.stringify(jsonContent, null, 2));
        } catch (parseError) {
            // If it's not valid JSON, we still return it but it might be treated as a string
            // "Not faking it" suggests the user expects it to be valid JSON.
            // If they paste raw text, we return it as is but set content-type to json.
            return res.setHeader('Content-Type', 'application/json').status(200).send(data.content);
        }

    } catch (e: any) {
        console.error('API Error:', e);
        res.status(500).json({ status: 'error', message: e.message });
    }
}
