"use client";

import { useEffect, useRef, useCallback } from "react";
import { getPusherClient } from "@/lib/pusher/client";
import type { Channel } from "pusher-js";

type AnyFn = (...args: unknown[]) => void;
type EventMap = Record<string, Set<AnyFn>>;

export function usePusher(currentUserId: string | null) {
  const channelsRef = useRef<Map<string, Channel>>(new Map());
  const eventHandlersRef = useRef<Map<string, EventMap>>(new Map());
  const refCountRef = useRef<Map<string, number>>(new Map());

  const subscribe = useCallback(
    (channelName: string, events: Record<string, AnyFn>) => {
      if (!currentUserId) return () => {};

      try {
        const client = getPusherClient();
        let channel = channelsRef.current.get(channelName);
        if (!channel) {
          channel = client.subscribe(channelName);
          channelsRef.current.set(channelName, channel);
        }

        const eventMap = eventHandlersRef.current.get(channelName) ?? {};
        for (const [event, handler] of Object.entries(events)) {
          if (!eventMap[event]) {
            eventMap[event] = new Set();
          }
          eventMap[event].add(handler);
          channel.bind(event, handler as (data: unknown) => void);
        }
        eventHandlersRef.current.set(channelName, eventMap);

        const count = refCountRef.current.get(channelName) ?? 0;
        refCountRef.current.set(channelName, count + 1);

        const cleanup = () => {
          const ch = channelsRef.current.get(channelName);
          const handlers = eventHandlersRef.current.get(channelName);
          if (ch && handlers) {
            for (const [event, handler] of Object.entries(events)) {
              handlers[event]?.delete(handler);
              if (handlers[event]?.size === 0) {
                ch.unbind(event);
                delete handlers[event];
              }
            }
          }

          const remaining = (refCountRef.current.get(channelName) ?? 1) - 1;
          if (remaining <= 0) {
            refCountRef.current.delete(channelName);
            eventHandlersRef.current.delete(channelName);
            try {
              client.unsubscribe(channelName);
            } catch {}
            channelsRef.current.delete(channelName);
          } else {
            refCountRef.current.set(channelName, remaining);
          }
        };

        return cleanup;
      } catch {
        return () => {};
      }
    },
    [currentUserId],
  );

  const unsubscribe = useCallback((channelName: string) => {
    const channel = channelsRef.current.get(channelName);
    if (!channel) return;
    try {
      const client = getPusherClient();
      client.unsubscribe(channelName);
    } catch {}
    channelsRef.current.delete(channelName);
    eventHandlersRef.current.delete(channelName);
    refCountRef.current.delete(channelName);
  }, []);

  const subscribePresence = useCallback(
    (
      channelName: string,
      events: {
        onSubscriptionSucceeded?: (members: { members: Record<string, unknown> }) => void;
        onMemberAdded?: (member: { id: string }) => void;
        onMemberRemoved?: (member: { id: string }) => void;
      },
    ) => {
      if (!currentUserId) return () => {};

      try {
        const client = getPusherClient();
        let channel = channelsRef.current.get(channelName);
        if (!channel) {
          channel = client.subscribe(channelName);
          channelsRef.current.set(channelName, channel);
        }

        if (events.onSubscriptionSucceeded) {
          channel.bind("pusher:subscription_succeeded", events.onSubscriptionSucceeded as (data: unknown) => void);
        }
        if (events.onMemberAdded) {
          channel.bind("pusher:member_added", events.onMemberAdded as (data: unknown) => void);
        }
        if (events.onMemberRemoved) {
          channel.bind("pusher:member_removed", events.onMemberRemoved as (data: unknown) => void);
        }

        const cleanup = () => {
          try {
            const ch = channelsRef.current.get(channelName);
            if (!ch) return;
            if (events.onSubscriptionSucceeded) ch.unbind("pusher:subscription_succeeded");
            if (events.onMemberAdded) ch.unbind("pusher:member_added");
            if (events.onMemberRemoved) ch.unbind("pusher:member_removed");
            const client = getPusherClient();
            client.unsubscribe(channelName);
          } catch {}
          channelsRef.current.delete(channelName);
        };

        return cleanup;
      } catch {
        return () => {};
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    const channels = channelsRef.current;
    return () => {
      try {
        const client = getPusherClient();
        for (const [channelName] of channels) {
          client.unsubscribe(channelName);
        }
        channels.clear();
      } catch {}
    };
  }, []);

  return { subscribe, unsubscribe, subscribePresence };
}
