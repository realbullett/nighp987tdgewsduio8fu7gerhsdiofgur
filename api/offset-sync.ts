const SUPABASE_URL = 'https://txpmghnjcaoojmomxhry.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tBAnI45AOKPD3_NpEDqeZw_75uBZxwh';

const EXTERNAL_OFFSETS_URL = 'https://imtheo.lol/Offsets/Offsets.hpp';

interface ParsedOffsets {
    [namespace: string]: {
        [key: string]: string;
    };
}

// Extract ClientVersion from .hpp file
function extractClientVersion(content: string): string | null {
    const match = content.match(/inline\s+std::string\s+ClientVersion\s*=\s*"([^"]+)"/);
    return match ? match[1] : null;
}

// Parse C++ offsets into JSON structure
function parseOffsetsFromHpp(content: string): ParsedOffsets {
    const offsets: ParsedOffsets = {};
    
    // Match namespace blocks: namespace Name { ... }
    const namespaceRegex = /namespace\s+(\w+)\s*\{([^}]+)\}/g;
    let namespaceMatch;
    
    while ((namespaceMatch = namespaceRegex.exec(content)) !== null) {
        const namespaceName = namespaceMatch[1];
        const namespaceContent = namespaceMatch[2];
        
        // Skip the root Offsets namespace
        if (namespaceName === 'Offsets') continue;
        
        offsets[namespaceName] = {};
        
        // Match offset declarations: inline constexpr uintptr_t Name = 0xHEX;
        const offsetRegex = /inline\s+constexpr\s+uintptr_t\s+(\w+)\s*=\s*(0x[0-9a-fA-F]+)/g;
        let offsetMatch;
        
        while ((offsetMatch = offsetRegex.exec(namespaceContent)) !== null) {
            const offsetName = offsetMatch[1];
            const offsetValue = offsetMatch[2];
            offsets[namespaceName][offsetName] = offsetValue;
        }
    }
    
    return offsets;
}

// Generate random version string
function generateRandomVersion(): string {
    const major = Math.floor(Math.random() * 3) + 1;
    const minor = Math.floor(Math.random() * 10);
    const patch = Math.floor(Math.random() * 10);
    return `${major}.${minor}.${patch}`;
}

export default async function handler(req: any, res: any) {
    // Helper to send JSON response (compatible with both Vercel and Vite)
    const sendJson = (statusCode: number, data: any) => {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    };

    try {
        // Dynamically import Supabase client
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Fetch external offsets file
        const response = await fetch(EXTERNAL_OFFSETS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch external offsets: ${response.statusText}`);
        }
        
        const externalContent = await response.text();
        const externalVersion = extractClientVersion(externalContent);
        
        if (!externalVersion) {
            return sendJson(500, {
                status: 'error',
                message: 'Could not extract ClientVersion from external file'
            });
        }
        
        // Get current roblox_version from our latest release
        const { data: currentRelease, error: releaseError } = await supabase
            .from('releases')
            .select('roblox_version, version, download_url')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (releaseError && releaseError.code !== 'PGRST116') {
            throw releaseError;
        }
        
        const currentVersion = currentRelease?.roblox_version || '';
        
        // Check if versions match
        if (externalVersion === currentVersion) {
            return sendJson(200, {
                status: 'up_to_date',
                message: 'Roblox version matches, no update needed',
                current_version: currentVersion,
                external_version: externalVersion
            });
        }
        
        // Versions don't match - parse and update offsets
        console.log(`Version mismatch detected: ${currentVersion} -> ${externalVersion}`);
        
        const parsedOffsets = parseOffsetsFromHpp(externalContent);
        const offsetsJson = JSON.stringify(parsedOffsets, null, 2);
        
        // Insert new offsets into offsets table
        const { error: offsetsError } = await supabase
            .from('offsets')
            .insert({ content: offsetsJson });
        
        if (offsetsError) {
            throw offsetsError;
        }
        
        // Create new release with random version
        const newVersion = generateRandomVersion();
        const { error: newReleaseError } = await supabase
            .from('releases')
            .insert({
                version: newVersion,
                description: `Auto-updated for Roblox ${externalVersion}`,
                status: 'Undetected',
                changelog: `+ Auto-synced offsets for ${externalVersion}\n+ Updated ${Object.keys(parsedOffsets).length} namespaces\n+ Synced at ${new Date().toLocaleString()}`,
                download_url: currentRelease?.download_url || '',
                roblox_version: externalVersion
            });
        
        if (newReleaseError) {
            throw newReleaseError;
        }
        
        return sendJson(200, {
            status: 'updated',
            message: 'Offsets and release updated successfully',
            old_version: currentVersion,
            new_version: externalVersion,
            release_version: newVersion,
            namespaces_updated: Object.keys(parsedOffsets).length
        });
        
    } catch (error: any) {
        console.error('Offset sync error:', error);
        return sendJson(500, {
            status: 'error',
            message: error.message || 'Unknown error occurred'
        });
    }
}
