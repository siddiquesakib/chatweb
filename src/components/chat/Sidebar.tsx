"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AddFriend from "./AddFriend";
import FriendRequests from "./FriendRequests";
import { SecurityInfo } from "./SecurityInfo";
import type { FriendEntry, PendingRequest, Conversation } from "@/types/chat";

interface SidebarProps {
  friends: FriendEntry[];
  pendingRequests: PendingRequest[];
  conversations: Conversation[];
  activeConversationId: string | null;
  currentUserId: string | null;
  onSelectFriend: (friendId: string) => void;
  onSendRequest: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  onAcceptRequest: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
  onRejectRequest: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  onlineUsers: Set<string>;
  keyVersion?: number;
  hasPublicKey?: boolean;
}

function formatRelativeTime(date?: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-skeleton">
      <div className="h-10 w-10 shrink-0 rounded-full bg-border" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded bg-border" />
        <div className="h-2.5 w-44 rounded bg-border" />
      </div>
    </div>
  );
}

export default function Sidebar({
  friends,
  pendingRequests,
  conversations,
  activeConversationId,
  currentUserId,
  onSelectFriend,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  open,
  onClose,
  loading,
  onlineUsers,
  keyVersion = 0,
  hasPublicKey = false,
}: SidebarProps) {
  const [showAdd, setShowAdd] = useState(false);

  function getFriendForConversation(convo: Conversation): {
    id: string;
    name: string;
    image: string;
  } | null {
    const otherParticipant = convo.participants.find((p) => p.id !== currentUserId);
    if (otherParticipant) {
      return {
        id: otherParticipant.id,
        name: otherParticipant.name,
        image: otherParticipant.image ?? "",
      };
    }
    const friend = friends.find(
      (f) => convo.participants.some((p) => p.id === f.id) && f.id !== currentUserId,
    );
    if (friend) {
      return { id: friend.id, name: friend.name, image: friend.image };
    }
    return null;
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 md:w-80 shrink-0 bg-surface border-r flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-14 shrink-0 flex items-center gap-2 px-4 border-b">
          <h2 className="text-sm font-semibold tracking-wide text-foreground">
            Messages
          </h2>
          <div className="ml-auto flex items-center gap-1">
            <SecurityInfo
              keyVersion={keyVersion}
              hasPublicKey={hasPublicKey}
              currentUserId={currentUserId}
            />
            {!loading && (
              <span className="text-[11px] text-muted mr-1">
                {conversations.length}
              </span>
            )}
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface-alt transition-colors"
              aria-label="Add friend"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {showAdd && <AddFriend onSendRequest={onSendRequest} />}

        <FriendRequests
          requests={pendingRequests}
          onAccept={onAcceptRequest}
          onReject={onRejectRequest}
        />

        <nav className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="h-12 w-12 rounded-full bg-surface-alt flex items-center justify-center mb-3">
                <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-muted">No conversations yet</p>
              <p className="text-xs text-muted/60 mt-1">
                {showAdd ? "Search for users above" : "Click + to add friends"}
              </p>
            </div>
          ) : (
            conversations.map((convo) => {
              const friend = getFriendForConversation(convo);
              if (!friend) return null;
              const isActive = convo.id === activeConversationId;
              return (
                <button
                  key={convo.id}
                  onClick={() => {
                    onSelectFriend(friend.id);
                    onClose();
                  }}
                  className={`relative w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 ${
                    isActive
                      ? "bg-accent-subtle"
                      : "hover:bg-surface-alt active:bg-border/50"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-r-full bg-accent" />
                  )}

                    <div className="relative shrink-0">
                    <Avatar
                      size="md"
                      src={friend.image || null}
                      fallback={friend.name}
                    />
                    {onlineUsers.has(friend.id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-surface" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`block text-sm truncate ${
                            isActive ? "font-semibold text-foreground" : "font-medium text-foreground"
                          }`}
                        >
                          {friend.name}
                        </span>
                        {(convo.unreadCount ?? 0) > 0 && (
                          <span className="shrink-0 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold px-1.5 leading-none">
                            {convo.unreadCount! > 99 ? "99+" : convo.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted shrink-0">
                        {formatRelativeTime(convo.lastMessageAt)}
                      </span>
                    </div>
                    {convo.lastMessage && (
                      <span className="block text-xs text-muted truncate mt-0.5">
                        {convo.lastMessage.senderId === currentUserId ? "You: " : ""}
                        {convo.lastMessage.text}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
}
