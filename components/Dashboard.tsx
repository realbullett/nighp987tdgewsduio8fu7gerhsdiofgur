
import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Terminal,
  Bug,
  Upload,
  Edit3,
  ShieldCheck,
  Globe,
  Link,
  Database,
  LogOut,
  Cpu,
  ShieldAlert,
  Activity,
  Layers,
  CheckCircle2,
  Calendar,
  Settings,
  Monitor,
  Users,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

const LOGO_URL = "https://media.discordapp.net/attachments/1324825706303197357/1453312744907477025/fav.png?ex=69504a37&is=694ef8b7&hm=75495ec0b3d3e9caf20d93f015613558ee165ea98d72e4ae1049f0dcba0505cf&=&format=webp&quality=lossless&width=375&height=375";
const DISCORD_URL = "https://discord.gg/aQ2FBcJfqP";

interface Release {
  version: string;
  description: string;
  changelog: string;
  download_url: string;
  created_at: string;
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
  const [tableMissing, setTableMissing] = useState(false);
  const [discordJoined, setDiscordJoined] = useState<boolean>(() => {
    return localStorage.getItem('glycon_discord_joined') === 'true';
  });

  // Form states
  const [v, setV] = useState('');
  const [desc, setDesc] = useState('');
  const [log, setLog] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [useExternalLink, setUseExternalLink] = useState(true);
  const [rv, setRv] = useState('');
  const [webhook, setWebhook] = useState(localStorage.getItem('glycon_webhook') || '');
  const [discordJson, setDiscordJson] = useState(JSON.stringify({
    "content": null,
    "embeds": [
      {
        "title": "😎 [Glycon: Update] · {version} 🟦",
        "description": "@Updates @Glycon\n\n**{date}**\n• Compatible with deployed **{roblox-version}**",
        "color": 2829617,
        "fields": [
          {
            "name": "CHANGELOG",
            "value": "```ini\n{changelogs}\n\ninstall update from https://glycon.vercel.app\n```"
          }
        ]
      }
    ],
    "attachments": []
  }, null, 2));

  useEffect(() => {
    fetchLatestRelease();
    fetchUserCount();
  }, []);

  const handleJoinDiscord = () => {
    window.open(DISCORD_URL, '_blank');
    localStorage.setItem('glycon_discord_joined', 'true');
    setDiscordJoined(true);
  };

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

  const fetchLatestRelease = async () => {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setTableMissing(false);
        } else if (error.message.includes('not found') || error.code === '42P01') {
          setTableMissing(true);
        }
      } else if (data) {
        setRelease(data);
        setV(data.version);
        setDesc(data.description);
        setLog(data.changelog);
        setExternalUrl(data.download_url);
      }
    } catch (err) {
      console.error("Setup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalUpdate = async () => {
    if (!isAdmin) return;
    if (!v) {
      alert("Version is required.");
      return;
    }

    setUploadProgress(true);
    try {
      let finalDownloadUrl = externalUrl;

      if (!useExternalLink && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `glycon_${v.replace(/\./g, '_')}_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('release-files')
          .upload(fileName, file);

        if (uploadError) throw new Error(uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('release-files')
          .getPublicUrl(fileName);

        finalDownloadUrl = publicUrl;
      }

      if (!finalDownloadUrl) throw new Error("A download URL or file is required.");

      const { error: dbError } = await supabase.from('releases').insert({
        version: v,
        description: desc,
        changelog: log,
        download_url: finalDownloadUrl
      });

      if (dbError) throw dbError;

      alert("Global release synchronized.");
      setIsEditing(false);
      fetchLatestRelease();
    } catch (err: any) {
      alert("Update Failed: " + err.message);
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDiscordPublish = async () => {
    if (!webhook) {
      alert("Discord Webhook URL is required.");
      return;
    }

    localStorage.setItem('glycon_webhook', webhook);

    const dateStr = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    try {
      let finalJson = discordJson
        .replace(/{version}/g, v || release?.version || '0.0.0')
        .replace(/{roblox-version}/g, rv || 'N/A')
        .replace(/{changelogs}/g, log || release?.changelog || '')
        .replace(/{date}/g, dateStr)
        .replace(/{date in this format: Tuesday, 30 December 2025}/g, dateStr);

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: finalJson
      });

      if (response.ok) {
        alert("Discord announcement dispatched successfully!");
      } else {
        const errorText = await response.text();
        alert("Discord Dispatch Failed: " + errorText);
      }
    } catch (err: any) {
      alert("Publish Error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-purple-500 border-opacity-50"></div>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-purple-400">HUD</div>
        </div>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <div className="h-screen w-full bg-[#020617] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <Database size={64} className="text-red-500 mb-6 animate-pulse" />
        <h2 className="text-3xl font-black text-white uppercase mb-4 italic tracking-tighter">Database Connectivity Failed</h2>
        <p className="text-slate-400 max-w-lg mb-8 leading-relaxed">
          The <span className="text-white font-mono">releases</span> and <span className="text-white font-mono">profiles</span> tables were not detected. Ensure your infrastructure is properly provisioned.
        </p>
        <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-800 text-left font-mono text-xs text-purple-300 mb-8 max-w-2xl overflow-x-auto shadow-2xl">
          <div className="text-slate-500 mb-2 border-b border-slate-800 pb-2 uppercase tracking-widest text-[10px] font-black">Provisioning SQL</div>
          CREATE TABLE releases (<br />
          &nbsp;&nbsp;id bigint primary key generated always as identity,<br />
          &nbsp;&nbsp;version text,<br />
          &nbsp;&nbsp;description text,<br />
          &nbsp;&nbsp;changelog text,<br />
          &nbsp;&nbsp;download_url text,<br />
          &nbsp;&nbsp;created_at timestamptz default now()<br />
          );<br /><br />
          CREATE TABLE profiles (<br />
          &nbsp;&nbsp;id uuid references auth.users on delete cascade primary key,<br />
          &nbsp;&nbsp;username text,<br />
          &nbsp;&nbsp;created_at timestamptz default now()<br />
          );
        </div>
        <button onClick={() => window.location.reload()} className="bg-purple-600 px-8 py-3 rounded-lg font-black uppercase text-xs tracking-widest hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/20 active:scale-95">Re-Verify Tables</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-800 p-8 flex flex-col shrink-0 bg-[#020617] relative">
        <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-purple-500/20 to-transparent"></div>

        <div className="flex flex-col mb-12">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 overflow-hidden rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20 border border-purple-500/30">
              <img src={LOGO_URL} alt="Glycon Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-black text-white italic tracking-tighter uppercase leading-none">GLYCON</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operator Console</div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <ShieldCheck size={14} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Session Identity</div>
                <div className="text-xs font-bold text-white truncate font-mono uppercase tracking-tighter">
                  {user.email?.split('@')[0]}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Security Mode</span>
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-900/20 px-2 py-0.5 rounded">Usermode</span>
            </div>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <div className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-4 px-2">Navigation</div>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-purple-600/10 text-purple-400 font-black text-[10px] uppercase tracking-widest border border-purple-500/20">
            <Layers size={14} />
            <span>Deployment</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:text-white hover:bg-slate-900 transition-all font-black text-[10px] uppercase tracking-widest group">
            <Activity size={14} className="group-hover:text-purple-400" />
            <span>Versions</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:text-white hover:bg-slate-900 transition-all font-black text-[10px] uppercase tracking-widest group">
            <Users size={14} className="group-hover:text-purple-400" />
            <span>Registered Clients</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:text-white hover:bg-slate-900 transition-all font-black text-[10px] uppercase tracking-widest group">
            <Bug size={14} className="group-hover:text-purple-400" />
            <span>Debug Logs</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:text-white hover:bg-slate-900 transition-all font-black text-[10px] uppercase tracking-widest group">
            <Settings size={14} className="group-hover:text-purple-400" />
            <span>Config</span>
          </button>
        </nav>

        <div className="space-y-4 pt-8 border-t border-slate-800/50">
          {isAdmin && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-white text-black' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
              <Edit3 size={14} />
              <span>{isEditing ? 'Close Panel' : 'Admin Panel'}</span>
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-900/10 text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut size={14} />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative p-12 bg-purple-gradient">
        <div className="max-w-6xl mx-auto space-y-12">

          {isEditing && isAdmin ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-10 shadow-2xl space-y-8">
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                  <div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Release Dispatch</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Internal Distribution Protocol</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Build Version</label>
                      <input
                        value={v}
                        onChange={e => setV(e.target.value)}
                        placeholder="e.g. 2.5.0"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none font-mono text-sm transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Distribution Summary</label>
                      <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Feature overview..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none min-h-[140px] text-sm leading-relaxed transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Internal Changelog</label>
                    <textarea
                      value={log}
                      onChange={e => setLog(e.target.value)}
                      placeholder="+ Feature A&#10;- Fixed Bug B&#10;* Optimized C"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none min-h-[250px] font-mono text-xs leading-loose transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black italic text-white uppercase tracking-wider">Discord Dispatcher</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Broadcast changelogs to the community</p>
                    </div>
                    <MessageSquare size={16} className="text-purple-500 opacity-50" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest ml-1">Webhook URL</label>
                      <input
                        value={webhook}
                        onChange={e => setWebhook(e.target.value)}
                        type="password"
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:border-purple-500 outline-none font-mono text-[10px] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest ml-1">Roblox Version</label>
                      <input
                        value={rv}
                        onChange={e => setRv(e.target.value)}
                        placeholder="e.g. version-5b07..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:border-purple-500 outline-none font-mono text-[10px] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Embed JSON Editor</label>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Use {`{version}`}, {`{date}`}, {`{roblox-version}`}, {`{changelogs}`}</span>
                    </div>
                    <textarea
                      value={discordJson}
                      onChange={e => setDiscordJson(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-purple-300 focus:border-purple-500 outline-none min-h-[180px] font-mono text-[10px] leading-relaxed transition-all shadow-inner"
                    />
                  </div>

                  <button
                    onClick={handleDiscordPublish}
                    className="w-full bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] border border-purple-500/30 transition-all flex items-center justify-center space-x-2"
                  >
                    <MessageSquare size={14} />
                    <span>DISPATCH TO DISCORD</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setUseExternalLink(true)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${useExternalLink ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      Remote Link
                    </button>
                    <button
                      onClick={() => setUseExternalLink(false)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${!useExternalLink ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      Local Binary
                    </button>
                  </div>

                  {useExternalLink ? (
                    <div className="relative">
                      <Link size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input
                        value={externalUrl}
                        onChange={e => setExternalUrl(e.target.value)}
                        placeholder="https://distribution.cdn/loader.exe"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:border-purple-500 outline-none font-mono text-xs transition-all shadow-inner"
                      />
                    </div>
                  ) : (
                    <div className="relative bg-slate-950/50 p-10 rounded-2xl border-2 border-dashed border-slate-800 hover:border-purple-500/50 flex flex-col items-center justify-center space-y-4 transition-all group">
                      <Upload size={32} className="text-slate-700 group-hover:text-purple-500 transition-colors" />
                      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{file ? file.name : 'Select Loader Binary'}</div>
                        <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Max Size: 50MB // .EXE Only</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleGlobalUpdate}
                  disabled={uploadProgress}
                  className="w-full bg-white hover:bg-slate-200 text-black py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-sm shadow-xl transition-all flex items-center justify-center space-x-4 disabled:opacity-50"
                >
                  {uploadProgress ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-black rounded-full animate-spin" />
                      <span>DISPATCHING...</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>DEPLOY GLOBAL SYNC</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in duration-700">
              {/* Header HUD */}
              <div className="flex items-end justify-between border-b border-slate-800 pb-12 relative">
                <div className="absolute left-0 bottom-0 h-[2px] w-24 bg-purple-500"></div>
                <div>
                  <div className="flex items-center space-x-3 text-purple-500 mb-4">
                    <Terminal size={18} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Welcome to Dashboard</span>
                  </div>
                  <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase leading-[0.8]">
                    GLYCON<br /><span className="text-purple-600">DASHBOARD</span>
                  </h1>
                </div>
                <div className="flex flex-col items-end gap-3 hidden md:flex">
                  <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                    <Users size={14} className="text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase italic tracking-widest">Total Clients: 19{userCount !== null ? userCount : '...'}</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                    <span className="text-xs font-bold text-white uppercase italic tracking-widest">Live: v{release?.version || '0.0.0'}</span>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-12 gap-8">

                {/* Release Card */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                  {!discordJoined && (
                    <div className="bg-indigo-600/20 border border-indigo-500/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in duration-500">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                          <MessageSquare className="text-white" />
                        </div>
                        <div>
                          <h4 className="text-white font-black italic uppercase tracking-widest text-sm">Join the Community</h4>
                          <p className="text-xs text-indigo-300">Access to loader downloads is locked until you join our Discord server.</p>
                        </div>
                      </div>
                      <button
                        onClick={handleJoinDiscord}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap shadow-lg shadow-indigo-900/40 active:scale-95"
                      >
                        Join Discord Server
                      </button>
                    </div>
                  )}

                  <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Cpu size={120} className="text-white" />
                    </div>

                    <div className="relative z-10 space-y-6">
                      <div className="inline-flex items-center space-x-2 bg-purple-600/10 text-purple-400 border border-purple-500/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={12} />
                        <span>Latest Distribution</span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-4xl font-black italic text-white uppercase tracking-tight">Glycon Loader v{release?.version || '0.0.0'}</h3>
                        <div className="flex items-center space-x-4 text-slate-500">
                          <div className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{release ? new Date(release.created_at).toLocaleDateString() : '--/--/--'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Monitor size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Windows x64</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-400 text-sm leading-relaxed max-w-xl font-medium">
                        {release?.description || 'Synchronizing with operator identity... please wait for deployment data.'}
                      </p>

                      <div className="pt-6 flex flex-wrap gap-4">
                        {discordJoined ? (
                          <a
                            href={release?.download_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-4 bg-white hover:bg-purple-500 hover:text-white text-black px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-white/5 active:scale-95"
                          >
                            <span>Verify & Download Loader</span>
                            <Download size={16} />
                          </a>
                        ) : (
                          <button
                            onClick={handleJoinDiscord}
                            className="inline-flex items-center space-x-4 bg-slate-800/50 text-slate-500 px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700/50 cursor-not-allowed grayscale"
                          >
                            <span>Join Discord to Unlock</span>
                            <MessageSquare size={16} />
                          </button>
                        )}
                        <button className="inline-flex items-center space-x-4 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-slate-700/50">
                          <span>View Documentation</span>
                          <FileText size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                        <ShieldAlert size={20} className="text-orange-500" />
                      </div>
                      <div>
                        <h4 className="text-white font-black italic uppercase tracking-widest text-[10px] mb-1">Environmental Note</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Execution strictly in Usermode. Apply directory exclusions to prevent false positive heuristic flags.</p>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                        <Globe size={20} className="text-purple-500" />
                      </div>
                      <div>
                        <h4 className="text-white font-black italic uppercase tracking-widest text-[10px] mb-1">Cloud Authorization</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Auto-sync profiles across all authorized machines. One identity, infinite control.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Terminal */}
                <div className="col-span-12 lg:col-span-4 flex flex-col">
                  <div className="flex-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-3xl p-8 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-transparent to-purple-500 opacity-20"></div>

                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center space-x-2">
                        <Terminal size={14} className="text-purple-500" />
                        <span>Deployment_Logs</span>
                      </h4>
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-loose space-y-4">
                      {release?.changelog ? (
                        <div className="text-slate-400 whitespace-pre-wrap">
                          {release.changelog.split('\n').map((line, i) => (
                            <div key={i} className={`flex items-start space-x-2 ${line.startsWith('+') ? 'text-green-400/80' : line.startsWith('-') ? 'text-red-400/80' : 'text-slate-400'}`}>
                              <span className="text-slate-600 opacity-50">[{i + 1}]</span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-700 italic">
                          No log data detected...
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/50">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-700">
                        <span>Buffer: 1024KB</span>
                        <span>Stream: Encrypted</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Specs HUD */}
              <div className="pt-12 border-t border-slate-800 flex flex-wrap gap-12 items-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">
                <div className="flex items-center space-x-3 group cursor-help">
                  <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all"></div>
                  <span className="group-hover:text-slate-400 transition-colors">Distributed x64 Framework</span>
                </div>
                <div className="flex items-center space-x-3 group cursor-help">
                  <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all"></div>
                  <span className="group-hover:text-slate-400 transition-colors">Zero Detection</span>
                </div>
                <div className="flex items-center space-x-3 group cursor-help">
                  <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all"></div>
                  <span className="group-hover:text-slate-400 transition-colors">Encrypted IO Distribution</span>
                </div>
                <div className="flex-1"></div>
                <div className="text-[9px] font-black opacity-30 italic">Glycon</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
