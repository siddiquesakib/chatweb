"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const PRESENCE_CHANNEL = "presence-chat-app";

export function usePresence(
  currentUserId: string | null,
  subscribePresence: (
    channelName: string,
    events: {
      onSubscriptionSucceeded?: (members: { members: Record<string, unknown> }) => void;
      onMemberAdded?: (member: { id: string }) => void;
      onMemberRemoved?: (member: { id: string }) => void;
    },
  ) => () => void,
) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const onlineUsersRef = useRef<Set<string>>(new Set());

  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  useEffect(() => {
    if (!currentUserId) return;

    const cleanup = subscribePresence(PRESENCE_CHANNEL, {
      onSubscriptionSucceeded: (members) => {
        const ids = new Set(Object.keys(members.members));
        onlineUsersRef.current = ids;
        setOnlineUsers(ids);
      },
      onMemberAdded: (member) => {
        onlineUsersRef.current = new Set(onlineUsersRef.current).add(member.id);
        setOnlineUsers(new Set(onlineUsersRef.current));
      },
      onMemberRemoved: (member) => {
        const next = new Set(onlineUsersRef.current);
        next.delete(member.id);
        onlineUsersRef.current = next;
        setOnlineUsers(next);
      },
    });

    return cleanup;
  }, [currentUserId, subscribePresence]);

  return { onlineUsers, isOnline };
}
