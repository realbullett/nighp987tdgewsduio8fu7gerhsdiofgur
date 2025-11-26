import { createClient } from '@supabase/supabase-js';
import { EncryptedFile, ChatMessage, ChatRoom, UserProfile } from './types';

// --- Supabase Config ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bbgoqhhitsvoauuizxqr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_Nx-rxr3-n7LqPAxjbNX6WA_pHHopblF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WELCOME_CHAT_ID = 'group_welcome';

// --- Crypto Utilities (Client-Side Encryption) ---
// We keep encryption client-side so the DB only sees garbage text.
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

// Key Derivation for Chat Rooms
const getChatKey = async (chatId: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(chatId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

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
    return "🔒 Encrypted Message";
  }
};

export const resizeImage = (base64Str: string, maxWidth = 150, maxHeight = 150): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
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
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6)); 
    };
    img.onerror = () => resolve('');
  });
};

// --- Auth Functions ---

const getEmail = (username: string) => `${username}@obsidian.chat`;

export const registerUser = async (username: string, password: string, avatarBase64: string): Promise<void> => {
  const email = getEmail(username);
  
  // 1. Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Registration failed");

  // 2. Create Profile
  // Note: We wait for profile creation. If signUp requires email confirmation, this might run
  // but login will fail later. We assume email confirmation is disabled or user confirms.
  const avatar = await resizeImage(avatarBase64, 200, 200);
  
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([
      { id: authData.user.id, username, avatar, updated_at: new Date() }
    ]);

  if (profileError) {
    throw new Error("Could not create profile: " + profileError.message);
  }
};

export const loginUser = async (username: string, password: string) => {
  const email = getEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw new Error("Invalid credentials");
  
  // Fetch profile to ensure it exists
  const profile = await getUserProfile(username);
  return { user: data.user, profile };
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
};

export const getUserProfile = async (username: string): Promise<UserProfile | null> => {
  // Fetch basic profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !profile) return null;

  // Fetch Friends Logic
  // 1. Accepted Friends
  const { data: friendships } = await supabase
    .from('friend_requests')
    .select('sender, receiver')
    .eq('status', 'accepted')
    .or(`sender.eq.${username},receiver.eq.${username}`);

  const friends = (friendships || []).map((f: any) => 
    f.sender === username ? f.receiver : f.sender
  );

  // 2. Incoming Requests
  const { data: incoming } = await supabase
    .from('friend_requests')
    .select('sender')
    .eq('receiver', username)
    .eq('status', 'pending');
  
  const incomingRequests = (incoming || []).map((i: any) => i.sender);

  // 3. Outgoing Requests
  const { data: outgoing } = await supabase
    .from('friend_requests')
    .select('receiver')
    .eq('sender', username)
    .eq('status', 'pending');

  const outgoingRequests = (outgoing || []).map((o: any) => o.receiver);

  return {
    id: profile.id,
    username: profile.username,
    avatar: profile.avatar,
    friends,
    incomingRequests,
    outgoingRequests
  };
};

export const updateAvatar = async (username: string, avatarBase64: string) => {
  const avatar = await resizeImage(avatarBase64, 200, 200);
  await supabase
    .from('profiles')
    .update({ avatar })
    .eq('username', username);
};

// --- Friends ---

export const sendFriendRequest = async (fromUser: string, toUser: string) => {
  // Check if users exist
  const { data: receiver } = await supabase.from('profiles').select('username').eq('username', toUser).single();
  if (!receiver) throw new Error("User not found");

  // Check if request exists
  const { data: existing } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`and(sender.eq.${fromUser},receiver.eq.${toUser}),and(sender.eq.${toUser},receiver.eq.${fromUser})`)
    .single();

  if (existing) {
    if (existing.status === 'accepted') throw new Error("Already friends");
    throw new Error("Request pending");
  }

  await supabase.from('friend_requests').insert({
    sender: fromUser,
    receiver: toUser,
    status: 'pending'
  });
};

export const acceptFriendRequest = async (currentUser: string, requester: string) => {
  await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('sender', requester)
    .eq('receiver', currentUser);
};

export const rejectFriendRequest = async (currentUser: string, requester: string) => {
  await supabase
    .from('friend_requests')
    .delete()
    .eq('sender', requester)
    .eq('receiver', currentUser);
};

// --- Chats ---

export const getDMChatId = (userA: string, userB: string) => {
  const sorted = [userA, userB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
};

export const getWelcomeChat = async (): Promise<ChatRoom> => {
  // Ensure welcome group exists in DB
  const { data } = await supabase.from('chats').select('*').eq('id', WELCOME_CHAT_ID).single();
  
  if (!data) {
    // Create it if it doesn't exist (First run)
    await supabase.from('chats').insert({
      id: WELCOME_CHAT_ID,
      type: 'group',
      name: 'Welcome Group',
      participants: [],
      admins: []
    });
  }

  // Get all users for the welcome group participant list
  const { data: users } = await supabase.from('profiles').select('username');
  const allUsernames = users ? users.map((u: any) => u.username) : [];

  return {
    id: WELCOME_CHAT_ID,
    type: 'group',
    name: 'Welcome Group',
    participants: allUsernames,
    admins: [],
    avatar: ''
  };
};

export const createGroupChat = async (name: string, creator: string, members: string[]) => {
  const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const participants = Array.from(new Set([creator, ...members]));
  
  const room = {
    id,
    type: 'group',
    name,
    participants,
    admins: [creator],
    avatar: ''
  };

  const { error } = await supabase.from('chats').insert(room);
  if (error) throw error;
  return room as ChatRoom;
};

export const getMyChats = async (username: string): Promise<ChatRoom[]> => {
  const chats: ChatRoom[] = [];

  // 1. Welcome Group
  chats.push(await getWelcomeChat());

  // 2. Fetch DMs and Groups where I am a participant
  // Note: Supabase array filtering is tricky. 
  // We'll simplisticly fetch chats and filter in memory for this demo
  const { data: remoteChats } = await supabase
    .from('chats')
    .select('*')
    .contains('participants', [username]);

  if (remoteChats) {
    remoteChats.forEach((c: any) => {
      if (c.id !== WELCOME_CHAT_ID) {
        chats.push(c as ChatRoom);
      }
    });
  }

  // 3. Hydrate Last Message
  const hydratedChats = await Promise.all(chats.map(async (chat) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (msgs && msgs.length > 0) {
      const lastRaw = msgs[0];
      const content = await decryptMessage(lastRaw.iv, lastRaw.content, chat.id);
      return { 
        ...chat, 
        lastMessage: { 
          id: lastRaw.id,
          sender: lastRaw.sender,
          content,
          timestamp: new Date(lastRaw.created_at).getTime()
        } 
      };
    }
    return chat;
  }));

  return hydratedChats.sort((a, b) => {
    const tA = a.lastMessage?.timestamp || 0;
    const tB = b.lastMessage?.timestamp || 0;
    return tB - tA;
  });
};

export const getMessages = async (chatId: string): Promise<ChatMessage[]> => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (!data) return [];

  const decrypted: ChatMessage[] = [];
  for (const m of data) {
    const content = await decryptMessage(m.iv, m.content, chatId);
    decrypted.push({
      id: m.id,
      sender: m.sender,
      content,
      timestamp: new Date(m.created_at).getTime()
    });
  }
  return decrypted;
};

export const sendMessage = async (chatId: string, sender: string, content: string) => {
  const encrypted = await encryptMessage(content, chatId);
  
  // Ensure chat exists for DMs (Lazy creation)
  if (chatId.startsWith('dm_')) {
    const { data } = await supabase.from('chats').select('id').eq('id', chatId).single();
    if (!data) {
      const parts = chatId.replace('dm_', '').split('_');
      await supabase.from('chats').insert({
        id: chatId,
        type: 'dm',
        name: chatId,
        participants: parts,
        admins: []
      });
    }
  }

  await supabase.from('messages').insert({
    chat_id: chatId,
    sender,
    content: encrypted.data,
    iv: encrypted.iv
  });
};

// --- Realtime Subscription ---
export const subscribeToChat = (chatId: string, onMessage: () => void) => {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      () => {
        onMessage();
      }
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};