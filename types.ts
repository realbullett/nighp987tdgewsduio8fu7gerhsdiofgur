
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
  friends: string[];
  incomingRequests: string[];
  outgoingRequests: string[];
}

export interface Message {
  role: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string; // Decrypted content
  timestamp: number;
  // Supabase specific
  chat_id?: string;
  iv?: string; // needed for decryption if stored raw
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
