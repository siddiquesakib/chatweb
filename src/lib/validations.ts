import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  encryptedText: z.string().min(1),
  iv: z.string().min(1),
}).strict().refine((data) => !("text" in data), {
  message: "Plaintext is not accepted",
});

export const createConversationSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(2),
}).strict();

export const friendRequestSchema = z.object({
  usernameOrEmail: z.string().min(1).max(100),
}).strict();

export const acceptFriendSchema = z.object({
  requestId: z.string().min(1),
}).strict();

export const rejectFriendSchema = z.object({
  requestId: z.string().min(1),
}).strict();

export const removeFriendSchema = z.object({
  friendId: z.string().min(1),
}).strict();

export const typingSchema = z.object({
  conversationId: z.string().min(1),
}).strict();

export const seenSchema = z.object({
  conversationId: z.string().min(1),
}).strict();

export const setupKeySchema = z.object({
  publicKey: z.string().min(1),
  keyVersion: z.number().int().positive(),
}).strict();

export const conversationKeySchema = z.object({
  keyBundles: z.array(z.object({
    userId: z.string().min(1),
    encryptedKey: z.string().min(1),
  })).min(1),
}).strict();

export const searchUserSchema = z.object({
  q: z.string().min(1).max(100),
}).strict();
