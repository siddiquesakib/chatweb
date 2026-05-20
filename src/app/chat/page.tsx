"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/chat/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { useFriends } from "@/hooks/useFriends";
import { useConversations } from "@/hooks/useConversations";
import { usePresence } from "@/hooks/usePresence";
import { useE2EE } from "@/hooks/useE2EE";
import { usePusher } from "@/hooks/usePusher";
import { KeyStatusBanner } from "@/components/chat/KeyStatusBanner";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;

  const { subscribe, subscribePresence } = usePusher(currentUserId);
  const { onlineUsers } = usePresence(currentUserId, subscribePresence);
  const e2ee = useE2EE(currentUserId);

  const e2eeFns = useMemo(
    () => ({ encrypt: e2ee.encrypt, decrypt: e2ee.decrypt, decryptBatch: e2ee.decryptBatch }),
    [e2ee.encrypt, e2ee.decrypt, e2ee.decryptBatch],
  );

  const {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    loading: conversationsLoading,
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
  } = useConversations(
    currentUserId,
    e2eeFns,
    subscribe,
  );

  const {
    friends,
    pendingRequests,
    loading: friendsLoading,
    sendRequest,
    acceptRequest,
    rejectRequest,
  } = useFriends();

  const handleAcceptRequest = useCallback(
    async (requestId: string) => {
      const result = await acceptRequest(requestId);
      if (result.ok && result.conversationId) {
        fetchConversations();
      }
      return result;
    },
    [acceptRequest, fetchConversations],
  );

  const handleSelectFriend = useCallback(
    async (friendId: string) => {
      const convoId = conversations.find((c) =>
        c.participants.some((p) => p.id === friendId),
      )?.id;

      if (convoId) {
        await selectConversation(convoId);
      } else {
        await openFriendConversation(friendId);
      }
    },
    [conversations, selectConversation, openFriendConversation],
  );

  const handleSelectConversation = useCallback(
    (friendId: string) => {
      handleSelectFriend(friendId);
    },
    [handleSelectFriend],
  );

  const handleTyping = useCallback(() => {
    if (activeConversationId) emitTyping(activeConversationId);
  }, [activeConversationId, emitTyping]);

  const convoId = activeConversation?.id;
  useEffect(() => {
    if (e2ee.ready && convoId && participantKeys.length > 0 && !e2ee.initializing) {
      const checkAndSetupKey = async () => {
        const key = await e2ee.getConversationKey(convoId);
        if (!key) {
          await e2ee.setupConversationKey(convoId, participantKeys as { userId: string; publicKey: string }[]);
        }
      };
      checkAndSetupKey();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e2ee.ready, e2ee.initializing, convoId, participantKeys, e2ee.getConversationKey, e2ee.setupConversationKey]);

  const activeFriend = activeConversation
    ? friends.find(
        (f) =>
          activeConversation.participants.some((p) => p.id === f.id) &&
          f.id !== currentUserId,
      ) ?? activeConversation.participants.find((p) => p.id !== currentUserId)
    : null;

  const friendOnline = activeFriend ? onlineUsers.has(activeFriend.id) : false;

  if (!e2ee.ready) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          {!e2ee.keyMissing && (
            <div className="h-12 w-12 mx-auto mb-4 rounded-full border-[3px] border-accent border-t-transparent animate-spin" />
          )}
          <p className="text-sm text-muted">
            {e2ee.keyMissing
              ? "Encryption keys not found — action required"
              : "Initializing end-to-end encryption..."}
          </p>
          {e2ee.keyMissing && (
            <div className="mt-4">
              <p className="text-xs text-muted mb-4">
                Your device is missing encryption keys. You need to reset them to continue.
              </p>
              <button
                onClick={() => e2ee.resetKeys()}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
                disabled={e2ee.initializing}
              >
                {e2ee.initializing ? "Generating..." : "Generate new encryption keys"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <KeyStatusBanner
        keyMissing={e2ee.keyMissing}
        keyVersion={e2ee.keyVersion}
        onReset={e2ee.resetKeys}
        onClear={e2ee.clearKeys}
      />
      <div className="flex-1 flex overflow-hidden">
      <Sidebar
        friends={friends}
        conversations={conversations}
        activeConversationId={activeConversationId}
        currentUserId={currentUserId}
        pendingRequests={pendingRequests}
        onSelectFriend={handleSelectConversation}
        onSendRequest={sendRequest}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={rejectRequest}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        loading={friendsLoading && conversationsLoading}
        onlineUsers={onlineUsers}
        keyVersion={e2ee.keyVersion}
        hasPublicKey={!e2ee.keyMissing}
      />
      <ChatWindow
        messages={messages}
        currentUserId={currentUserId ?? ""}
        onSend={sendMessage}
        onTyping={activeConversationId ? handleTyping : undefined}
        onLoadOlder={loadOlderMessages}
        sending={sending}
        loading={loadingMessages || conversationsLoading}
        loadingOlder={loadingOlder}
        hasMore={hasMore}
        friendName={activeFriend?.name}
        friendOnline={friendOnline}
        isTyping={isTyping}
        sendError={sendError}
        onToggleSidebar={() => setSidebarOpen(true)}
      />
      </div>
    </div>
  );
}
