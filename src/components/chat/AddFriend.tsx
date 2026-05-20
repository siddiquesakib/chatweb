"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

interface SearchResult {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string;
}

interface AddFriendProps {
  onSendRequest: (userId: string) => Promise<{ ok: boolean; error?: string }>;
}

export default function AddFriend({ onSendRequest }: AddFriendProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.users ?? []);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function handleSend(userId: string) {
    setSending(userId);
    const result = await onSendRequest(userId);
    setSending(null);
    setFeedback({ id: userId, msg: result.error ?? "Request sent!", ok: result.ok });
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <div className="p-4 border-b">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by email or username..."
        className="w-full rounded-lg border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
      />

      {query.length >= 2 && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {searching && results.length === 0 && (
            <p className="text-xs text-muted py-2 text-center">Searching...</p>
          )}
          {!searching && results.length === 0 && (
            <p className="text-xs text-muted py-2 text-center">No users found</p>
          )}
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-alt transition-colors"
            >
              <Avatar size="sm" src={user.image || null} fallback={user.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-[11px] text-muted truncate">@{user.username}</p>
              </div>
              <Button
                size="sm"
                variant={feedback?.id === user.id && feedback.ok ? "ghost" : "primary"}
                onClick={() => handleSend(user.id)}
                disabled={sending === user.id}
                className="shrink-0"
              >
                {sending === user.id ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : feedback?.id === user.id ? (
                  feedback.ok ? "Sent" : "Retry"
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
