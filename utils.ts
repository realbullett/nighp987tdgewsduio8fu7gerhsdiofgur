
import { createClient } from '@supabase/supabase-js';
import { EncryptedFile, ChatMessage, ChatRoom, UserProfile, User, MessageContent } from './types';

// --- Supabase Config ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qesejuvizzzkwqedeqwk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_LQrnUGOne0SsfZs9gSJeXA_6GDAcGU6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WELCOME_CHAT_ID = 'group_official_night';

// --- Crypto Utilities ---
const ENC_ALGO = 'AES-GCM';
const HASH_ALGO = 'SHA-256';

const bufferToBase64 = (buffer: Uint8Array): string => {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
};

const base64ToBuffer = (base64: string): Uint8Array => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

// Key Derivation
const getChatKey = async (chatId: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(chatId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  // Fixed salt ensures same key for same chatId. 
  const fixedSalt = enc.encode('obsidian_vault_secure_salt_v10'); 

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fixedSalt,
      iterations: 100000, 
      hash: HASH_ALGO,
    },
    keyMaterial,
    { name: ENC_ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptMessage = async (text: string, chatId: string): Promise<EncryptedFile> => {
  const key = await getChatKey(chatId);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: ENC_ALGO, iv: iv },
    key,
    enc.encode(text)
  );

  return {
    iv: bufferToBase64(iv),
    data: bufferToBase64(new Uint8Array(encryptedContent))
  };
};

export const decryptMessage = async (ivStr: string, dataStr: string, chatId: string): Promise<string> => {
  try {
    const key = await getChatKey(chatId);
    const iv = base64ToBuffer(ivStr);
    const data = base64ToBuffer(dataStr);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: ENC_ALGO, iv: iv },
      key,
      data
    );
    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    // console.error("Decryption failed", e);
    return "🔒 Decryption Failed";
  }
};

export const resizeImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
        resolve(base64Str);
        return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
            }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
            resolve(base64Str); 
        }
      } catch (e) {
          resolve(base64Str);
      }
    };
    img.onerror = () => {
        resolve(base64Str); 
    };
  });
};

export const detectLinks = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// --- Auth Functions ---

const getEmail = (username: string) => `${username}@obsidian.chat`;

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar')
    .eq('id', session.user.id)
    .single();

  if (profile) {
    return {
      username: profile.username,
      isAuthenticated: true,
      avatar: profile.avatar,
      id: session.user.id
    };
  }
  return null;
};

export const registerUser = async (username: string, password: string, avatarBase64: string, publicEmail?: string): Promise<void> => {
  const email = getEmail(username);
  
  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .limit(1);

  if (existingUsers && existingUsers.length > 0) {
    throw new Error("Username already registered. Please log in.");
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Registration failed.");

  if (!authData.session) {
    throw new Error("Confirmation Required. Please disable 'Confirm Email' in Supabase dashboard.");
  }

  const avatar = await resizeImage(avatarBase64, 200, 200);
  
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{ 
        id: authData.user.id, 
        username, 
        avatar, 
        public_email: publicEmail || null,
        updated_at: new Date() 
    }]);

  if (profileError) {
    if (profileError.code !== '23505') throw new Error(profileError.message);
  }
};

export const loginUser = async (username: string, password: string) => {
  const email = getEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Login failed.");
  
  let profile = await getUserProfile(username);
  if (!profile) {
    // Auto-Heal: Profile missing but Auth exists. Create generic profile.
    const defaultAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    await supabase.from('profiles').upsert([{ id: data.user.id, username, avatar: defaultAvatar, updated_at: new Date() }]);
    profile = await getUserProfile(username);
  }

  return { user: data.user, profile };
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('obsidian_current_user'); 
};

export const getUserProfile = async (username: string): Promise<UserProfile | null> => {
  const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single();
  if (!profile) return null;

  const { data: friendships } = await supabase
    .from('friend_requests')
    .select('sender, receiver')
    .eq('status', 'accepted')
    .or(`sender.eq.${username},receiver.eq.${username}`);
    
  const friends = (friendships || []).map((f: any) => f.sender === username ? f.receiver : f.sender);

  const { data: incoming } = await supabase
    .from('friend_requests')
    .select('sender')
    .eq('receiver', username)
    .eq('status', 'pending');

  const { data: outgoing } = await supabase
    .from('friend_requests')
    .select('receiver')
    .eq('sender', username)
    .eq('status', 'pending');
  
  return {
    id: profile.id,
    username: profile.username,
    avatar: profile.avatar,
    banner: profile.banner,
    bio: profile.bio,
    public_email: profile.public_email,
    show_email: profile.show_email,
    friends,
    incomingRequests: incoming?.map((r:any) => r.sender) || [],
    outgoingRequests: outgoing?.map((r:any) => r.receiver) || []
  };
};

export const updateProfile = async (username: string, updates: Partial<UserProfile>) => {
    const dbUpdates: any = {};
    if (updates.avatar) dbUpdates.avatar = await resizeImage(updates.avatar, 300, 300);
    if (updates.banner) dbUpdates.banner = await resizeImage(updates.banner, 800, 400);
    if (typeof updates.bio === 'string') dbUpdates.bio = updates.bio;
    if (typeof updates.public_email === 'string') dbUpdates.public_email = updates.public_email;
    if (typeof updates.show_email === 'boolean') dbUpdates.show_email = updates.show_email;

    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('profiles').update(dbUpdates).eq('username', username);
        if (error) {
            console.error("Failed to update profile", error);
        }
    }
};

export const getProfiles = async (usernames: string[]): Promise<Record<string, UserProfile>> => {
    if (!usernames || usernames.length === 0) return {};
    const { data } = await supabase.from('profiles').select('username, avatar, banner, bio, public_email, show_email').in('username', usernames);
    const map: Record<string, UserProfile> = {};
    if (data) {
        data.forEach((p: any) => {
            map[p.username] = p as UserProfile;
        });
    }
    return map;
};

export const updateAvatar = async (username: string, avatarBase64: string) => {
  const avatar = await resizeImage(avatarBase64, 200, 200);
  await supabase.from('profiles').update({ avatar }).eq('username', username);
};

export const updateGroupAvatar = async (groupId: string, avatarBase64: string) => {
  const avatar = await resizeImage(avatarBase64, 200, 200);
  await supabase.from('chats').update({ avatar }).eq('id', groupId);
};

// --- Chats ---

export const getDMChatId = (userA: string, userB: string) => {
  const sorted = [userA, userB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
};

export const getWelcomeChat = async (): Promise<ChatRoom> => {
  const { data } = await supabase.from('chats').select('*').eq('id', WELCOME_CHAT_ID).single();
  
  const { data: allProfiles } = await supabase.from('profiles').select('username');
  const allUsernames = allProfiles ? allProfiles.map((p: any) => p.username) : ['night'];

  if (!data) {
    await supabase.from('chats').insert({
      id: WELCOME_CHAT_ID,
      type: 'group',
      name: 'Official Night',
      participants: ['night'], 
      admins: ['night']
    });
  }
  
  return {
    id: WELCOME_CHAT_ID,
    type: 'group',
    name: 'Official Night',
    participants: allUsernames, 
    admins: ['night'],
    avatar: ''
  };
};

export const createGroupChat = async (name: string, creator: string, members: string[]) => {
  const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const participants = Array.from(new Set([creator, ...members]));
  
  const room = { id, type: 'group', name, participants, admins: [creator], avatar: '' };
  const { error } = await supabase.from('chats').insert(room);
  if (error) throw error;
  return room as ChatRoom;
};

export const getMyChats = async (username: string): Promise<ChatRoom[]> => {
  const { data } = await supabase.from('chats').select('*').contains('participants', [username]);
  const chats = data ? data.map((c:any) => c as ChatRoom) : [];
  
  if (!chats.find(c => c.id === WELCOME_CHAT_ID)) {
    chats.unshift(await getWelcomeChat());
  } else {
    const welcome = chats.find(c => c.id === WELCOME_CHAT_ID);
    if (welcome) {
        const { data: allProfiles } = await supabase.from('profiles').select('username');
        welcome.participants = allProfiles ? allProfiles.map((p: any) => p.username) : ['night'];
        welcome.name = 'Official Night'; 
    }
  }

  const hydrated = await Promise.all(chats.map(async (chat) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (msgs && msgs.length > 0) {
      try {
        const content = await decryptMessage(msgs[0].iv, msgs[0].content, chat.id);
        return { 
          ...chat, 
          lastMessage: { 
            id: msgs[0].id, 
            sender: msgs[0].sender, 
            content, 
            timestamp: new Date(msgs[0].created_at).getTime() 
          } 
        };
      } catch(e) { return chat; }
    }
    return chat;
  }));

  return hydrated.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
};

export const getMessages = async (chatId: string): Promise<ChatMessage[]> => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(50); 

  if (!data) return [];

  const decrypted: ChatMessage[] = [];
  for (const m of data) {
    try {
      const content = await decryptMessage(m.iv, m.content, chatId);
      decrypted.push({
        id: m.id,
        sender: m.sender,
        content,
        timestamp: new Date(m.created_at).getTime()
      });
    } catch (e) { }
  }
  return decrypted;
};

export const sendMessage = async (chatId: string, sender: string, content: string): Promise<ChatMessage> => {
  if (chatId === WELCOME_CHAT_ID && sender !== 'night') {
    throw new Error("Only 'night' can post in the Official Night channel.");
  }

  const encrypted = await encryptMessage(content, chatId);
  
  if (chatId.startsWith('dm_')) {
     const { data } = await supabase.from('chats').select('id').eq('id', chatId).single();
     if (!data) {
       const parts = chatId.replace('dm_', '').split('_');
       await supabase.from('chats').insert({
         id: chatId, type: 'dm', name: 'DM', participants: parts
       });
     }
  }

  const { data, error } = await supabase.from('messages').insert({
    chat_id: chatId,
    sender,
    content: encrypted.data,
    iv: encrypted.iv
  }).select().single();

  if (error) throw error;

  return {
    id: data.id,
    sender: data.sender,
    content,
    timestamp: new Date(data.created_at).getTime()
  };
};

export const deleteMessage = async (messageId: string) => {
  await supabase.from('messages').delete().eq('id', messageId);
};

export const updateMessage = async (chatId: string, messageId: string, newContentObj: MessageContent) => {
  const contentString = JSON.stringify(newContentObj);
  const encrypted = await encryptMessage(contentString, chatId);
  
  await supabase.from('messages').update({
    content: encrypted.data,
    iv: encrypted.iv
  }).eq('id', messageId);
};

export const addMessageReaction = async (chatId: string, messageId: string, emoji: string, username: string) => {
  const { data: msg } = await supabase.from('messages').select('*').eq('id', messageId).single();
  if (!msg) return;

  const contentStr = await decryptMessage(msg.iv, msg.content, chatId);
  let content: MessageContent;
  try {
    content = JSON.parse(contentStr);
  } catch {
    content = { text: contentStr };
  }

  if (!content.reactions) content.reactions = {};
  const current = content.reactions[emoji] || [];
  
  if (current.includes(username)) {
    content.reactions[emoji] = current.filter(u => u !== username); 
    if (content.reactions[emoji].length === 0) delete content.reactions[emoji];
  } else {
    content.reactions[emoji] = [...current, username];
  }

  const newContentStr = JSON.stringify(content);
  const encrypted = await encryptMessage(newContentStr, chatId);

  await supabase.from('messages').update({
    content: encrypted.data,
    iv: encrypted.iv
  }).eq('id', messageId);
};

export const subscribeToChat = (chatId: string, onMessage: (payload: any) => void) => {
  const channel = supabase.channel(`chat:${chatId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, onMessage)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const subscribeToGlobalMessages = (onEvent: (payload: any) => void) => {
    const channel = supabase.channel('global-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onEvent)
        .subscribe();
    return () => { supabase.removeChannel(channel); };
};

// --- Friends ---
export const sendFriendRequest = async (from: string, to: string) => {
  await supabase.from('friend_requests').insert({ sender: from, receiver: to });
};
export const acceptFriendRequest = async (me: string, them: string) => {
  await supabase.from('friend_requests').update({ status: 'accepted' }).eq('sender', them).eq('receiver', me);
};
export const rejectFriendRequest = async (me: string, them: string) => {
  await supabase.from('friend_requests').delete().eq('sender', them).eq('receiver', me);
};
export const removeFriend = async (me: string, them: string) => {
    await supabase.from('friend_requests').delete().or(`and(sender.eq.${me},receiver.eq.${them}),and(sender.eq.${them},receiver.eq.${me})`);
};
