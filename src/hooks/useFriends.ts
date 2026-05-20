"use client";

import { useState, useCallback, useEffect } from "react";
import type { FriendEntry, PendingRequest } from "@/types/chat";

const API_BASE = "/api";

interface AcceptResult {
  ok: boolean;
  error?: string;
  friendId?: string;
  conversationId?: string;
  partnerPublicKey?: string | null;
}

export function useFriends() {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/friends/list`);
      if (!res.ok) throw new Error("Failed to fetch friends");
      const data = await res.json();
      setFriends(data.friends ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/friends/requests/pending`);
      if (!res.ok) return;
      const data = await res.json();
      setPendingRequests(data.requests ?? []);
    } catch {
      setPendingRequests([]);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, [fetchFriends, fetchPendingRequests]);

  const sendRequest = useCallback(async (receiverId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/friends/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, []);

  const acceptRequest = useCallback(async (requestId: string): Promise<AcceptResult> => {
    try {
      const res = await fetch(`${API_BASE}/friends/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      await fetchFriends();
      await fetchPendingRequests();
      return {
        ok: true,
        friendId: data.friendId,
        conversationId: data.conversationId,
        partnerPublicKey: data.partnerPublicKey,
      };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, [fetchFriends, fetchPendingRequests]);

  const rejectRequest = useCallback(async (requestId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/friends/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      await fetchPendingRequests();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, [fetchPendingRequests]);

  const removeFriend = useCallback(async (friendId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/friends/remove`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      await fetchFriends();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, [fetchFriends]);

  return {
    friends,
    pendingRequests,
    loading,
    error,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refetch: fetchFriends,
  };
}
