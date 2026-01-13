
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
  const [status, setStatus] = useState('Undetected'); // New Status State
  const [log, setLog] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [useExternalLink, setUseExternalLink] = useState(true);
  const [rv, setRv] = useState('');
  const [webhook, setWebhook] = useState(localStorage.getItem('glycon_webhook') || 'https://discord.com/api/webhooks/1455467520109838386/PAJVbt-9BFGQQXOFBOXw4Ba4DPrlExXKQHaPs_d437vr5u2e9sQwBIajnD7bS6g87G8a');
  const [discordJson, setDiscordJson] = useState(JSON.stringify({
  "content": null,
  "embeds": [
    {
      "title": "😎 [Glycon: Update] · {version} 🟦",
      "description": "@Updates @Glycon\n\n**{date}**\n• Status: **{status}**\n• Compatible with deployed **{roblox-version}**",
      "color": 2829617,
      "fields": [
        {
          "name": "CHANGELOG",
          "value": "```ini\n{changelogs}\n\ninstall update from https://glycon.vercel.app\n```"
        }
      ]
    }
  ],
  "username": "changelog",
  "avatar_url": "https://cdn.discordapp.com/avatars/1455467520109838386/6509094eb7907a4a4311c1dc7be31e72.webp?size=60",
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
        setStatus(data.status || 'Undetected'); // Load Status
        setLog(data.changelog);
        setExternalUrl(data.download_url);
        setRv(data.roblox_version || '');
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

      const { error: dbError } = await supabase.from('releases').insert({
        version: v,
        description: desc,
        status: status, // Save Status
        changelog: log,
        download_url: finalDownloadUrl,
        roblox_version: rv
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
      const template = JSON.parse(discordJson);

      const injectPlaceholders = (obj: any): any => {
        if (typeof obj === 'string') {
          return obj
            .replace(/{version}/g, v || release?.version || '0.0.0')
            .replace(/{roblox-version}/g, rv || 'N/A')
            .replace(/{status}/g, status || 'Undetected')
            .replace(/{changelogs}/g, log || release?.changelog || '')
            .replace(/{date}/g, dateStr)
            .replace(/{date in this format: Tuesday, 30 December 2025}/g, dateStr);
        }
        if (Array.isArray(obj)) return obj.map(injectPlaceholders);
        if (obj !== null && typeof obj === 'object') {
          const newObj: any = {};
          for (const key in obj) {
            newObj[key] = injectPlaceholders(obj[key]);
          }
          return newObj;
        }
        return obj;
      };

      const finalPayload = injectPlaceholders(template);

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
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
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (tableMissing) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <Database size={64} className="text-red-500 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-4">Database Connection Failed</h2>
        <p className="text-slate-400 max-w-lg mb-8">
          The releases and profiles tables were not detected. Ensure your infrastructure is properly provisioned.
        </p>
        <button onClick={() => window.location.reload()} className="bg-purple-600 px-6 py-3 rounded-lg text-white font-semibold hover:bg-purple-500 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col shrink-0 bg-slate-900/50">
        <div className="flex flex-col mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 overflow-hidden rounded-lg flex items-center justify-center">
              <img src={LOGO_URL} alt="Glycon Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Glycon</div>
              <div className="text-xs text-slate-500">Dashboard</div>
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <ShieldCheck size={14} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-1">User</div>
                <div className="text-sm font-semibold text-white truncate">
                  {user.email?.split('@')[0]}
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <div className="text-xs font-semibold text-slate-500 mb-3 px-2">Navigation</div>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-purple-600/10 text-purple-400 border border-purple-500/20">
            <Layers size={16} />
            <span className="text-sm">Deployment</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
            <Activity size={16} />
            <span className="text-sm">Versions</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
            <Users size={16} />
            <span className="text-sm">Users</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
            <Settings size={16} />
            <span className="text-sm">Settings</span>
          </button>
        </nav>

        <div className="space-y-3 pt-6 border-t border-slate-800">
          {isAdmin && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg text-sm font-semibold transition-colors ${isEditing ? 'bg-white text-black' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
              <Edit3 size={16} />
              <span>{isEditing ? 'Close Panel' : 'Admin Panel'}</span>
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">

          {isEditing && isAdmin ? (
            <div>
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-2xl font-bold text-white">Release Management</h2>
                  <p className="text-sm text-slate-500 mt-1">Create and manage releases</p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Version</label>
                        <input
                          value={v}
                          onChange={e => setV(e.target.value)}
                          placeholder="e.g. 2.5.0"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">Roblox Version</label>
                        <input
                          value={rv}
                          onChange={e => setRv(e.target.value)}
                          placeholder="version-..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300">Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['WORKING', 'PATCHED', 'UNDETECTED', 'DETECTED', 'MAINTENANCE', 'TESTING'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${status === s
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300">Description</label>
                      <textarea
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Feature overview..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none min-h-[120px] text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Changelog</label>
                    <textarea
                      value={log}
                      onChange={e => setLog(e.target.value)}
                      placeholder="+ Feature A\n- Fixed Bug B\n* Optimized C"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none min-h-[200px] font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-800">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Discord Integration</h3>
                    <p className="text-sm text-slate-500">Broadcast changelogs to Discord</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Webhook URL</label>
                    <input
                      value={webhook}
                      onChange={e => setWebhook(e.target.value)}
                      type="password"
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-300">Embed JSON</label>
                      <span className="text-xs text-slate-500">Use {`{version}`}, {`{date}`}, {`{roblox-version}`}, {`{changelogs}`}</span>
                    </div>
                    <textarea
                      value={discordJson}
                      onChange={e => setDiscordJson(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-purple-300 focus:border-purple-500 outline-none min-h-[150px] font-mono text-xs"
                    />
                  </div>

                  <button
                    onClick={handleDiscordPublish}
                    className="w-full bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white py-3 rounded-lg font-semibold text-sm border border-purple-500/30 transition-colors flex items-center justify-center space-x-2"
                  >
                    <MessageSquare size={16} />
                    <span>Publish to Discord</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setUseExternalLink(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${useExternalLink ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      Remote Link
                    </button>
                    <button
                      onClick={() => setUseExternalLink(false)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${!useExternalLink ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      Upload File
                    </button>
                  </div>

                  {useExternalLink ? (
                    <div className="relative">
                      <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        value={externalUrl}
                        onChange={e => setExternalUrl(e.target.value)}
                        placeholder="https://distribution.cdn/loader.exe"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-12 pr-4 py-3 text-white focus:border-purple-500 outline-none font-mono text-sm"
                      />
                    </div>
                  ) : (
                    <div className="relative bg-slate-950/50 p-8 rounded-lg border-2 border-dashed border-slate-800 hover:border-purple-500/50 flex flex-col items-center justify-center space-y-3 transition-colors group">
                      <Upload size={32} className="text-slate-600 group-hover:text-purple-500 transition-colors" />
                      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="text-center">
                        <div className="text-sm font-semibold text-slate-300 mb-1">{file ? file.name : 'Select File'}</div>
                        <div className="text-xs text-slate-500">Max Size: 50MB • .EXE Only</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleGlobalUpdate}
                  disabled={uploadProgress}
                  className="w-full bg-white hover:bg-slate-100 text-black py-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  {uploadProgress ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-black rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Deploy Release</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div>
                  <h1 className="text-4xl font-bold text-white">
                    Dashboard
                  </h1>
                  <p className="text-slate-400 mt-1">Welcome back, {user.email?.split('@')[0]}</p>
                </div>
                <div className="flex flex-col items-end gap-2 hidden md:flex">
                  <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                    <Users size={16} className="text-purple-400" />
                    <span className="text-sm text-white">Users: {userCount ?? 0}</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-white">v{release?.version || '0.0.0'}</span>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-12 gap-8">

                {/* Release Card */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                  {!discordJoined && (
                    <div className="bg-indigo-600/20 border border-indigo-500/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                          <MessageSquare className="text-white" size={20} />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold text-sm">Join the Community</h4>
                          <p className="text-xs text-indigo-300">Join Discord to unlock downloads</p>
                        </div>
                      </div>
                      <button
                        onClick={handleJoinDiscord}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors"
                      >
                        Join Discord
                      </button>
                    </div>
                  )}

                  <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-8 space-y-6">
                    <div className="inline-flex items-center space-x-2 bg-purple-600/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                      <CheckCircle2 size={14} />
                      <span>Latest Release</span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-3xl font-bold text-white">Glycon Loader v{release?.version || '0.0.0'}</h3>
                      <div className="flex items-center space-x-4 text-slate-400 text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{release ? new Date(release.created_at).toLocaleDateString() : '--/--/--'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Monitor size={14} />
                          <span>Windows x64</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-300 text-base leading-relaxed max-w-xl">
                      {release?.description || 'No release information available.'}
                    </p>

                    <div className="flex flex-wrap gap-3 pt-4">
                      {discordJoined ? (
                        <a
                          href={release?.download_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 bg-white hover:bg-purple-500 hover:text-white text-black px-6 py-3 rounded-lg font-semibold text-sm transition-colors"
                        >
                          <span>Download</span>
                          <Download size={16} />
                        </a>
                      ) : (
                        <button
                          onClick={handleJoinDiscord}
                          className="inline-flex items-center space-x-2 bg-slate-800/50 text-slate-500 px-6 py-3 rounded-lg font-semibold text-sm border border-slate-700/50 cursor-not-allowed"
                        >
                          <span>Join Discord to Unlock</span>
                          <MessageSquare size={16} />
                        </button>
                      )}
                      <button className="inline-flex items-center space-x-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white px-5 py-3 rounded-lg font-semibold text-sm border border-slate-700/50 transition-colors">
                        <span>Documentation</span>
                        <FileText size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                        <ShieldAlert size={20} className="text-orange-500" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm mb-1">Note</h4>
                        <p className="text-sm text-slate-400 leading-relaxed">Execution in Usermode. Apply directory exclusions to prevent false positives.</p>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                        <Globe size={20} className="text-purple-500" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm mb-1">Cloud Sync</h4>
                        <p className="text-sm text-slate-400 leading-relaxed">Auto-sync profiles across all authorized machines.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Changelog */}
                <div className="col-span-12 lg:col-span-4 flex flex-col">
                  <div className="flex-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-slate-300 flex items-center space-x-2">
                        <Terminal size={16} className="text-purple-500" />
                        <span>Changelog</span>
                      </h4>
                    </div>

                    <div className="flex-1 overflow-y-auto font-mono text-sm leading-relaxed space-y-2">
                      {release?.changelog ? (
                        <div className="text-slate-400 whitespace-pre-wrap">
                          {release.changelog.split('\n').map((line, i) => {
                            let colorClass = 'text-slate-400';
                            const trimmed = line.trim();
                            if (trimmed.startsWith('[+]') || trimmed.startsWith('+')) colorClass = 'text-green-400';
                            else if (trimmed.startsWith('[-]') || trimmed.startsWith('-')) colorClass = 'text-red-400';
                            else if (trimmed.startsWith('[!]')) colorClass = 'text-amber-400';
                            else if (trimmed.startsWith('[*]')) colorClass = 'text-blue-400';

                            return (
                              <div key={i} className={colorClass}>
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-600 italic">
                          No changelog available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
