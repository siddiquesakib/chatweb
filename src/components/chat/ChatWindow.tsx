"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Message } from "@/types/chat";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
  onSend: (text: string) => void;
  onTyping?: () => void;
  onLoadOlder?: () => void;
  sending?: boolean;
  loading?: boolean;
  loadingOlder?: boolean;
  hasMore?: boolean;
  friendName?: string;
  friendOnline?: boolean;
  isTyping?: boolean;
  sendError?: string | null;
  onToggleSidebar?: () => void;
}

function SkeletonBubble({ isSender }: { isSender: boolean }) {
  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} animate-skeleton`}>
      <div className={`space-y-2 ${isSender ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`h-8 rounded-xl bg-border ${isSender ? "w-48" : "w-36"}`} />
        <div className={`h-8 rounded-xl bg-border ${isSender ? "w-32" : "w-52"}`} />
      </div>
    </div>
  );
}

export default function ChatWindow({
  messages,
  currentUserId,
  onSend,
  onTyping,
  onLoadOlder,
  sending = false,
  loading = false,
  loadingOlder = false,
  hasMore = false,
  friendName,
  friendOnline,
  isTyping = false,
  sendError,
  onToggleSidebar,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const isNearBottomRef = useRef(true);

  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 150;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (!containerRef.current || loading) return;
    const wasAppend = messages.length > prevMessageCountRef.current;
    if (wasAppend && isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    if (messages.length < prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, loading]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !onLoadOlder || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingOlder) {
          onLoadOlder();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadOlder, hasMore, loadingOlder]);

  if (!friendName) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-surface-alt flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-muted">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b bg-surface">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1 -ml-1 text-muted hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3 animate-skeleton">
            <div className="h-2.5 w-2.5 rounded-full bg-border" />
            <div className="h-4 w-32 rounded bg-border" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <SkeletonBubble isSender={false} />
          <SkeletonBubble isSender={true} />
          <SkeletonBubble isSender={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b bg-surface">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1 -ml-1 text-muted hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${friendOnline ? "bg-success" : "bg-border"}`} />
          <h1 className="text-sm font-semibold text-foreground truncate">{friendName}</h1>
          <span className="text-[10px] text-muted flex items-center gap-1 shrink-0" title="End-to-end encrypted">
            &#128274; <span className="hidden sm:inline">E2EE</span>
          </span>
        </div>
      </header>

      <div
        ref={containerRef}
        onScroll={checkNearBottom}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
      >
        {hasMore && (
          <div ref={topSentinelRef} className="flex justify-center py-2">
            {loadingOlder ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : (
              <span className="text-[11px] text-muted">Scroll for older messages</span>
            )}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showAvatar = !prev || prev.senderId !== msg.senderId;
            return (
              <MessageBubble
                key={msg.id}
                text={msg.text}
                timestamp={msg.createdAt}
                isSender={msg.senderId === currentUserId}
                showAvatar={showAvatar && msg.senderId !== currentUserId}
                senderName={friendName}
                seen={msg.seen}
                encrypted={!!msg.encryptedText}
                decryptionFailed={msg.text === "🔒 Decryption failed"}
              />
            );
          })
        )}

        {isTyping && (
          <div className="flex items-center gap-2 pl-1 animate-fade-in-up">
            <div className="h-8 w-8 shrink-0 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-xs font-medium">
              {friendName?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="bg-surface-alt rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div className="shrink-0 px-4 py-2 bg-danger/10 border-t border-danger/20">
          <p className="text-xs text-danger font-medium">{sendError}</p>
        </div>
      )}

      <div className="shrink-0 border-t bg-surface p-4">
        <ChatInput onSend={onSend} onTyping={onTyping} sending={sending} />
      </div>
    </div>
  );
}
