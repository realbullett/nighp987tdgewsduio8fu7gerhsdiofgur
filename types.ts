

export interface User {
  username: string;
  isAuthenticated: boolean;
  avatar?: string; // Base64 string
  id?: string; // Supabase UUID
}

export type UserStatus = 'online' | 'idle' | 'dnd' | 'invisible' | 'offline';

export interface UserProfile {
  id: string;
  username: string;
  avatar: string; // Base64 string
  banner?: string; // Base64 string
  bio?: string;
  public_email?: string;
  show_email?: boolean;
  friends: string[];
  incomingRequests: string[];
  outgoingRequests: string[];
}

export interface Attachment {
  type: 'image' | 'file';
  url: string; // Base64 data
  name?: string;
  size?: number;
  mimeType?: string;
}

export interface ReplyContext {
  id: string;
  sender: string;
  text: string;
}

export interface MessageContent {
  text: string;
  attachments?: Attachment[];
  reactions?: Record<string, string[]>; // emoji -> list of usernames
  replyTo?: ReplyContext;
  isForwarded?: boolean;
}

export interface Message {
  role: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string; // Now stores a JSON string of MessageContent, or plain text for legacy
  timestamp: number;
  // Supabase specific
  chat_id?: string;
  iv?: string; 
}

export interface ChatRoom {
  id: string;
  type: 'group' | 'dm';
  name: string;
  description?: string; // Optional description for groups
  avatar?: string; // For groups
  participants: string[];
  admins?: string[]; // List of usernames who are admins
  createdBy?: string;
  lastMessage?: ChatMessage;
}

export interface EncryptedFile {
  iv: string;
  data: string; // The encrypted ciphertext
}

// --- FORUMS ---
export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ForumThread {
  id: string;
  category_id: string;
  author: string;
  title: string;
  content: string; // The initial post text
  created_at: string;
  updated_at: string;
  tags?: string[];
  banner?: string; // Base64 or URL
  attachments?: Attachment[];
  views?: number;
  reply_count?: number; // Virtual field for UI
}

export interface ForumPost {
  id: string;
  thread_id: string;
  author: string;
  content: string;
  created_at: string;
}