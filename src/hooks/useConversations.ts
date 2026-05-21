"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Conversation, Message } from "@/types/chat";

type AnyFn = (...args: unknown[]) => void;

const API_BASE = "/api";

const DEFAULT_FETCH_OPTS: RequestInit = {
  credentials: "include",
};

interface RawParticipant {
  _id: string;
  name: string;
  username: string;
  image: string;
  online: boolean;
  publicKey?: string | null;
  keyVersion?: number | null;
}

interface RawConversation {
  _id: string;
  participants: RawParticipant[];
  lastMessage: { text: string; senderId: string; senderName: string } | null;
  lastMessageAt: Date | null;
  createdAt: Date;
}

interface E2EEFunctions {
  encrypt: (plaintext: string, conversationId: string) => Promise<{ encryptedText: string; iv: string } | null>;
  decrypt: (encryptedText: string, iv: string, conversationId: string) => Promise<string | null>;
  decryptBatch?: (messages: { encryptedText: string; iv: string; conversationId: string }[]) => Promise<(string | null)[]>;
}

function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

function mapRawConversation(c: RawConversation): Conversation {
  return {
    id: c._id,
    participants: c.participants.map((p) => ({
      id: p._id,
      name: p.name,
      image: p.image,
      online: p.online,
      publicKey: p.publicKey ?? null,
      keyVersion: p.keyVersion ?? null,
    })),
    lastMessage: c.lastMessage
      ? {
          id: "",
          conversationId: c._id,
          senderId: c.lastMessage.senderId,
          text: c.lastMessage.text,
          seen: false,
          createdAt: new Date(),
        }
      : null,
    lastMessageAt: c.lastMessageAt,
    unreadCount: 0,
  };
}

async function decryptMessage(msg: Message, decrypt: (encryptedText: string, iv: string, conversationId: string) => Promise<string | null>): Promise<Message> {
  if (!msg.encryptedText || !msg.iv) return { ...msg, text: "🔒 Missing encrypted data" };
  const plaintext = await decrypt(msg.encryptedText, msg.iv, msg.conversationId);
  return { ...msg, text: plaintext ?? "🔒 Decryption failed" };
}

export function useConversations(
  currentUserId: string | null,
  e2ee: E2EEFunctions,
  subscribe: (channelName: string, events: Record<string, AnyFn>) => () => void,
) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const activeIdRef = useRef<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const cleanupFnsRef = useRef<Map<string, () => void>>(new Map());

  activeIdRef.current = activeConversationId;
  conversationsRef.current = conversations;
  messagesRef.current = messages;

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/conversations`, DEFAULT_FETCH_OPTS);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      const mapped: Conversation[] = (data.conversations ?? []).map(mapRawConversation);
      setConversations(sortConversations(mapped));
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [currentUserId, fetchConversations]);

  const markAsSeen = useCallback(async (conversationId: string) => {
    try {
      await fetch(`${API_BASE}/messages/seen`, {
        ...DEFAULT_FETCH_OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
    } catch {
    }
  }, []);

  const handleNewMessage = useCallback(
    (data: { message: Message; sender: { id: string } }) => {
      const isSelf = data.message.senderId === currentUserId;
      const convoId = data.message.conversationId;

      const processMsg = async () => {
        if (isSelf) return;

        let msg = data.message;
        if (msg.encryptedText && msg.iv) {
          msg = await decryptMessage(msg, e2ee.decrypt);
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          if (convoId !== activeIdRef.current) return prev;
          return [...prev, msg];
        });

        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== convoId) return c;
            const isActive = c.id === activeIdRef.current;
            return {
              ...c,
              lastMessage: msg,
              lastMessageAt: msg.createdAt,
              unreadCount: isActive ? 0 : (c.unreadCount ?? 0) + 1,
            };
          });
          return sortConversations(updated);
        });
      };

      processMsg();
    },
    [currentUserId, e2ee],
  );

  const handleTypingEvent = useCallback(
    (data: { senderId: string }) => {
      if (data.senderId === currentUserId) return;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setIsTyping(true);
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
    },
    [currentUserId],
  );

  const handleMessagesSeen = useCallback(
    (data: { conversationId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUserId && m.conversationId === data.conversationId
            ? { ...m, seen: true }
            : m,
        ),
      );
    },
    [currentUserId],
  );

  const subscribeToConversation = useCallback(
    (conversationId: string) => {
      if (!currentUserId) return;

      const existing = cleanupFnsRef.current.get(conversationId);
      if (existing) existing();

      const channelName = `private-chat-${conversationId}`;
      const cleanup = subscribe(channelName, {
        "new-message": handleNewMessage as (...args: unknown[]) => void,
        "typing": handleTypingEvent as (...args: unknown[]) => void,
        "messages-seen": handleMessagesSeen as (...args: unknown[]) => void,
      });
      cleanupFnsRef.current.set(conversationId, cleanup);
    },
    [currentUserId, subscribe, handleNewMessage, handleTypingEvent, handleMessagesSeen],
  );

  const handleConversationUpdate = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!currentUserId) return;

    const cleanup = subscribe(`private-user-${currentUserId}`, {
      "conversation-update": handleConversationUpdate as (...args: unknown[]) => void,
      "friendship-accepted": (() => {
        fetchConversations();
      }) as (...args: unknown[]) => void,
    });

    return cleanup;
  }, [currentUserId, subscribe, handleConversationUpdate, fetchConversations]);

  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    const cleanup = cleanupFnsRef.current.get(conversationId);
    if (cleanup) {
      cleanup();
      cleanupFnsRef.current.delete(conversationId);
    }
  }, []);

  const convoIds = useMemo(
    () => new Set(conversations.map((c) => c.id)),
    [conversations],
  );

  useEffect(() => {
    if (!currentUserId) return;

    for (const id of convoIds) {
      subscribeToConversation(id);
    }

    for (const [id] of cleanupFnsRef.current) {
      if (!convoIds.has(id)) {
        unsubscribeFromConversation(id);
      }
    }
  }, [convoIds, currentUserId, subscribeToConversation, unsubscribeFromConversation]);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      setActiveConversationId(conversationId);
      setMessages([]);
      setLoadingMessages(true);
      setHasMore(true);
      setIsTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );

      try {
        const res = await fetch(`${API_BASE}/messages/${conversationId}?limit=30`, DEFAULT_FETCH_OPTS);
        if (res.ok) {
          const data = await res.json();
          let msgs: Message[] = data.messages ?? [];
          if (e2ee.decryptBatch) {
            const toDecrypt = msgs.filter((m: Message) => m.encryptedText && m.iv);
            const decrypted = await e2ee.decryptBatch(
              toDecrypt.map((m: Message) => ({
                encryptedText: m.encryptedText!,
                iv: m.iv!,
                conversationId: m.conversationId,
              })),
            );
            let idx = 0;
            msgs = msgs.map((m: Message) => {
              if (m.encryptedText && m.iv) {
                const plaintext = decrypted[idx++];
                return { ...m, text: plaintext ?? "🔒 Decryption failed" };
              }
              return m;
            });
          } else {
            msgs = await Promise.all(
              msgs.map((m: Message) => decryptMessage(m, e2ee.decrypt)),
            );
          }
          setMessages(msgs);
          setHasMore(data.hasMore ?? false);
        }
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }

      markAsSeen(conversationId);
    },
    [markAsSeen, e2ee],
  );

  const loadOlderMessages = useCallback(async () => {
    const convoId = activeIdRef.current;
    const msgs = messagesRef.current;
    if (!convoId || loadingOlder || !hasMore) return;

    setLoadingOlder(true);
    try {
      const oldest = msgs[0];
      if (!oldest) {
        setLoadingOlder(false);
        return;
      }
      const res = await fetch(
        `${API_BASE}/messages/${convoId}?limit=30&before=${oldest.id}`,
        DEFAULT_FETCH_OPTS,
      );
      if (res.ok) {
        const data = await res.json();
        let newMsgs: Message[] = data.messages ?? [];
        if (e2ee.decryptBatch) {
          const toDecrypt = newMsgs.filter((m: Message) => m.encryptedText && m.iv);
          const decrypted = await e2ee.decryptBatch(
            toDecrypt.map((m: Message) => ({
              encryptedText: m.encryptedText!,
              iv: m.iv!,
              conversationId: m.conversationId,
            })),
          );
          let idx = 0;
          newMsgs = newMsgs.map((m: Message) => {
            if (m.encryptedText && m.iv) {
              const plaintext = decrypted[idx++];
              return { ...m, text: plaintext ?? "🔒 Decryption failed" };
            }
            return m;
          });
        } else if (e2ee) {
          newMsgs = await Promise.all(
            newMsgs.map((m: Message) => decryptMessage(m, e2ee.decrypt)),
          );
        }
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filtered = newMsgs.filter(
            (m: Message) => !existingIds.has(m.id),
          );
          if (filtered.length === 0) return prev;
          return [...filtered, ...prev];
        });
        setHasMore(data.hasMore ?? false);
      }
    } catch {
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, e2ee]);

  const openFriendConversation = useCallback(
    async (friendId: string): Promise<string | null> => {
      if (!currentUserId) return null;

      const existing = conversations.find((c) =>
        c.participants.some((p) => p.id === friendId),
      );
      if (existing) {
        await selectConversation(existing.id);
        return existing.id;
      }

      try {
        const res = await fetch(`${API_BASE}/conversations`, {
          ...DEFAULT_FETCH_OPTS,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantIds: [currentUserId, friendId] }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        await fetchConversations();
        await selectConversation(data.conversationId);
        return data.conversationId;
      } catch {
        return null;
      }
    },
    [conversations, selectConversation, currentUserId, fetchConversations],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const convoId = activeConversationId;
      if (!convoId || !currentUserId) return;

      setSendError(null);

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: Message = {
        id: tempId,
        conversationId: convoId,
        senderId: currentUserId,
        text: text.trim(),
        seen: false,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, optimistic]);
      setSending(true);

      const trimmed = text.trim();

      try {
        const encrypted = await e2ee.encrypt(trimmed, convoId);

        if (!encrypted) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setSendError("Encryption failed — message not sent");
          setSending(false);
          return;
        }

        const res = await fetch(`${API_BASE}/messages/send`, {
          ...DEFAULT_FETCH_OPTS,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convoId,
            encryptedText: encrypted.encryptedText,
            iv: encrypted.iv,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          let serverMsg = data.message as Message;
          if (serverMsg.encryptedText && serverMsg.iv) {
            serverMsg = await decryptMessage(serverMsg, e2ee.decrypt);
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? serverMsg : m)),
          );
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === convoId
                ? {
                    ...c,
                    lastMessage: serverMsg,
                    lastMessageAt: serverMsg.createdAt,
                  }
                : c,
            );
            return sortConversations(updated);
          });
        } else {
          const data = await res.json().catch(() => ({}));
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setSendError(data.error ?? "Failed to send message");
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setSendError("Network error");
      } finally {
        setSending(false);
      }
    },
    [activeConversationId, currentUserId, e2ee],
  );

  const emitTyping = useCallback(
    (conversationId: string) => {
      if (!currentUserId) return;
      fetch(`${API_BASE}/messages/typing`, {
        ...DEFAULT_FETCH_OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      }).catch(() => {});
    },
    [currentUserId],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const participantKeys = useMemo(() => {
    if (!activeConversation) return [];
    return activeConversation.participants
      .filter((p) => p.id !== currentUserId)
      .map((p) => ({
        userId: p.id,
        publicKey: p.publicKey ?? undefined,
        keyVersion: p.keyVersion ?? undefined,
      }))
      .filter((p) => p.publicKey);
  }, [activeConversation, currentUserId]);

  return {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    loading,
    loadingMessages,
    loadingOlder,
    hasMore,
    sending,
    sendError,
    isTyping,
    participantKeys,
    selectConversation,
    openFriendConversation,
    sendMessage,
    loadOlderMessages,
    emitTyping,
    refetch: fetchConversations,
  };
}
