export interface KeyInfo {
  publicKey: string;
  keyVersion: number;
}

export interface ChatUser {
  id: string;
  name: string;
  image?: string;
  online: boolean;
  publicKey?: string | null;
  keyVersion?: number | null;
}

/**
 * SecureMessagePayload — the wire format that:
 *   1. Leaves the browser (POST /api/messages/send body)
 *   2. Gets stored in MongoDB (Message document)
 *   3. Travels over Pusher ("new-message" event payload)
 *
 * Only `encryptedText` and `iv` are ciphertext (AES-256-GCM).
 * All other fields are routing metadata in plaintext.
 *
 * Encryption layers (both happen client-side):
 *   Layer 1 (message): AES-256-GCM encrypts plaintext → encryptedText + iv
 *   Layer 2 (key exchange): RSA-OAEP encrypts the AES conversation key
 *     → stored as ConversationKeyBundle per participant
 */
export interface SecureMessagePayload {
  /** AES-256-GCM ciphertext, base64-encoded */
  encryptedText: string;
  /** Sender's user ID */
  senderId: string;
  /** Recipient's user ID */
  receiverId: string;
  /** Conversation this message belongs to */
  conversationId: string;
  /** AES-GCM initialization vector (12 bytes, base64-encoded) */
  iv: string;
  /** ISO 8601 UTC timestamp of when the message was composed */
  timestamp: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  /** Decrypted plaintext (client-only — never stored on server) */
  text?: string;
  /** AES-256-GCM ciphertext, base64 */
  encryptedText?: string;
  /** AES-GCM IV, 12 bytes base64 */
  iv?: string;
  seen: boolean;
  createdAt: Date;
}

export interface ConversationKeyBundle {
  userId: string;
  encryptedKey: string;
}

export interface Conversation {
  id: string;
  participants: ChatUser[];
  lastMessage?: Message | null;
  lastMessageAt?: Date | null;
  unreadCount?: number;
}

export interface FriendEntry {
  id: string;
  name: string;
  username: string;
  image: string;
  online: boolean;
  lastActiveAt: Date;
}

export interface PendingRequest {
  _id: string;
  sender: {
    _id: string;
    name: string;
    username: string;
    image: string;
  };
  status: string;
  createdAt: Date;
}
