
import { EncryptedFile, ChatMessage, ChatRoom, UserProfile } from './types';

// --- Constants ---
const USERS_FILE = 'registry_users';
const WELCOME_CHAT_ID = 'group_welcome';

// Broadcast channel for multi-tab synchronization since OPFS doesn't fire storage events
const dbChannel = new BroadcastChannel('obsidian_db_sync');

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

export const hashString = async (message: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest(HASH_ALGO, msgBuffer);
  return bufferToBase64(new Uint8Array(hashBuffer));
};

const getChatKey = async (chatId: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(chatId),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const fixedSalt = enc.encode('obsidian_vault_secure_salt_v9'); 

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

export const decryptMessage = async (encryptedFile: EncryptedFile, chatId: string): Promise<string> => {
  const key = await getChatKey(chatId);
  const iv = base64ToBuffer(encryptedFile.iv);
  const data = base64ToBuffer(encryptedFile.data);

  try {
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: ENC_ALGO, iv: iv },
      key,
      data
    );
    return new TextDecoder().decode(decryptedContent);
  } catch (e) {
    console.error("Decryption failed for chat", chatId);
    return "🔒 Encrypted Message";
  }
};

// --- Image Utils ---

export const resizeImage = (base64Str: string, maxWidth = 100, maxHeight = 100): Promise<string> => {
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
      resolve(canvas.toDataURL('image/jpeg', 0.7)); 
    };
  });
};

// --- File System Utilities (OPFS) ---

// Helper to access the Origin Private File System
const getRoot = async () => navigator.storage.getDirectory();

const readFile = async <T>(filename: string): Promise<T | null> => {
  try {
    const root = await getRoot();
    // We treat everything as .txt files as requested
    const fileHandle = await root.getFileHandle(`${filename}.txt`, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    // File likely doesn't exist
    return null;
  }
};

const saveFile = async (filename: string, data: any) => {
  try {
    const root = await getRoot();
    const fileHandle = await root.getFileHandle(`${filename}.txt`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data));
    await writable.close();
    
    // Notify other tabs/components that data has changed
    dbChannel.postMessage({ type: 'update', file: filename });
  } catch (error) {
    console.error(`Failed to save ${filename}:`, error);
  }
};

// --- User Registry & Friends ---

export const getRegisteredUsers = async (): Promise<string[]> => {
  const users = await readFile<string[]>(USERS_FILE);
  return users || [];
};

export const getUserProfile = async (username: string): Promise<UserProfile | null> => {
  return await readFile<UserProfile>(`user_${username}`);
};

export const registerUser = async (username: string, password: string, avatarBase64: string): Promise<void> => {
  const users = await getRegisteredUsers();
  if (users.includes(username)) {
    throw new Error("Username already registered");
  }
  
  const passwordHash = await hashString(password);
  const avatar = await resizeImage(avatarBase64, 200, 200);

  const newUser: UserProfile = {
    username,
    passwordHash,
    avatar,
    friends: [],
    incomingRequests: [],
    outgoingRequests: []
  };

  await saveFile(`user_${username}`, newUser);
  users.push(username);
  await saveFile(USERS_FILE, users);
};

export const updateAvatar = async (username: string, avatarBase64: string) => {
  const profile = await getUserProfile(username);
  if (!profile) return;
  profile.avatar = await resizeImage(avatarBase64, 200, 200);
  await saveFile(`user_${username}`, profile);
};

export const verifyUser = async (username: string, password: string): Promise<boolean> => {
  const record = await getUserProfile(username);
  if (!record) return false;
  const hash = await hashString(password);
  return record.passwordHash === hash;
};

// Friend Logic

export const sendFriendRequest = async (fromUser: string, toUser: string) => {
  const sender = await getUserProfile(fromUser);
  const receiver = await getUserProfile(toUser);
  
  if (!sender || !receiver) throw new Error("User not found in registry");
  if (sender.friends.includes(toUser)) throw new Error("Already contacts");
  if (sender.outgoingRequests.includes(toUser)) throw new Error("Request already sent");
  if (receiver.incomingRequests.includes(fromUser)) throw new Error("They already sent you a request");

  sender.outgoingRequests.push(toUser);
  receiver.incomingRequests.push(fromUser);

  await saveFile(`user_${fromUser}`, sender);
  await saveFile(`user_${toUser}`, receiver);
};

export const acceptFriendRequest = async (currentUser: string, requester: string) => {
  const me = await getUserProfile(currentUser);
  const them = await getUserProfile(requester);
  
  if (!me || !them) return;

  me.incomingRequests = me.incomingRequests.filter(u => u !== requester);
  them.outgoingRequests = them.outgoingRequests.filter(u => u !== currentUser);

  if (!me.friends.includes(requester)) me.friends.push(requester);
  if (!them.friends.includes(currentUser)) them.friends.push(currentUser);

  await saveFile(`user_${currentUser}`, me);
  await saveFile(`user_${them}`, them);
};

export const rejectFriendRequest = async (currentUser: string, requester: string) => {
  const me = await getUserProfile(currentUser);
  const them = await getUserProfile(requester);
  if (!me || !them) return;

  me.incomingRequests = me.incomingRequests.filter(u => u !== requester);
  them.outgoingRequests = them.outgoingRequests.filter(u => u !== currentUser);

  await saveFile(`user_${currentUser}`, me);
  await saveFile(`user_${them}`, them);
};

// --- Chat Management ---

export const getWelcomeChat = async (): Promise<ChatRoom> => {
  const users = await getRegisteredUsers();
  return {
    id: WELCOME_CHAT_ID,
    type: 'group',
    name: 'Welcome Group',
    participants: users, 
    admins: [], 
    avatar: '' 
  };
};

export const getDMChatId = (userA: string, userB: string) => {
  const sorted = [userA, userB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
};

export const createGroupChat = async (name: string, creator: string, members: string[]) => {
  const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const allParticipants = Array.from(new Set([creator, ...members]));
  
  const room: ChatRoom = {
    id,
    type: 'group',
    name,
    participants: allParticipants,
    admins: [creator],
    createdBy: creator,
    avatar: '' 
  };
  
  await saveFile(`room_${id}`, room);
  await saveFile(`msgs_${id}`, []);
  return room;
};

export const updateGroupMembers = async (chatId: string, newParticipants: string[]) => {
  const room = await readFile<ChatRoom>(`room_${chatId}`);
  if (!room) return;
  room.participants = newParticipants;
  await saveFile(`room_${chatId}`, room);
};

export const getMessages = async (chatId: string): Promise<ChatMessage[]> => {
  const rawData = await readFile<any[]>(`msgs_${chatId}`);
  if (!rawData || !Array.isArray(rawData)) return [];

  const decryptedMessages: ChatMessage[] = [];
  for (const item of rawData) {
    try {
      if (item.encrypted) {
        const content = await decryptMessage(item.encrypted, chatId);
        decryptedMessages.push({ ...item, content });
      }
    } catch (e) { }
  }
  return decryptedMessages;
};

export const sendMessage = async (chatId: string, sender: string, content: string) => {
  const encrypted = await encryptMessage(content, chatId);
  
  const msgRecord = {
    id: Date.now().toString() + Math.random().toString().slice(2, 8),
    sender,
    timestamp: Date.now(),
    encrypted
  };

  const existing = await readFile<any[]>(`msgs_${chatId}`) || [];
  existing.push(msgRecord);
  await saveFile(`msgs_${chatId}`, existing);
};

export const getMyChats = async (username: string): Promise<ChatRoom[]> => {
  const profile = await getUserProfile(username);
  if (!profile) return [];

  const chats: ChatRoom[] = [];

  // 1. Welcome Group (Always available)
  chats.push(await getWelcomeChat());

  // 2. DMs with Friends
  for (const friend of profile.friends) {
    const chatId = getDMChatId(username, friend);
    chats.push({
      id: chatId,
      type: 'dm',
      name: friend, 
      participants: [username, friend]
    });
  }

  // 3. Custom Groups
  // Since we can't iterate LocalStorage keys anymore, we need to iterate the directory
  try {
    const root = await getRoot();
    // @ts-ignore - values() iterator exists on FileSystemDirectoryHandle
    for await (const handle of root.values()) {
       if (handle.kind === 'file' && handle.name.startsWith('room_') && handle.name.endsWith('.txt')) {
         const file = await (handle as FileSystemFileHandle).getFile();
         const text = await file.text();
         try {
           const room: ChatRoom = JSON.parse(text);
           if (room.participants.includes(username)) {
             chats.push(room);
           }
         } catch(e) {}
       }
    }
  } catch (e) {
    console.error("Error scanning groups", e);
  }

  // 4. Hydrate Last Message (Decrypting preview)
  const hydratedChats = await Promise.all(chats.map(async (chat) => {
    const rawMsgs = await readFile<any[]>(`msgs_${chat.id}`);
    if (rawMsgs && Array.isArray(rawMsgs) && rawMsgs.length > 0) {
      const lastRaw = rawMsgs[rawMsgs.length - 1];
      try {
        const content = await decryptMessage(lastRaw.encrypted, chat.id);
        return { ...chat, lastMessage: { ...lastRaw, content } };
      } catch (e) {
        return chat; // Failed to decrypt preview, return basic chat info
      }
    }
    return chat;
  }));

  // 5. Sort by Timestamp Descending (Newest first)
  return hydratedChats.sort((a, b) => {
    const tA = a.lastMessage?.timestamp || 0;
    const tB = b.lastMessage?.timestamp || 0;
    return tB - tA;
  });
};
