
export interface User {
  username: string;
  isAuthenticated: boolean;
  avatar?: string; // Base64 string
}

export interface UserProfile {
  username: string;
  passwordHash: string;
  avatar: string;
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
  content: string;
  timestamp: number;
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
