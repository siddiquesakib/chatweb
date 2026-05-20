import dbConnect from "@/lib/db";
import Message from "./message";
import Conversation from "./conversation";
import Friendship from "./friendship";
import FriendRequest from "./friend-request";
import RateLimit from "./rate-limit";

export async function ensureIndexes() {
  await dbConnect();

  await Promise.all([
    Message.collection.createIndex({ conversationId: 1, _id: -1 }),
    Message.collection.createIndex({ conversationId: 1, senderId: 1, seen: 1 }),

    Conversation.collection.createIndex({ participants: 1 }),
    Conversation.collection.createIndex({ lastMessageAt: -1, createdAt: -1 }),

    Friendship.collection.createIndex({ user1: 1, user2: 1 }, { unique: true }),
    Friendship.collection.createIndex({ user1: 1 }),
    Friendship.collection.createIndex({ user2: 1 }),

    FriendRequest.collection.createIndex({ receiver: 1, status: 1 }),
    FriendRequest.collection.createIndex({ sender: 1, receiver: 1 }),

    RateLimit.collection.createIndex({ key: 1 }, { unique: true }),
    RateLimit.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 3600 }),
  ]);
}
