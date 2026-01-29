
import React, { useState, useEffect } from 'react';
import {
  Download,
  Terminal,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Monitor,
  MessageSquare,
  Upload,
  Link,
  Edit3,
  Users
} from 'lucide-react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

const LOGO_URL = "https://64.media.tumblr.com/7ee65927e0b5b02e9cc7bf3b203621b0/27a3cd586cd5f69d-74/s500x750/51363d03483f52995b94f2eaff0aee0e00dff5ba.pnj";
const DISCORD_URL = "https://discord.gg/aQ2FBcJfqP";

interface Release {
  version: string;
  description: string;
  changelog: string;
  download_url: string;
  created_at: string;
  status?: string;
  roblox_version?: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const isAdmin = user.email === 'act@glycon.internal' || user.email?.startsWith('act@');

  const [release, setRelease] = useState<Release | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [discordJoined, setDiscordJoined] = useState<boolean>(() => {
    return localStorage.getItem('glycon_discord_joined') === 'true';
  });

  // Admin Form states
  const [v, setV] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState('Undetected');
  const [log, setLog] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [useExternalLink, setUseExternalLink] = useState(true);
  const [rv, setRv] = useState('');
  const [webhook, setWebhook] = useState(localStorage.getItem('glycon_webhook') || '');
  const [discordJson, setDiscordJson] = useState(JSON.stringify({
    "content": "@everyone",
    "embeds": [{
      "title": "😎 [Glycon: Update] · {version}",
      "description": "**{date}**\n• Status: **{status}**",
      "color": 11031031,
      "fields": [{ "name": "CHANGELOG", "value": "```ini\n{changelogs}\n```" }]
    }],
    "username": "Glycon Updates"
  }, null, 2));

  useEffect(() => {
    fetchLatestRelease();
    fetchUserCount();
  }, []);

  const fetchUserCount = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (!error) {
        setUserCount(count);
      }
    } catch (err) {
      console.warn("Could not fetch user count:", err);
    }
  };

  const handleJoinDiscord = () => {
    window.open(DISCORD_URL, '_blank');
    localStorage.setItem('glycon_discord_joined', 'true');
    setDiscordJoined(true);
  };

  const fetchLatestRelease = async () => {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setRelease(data);
        // Pre-fill admin form
        setV(data.version);
        setDesc(data.description);
        setStatus(data.status || 'Undetected');
        setLog(data.changelog);
        setExternalUrl(data.download_url);
        setRv(data.roblox_version || '');
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalUpdate = async () => {
    if (!isAdmin) return;
    setUploadProgress(true);
    try {
      let finalDownloadUrl = externalUrl;

      if (!useExternalLink && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `glycon_${v}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('release-files').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('release-files').getPublicUrl(fileName);
        finalDownloadUrl = publicUrl;
      }

      const { error: dbError } = await supabase.from('releases').insert({
        version: v,
        description: desc,
        status: status,
        changelog: log,
        download_url: finalDownloadUrl,
        roblox_version: rv
      });
      if (dbError) throw dbError;

      alert("Released successfully.");
      setIsEditing(false);
      fetchLatestRelease();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUploadProgress(false);
    }
  };

  // Simplified Discord Publish
  const handleDiscordPublish = async () => {
    if (!webhook) return alert("Webhook URL needed");
    localStorage.setItem('glycon_webhook', webhook);
    try {
      // Escape special characters in changelog for JSON
      const escapedLog = log
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');

      const escapedDesc = desc
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');

      const payload = JSON.parse(discordJson
        .replace(/{version}/g, v)
        .replace(/{status}/g, status)
        .replace(/{changelogs}/g, escapedLog)
        .replace(/{date}/g, new Date().toLocaleDateString()));

      await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      alert("Sent to Discord.");
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 rounded-full animate-spin border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] font-sans selection:bg-purple-500/30 selection:text-purple-200 p-6 md:p-12 flex flex-col items-center">

      {/* Top Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain hover:scale-110 transition-transform" />
          <span className="font-bold text-lg tracking-wide hidden sm:block text-slate-200">Glycon</span>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <button onClick={() => setIsEditing(!isEditing)} className="text-xs font-mono text-purple-400 hover:text-purple-300">
              {isEditing ? '[CLOSE ADMIN]' : '[ADMIN]'}
            </button>
          )}
          <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#1f1f1f] px-4 py-2 rounded-full hidden md:flex">
            <Users size={14} className="text-purple-400" />
            <span className="text-xs font-mono text-slate-400">Users: {userCount ?? 0}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#1f1f1f] px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
            <span className="text-xs font-mono text-slate-400">{user.email?.split('@')[0]}</span>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {isEditing && isAdmin ? (
        <div className="w-full max-w-2xl bg-[#0a0a0a] border border-[#1f1f1f] p-8 rounded-2xl animate-in zoom-in-95 duration-300 mb-12">
          <h2 className="text-xl font-bold mb-6 text-purple-400">Admin Control</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <input value={v} onChange={e => setV(e.target.value)} placeholder="Version (e.g. 2.5)" className="bg-[#050505] border border-[#222] p-3 rounded-lg text-sm w-full outline-none focus:border-purple-500" />
              <input value={rv} onChange={e => setRv(e.target.value)} placeholder="Roblox Version" className="bg-[#050505] border border-[#222] p-3 rounded-lg text-sm w-full outline-none focus:border-purple-500" />
              <select value={status} onChange={e => setStatus(e.target.value)} className="bg-[#050505] border border-[#222] p-3 rounded-lg text-sm w-full outline-none focus:border-purple-500">
                <option>Undetected</option><option>Patched</option><option>Maintenance</option>
              </select>
            </div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." className="bg-[#050505] border border-[#222] p-3 rounded-lg text-sm w-full h-20 outline-none focus:border-purple-500" />
            <textarea value={log} onChange={e => setLog(e.target.value)} placeholder="Changelog..." className="font-mono bg-[#050505] border border-[#222] p-3 rounded-lg text-sm w-full h-32 outline-none focus:border-purple-500" />

            <div className="flex gap-2">
              <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="Download URL" className="bg-[#050505] border border-[#222] p-3 rounded-lg text-sm w-full outline-none focus:border-purple-500" />
              <button onClick={handleGlobalUpdate} disabled={uploadProgress} className="bg-purple-600 hover:bg-purple-500 px-6 rounded-lg font-bold text-sm disabled:opacity-50">
                {uploadProgress ? '...' : 'Deploy'}
              </button>
            </div>

            <div className="pt-4 border-t border-[#1f1f1f]">
              <h3 className="text-sm font-bold text-purple-400 mb-2">Offset Updater</h3>
              <textarea
                placeholder="Paste offsets here..."
                className="font-mono bg-[#050505] border border-[#222] p-3 rounded-lg text-sm w-full h-32 outline-none focus:border-purple-500 mb-2"
                onChange={async (e) => {
                  // This is just a local state for the textarea, we need a button to save
                }}
                id="offset-input"
              />
              onClick={async () => {
                const content = (document.getElementById('offset-input') as HTMLTextAreaElement).value;
                if (!content) return alert("Please enter content");
                const { error } = await supabase.from('offsets').insert({ content });
                if (error) alert("Error saving offsets: " + error.message);
                else {
                  const link = window.location.origin + '/offsets';
                  const elem = document.getElementById('offsets-link-display');
                  if (elem) elem.innerHTML = `<a href="${link}" target="_blank" class="text-purple-400 underline">${link}</a>`;
                  alert("Offsets updated successfully!");
                }
              }}
              className="bg-purple-900/50 hover:bg-purple-900/80 text-purple-200 px-4 py-2 rounded-lg text-xs font-bold w-full"
              >
              Update Offsets
            </button>
            <div id="offsets-link-display" className="mt-2 text-xs text-center font-mono"></div>
          </div>

          <div className="pt-4 border-t border-[#1f1f1f]">
            <input value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="Discord Webhook" type="password" className="bg-[#050505] border border-[#222] p-2 rounded-lg text-xs w-full mb-2" />
            <button onClick={handleDiscordPublish} className="text-xs text-purple-400 hover:text-white">Run Webhook Test</button>
          </div>
        </div>
        </div>
  ) : (
    <div className="w-full max-w-2xl text-center space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/10 border border-purple-500/20 text-purple-400 text-xs font-semibold tracking-wider">
          <ShieldCheck size={12} />
          {release?.status || 'UNDETECTED'}
        </div>
        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
          Glycon v{release?.version || '1.0'}
        </h1>
        <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
          {release?.description || "There's no new release yet, please wait!"}
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        {discordJoined ? (
          <a
            href={release?.download_url || '#'}
            target="_blank"
            className="group relative px-8 py-4 bg-white text-black rounded-lg font-bold hover:bg-purple-500 hover:text-white transition-all duration-300 flex items-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
          >
            <Download size={18} />
            <span>Download Loader</span>
          </a>
        ) : (
          <button
            onClick={handleJoinDiscord}
            className="px-8 py-4 bg-[#0a0a0a] border border-[#1f1f1f] text-slate-400 rounded-lg font-bold hover:text-white hover:border-purple-500/50 transition-all flex items-center gap-3"
          >
            <MessageSquare size={18} />
            <span>Unlock Download</span>
          </button>
        )}
      </div>

      <div className="pt-12 border-t border-[#1f1f1f] text-left">
        <div className="flex items-center gap-2 text-slate-500 mb-6">
          <span className="text-xs font-mono uppercase tracking-widest">Latest Changelog</span>
        </div>
        <div className="font-mono text-sm text-slate-400 space-y-2 bg-[#0a0a0a] p-6 rounded-xl border border-[#1f1f1f]">
          {release?.changelog ? release.changelog.split('\n').map((line, i) => (
            <div key={i} className={line.includes('+') ? 'text-green-400' : line.includes('-') ? 'text-red-400' : 'text-slate-400'}>
              {line}
            </div>
          )) : (
            <span className="text-slate-600 italic">No logs available...</span>
          )}
        </div>
      </div>

    </div>
  )
}
    </div >
  );
};

export default Dashboard;
