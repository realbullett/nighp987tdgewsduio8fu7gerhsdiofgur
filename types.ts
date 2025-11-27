
export interface User {
  username: string;
  isAuthenticated: boolean;
  avatar?: string; // Base64 string
  id?: string; // Supabase UUID
}

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

export interface MessageContent {
  text: string;
  attachments?: Attachment[];
  reactions?: Record<string, string[]>; // emoji -> list of usernames
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
