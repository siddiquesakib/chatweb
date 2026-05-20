"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PendingRequest } from "@/types/chat";

interface FriendRequestsProps {
  requests: PendingRequest[];
  onAccept: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
  onReject: (requestId: string) => Promise<{ ok: boolean; error?: string }>;
}

export default function FriendRequests({ requests, onAccept, onReject }: FriendRequestsProps) {
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  if (requests.length === 0) return null;

  return (
    <div className="border-b">
      <div className="px-4 py-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Pending Requests
        </span>
        <span className="text-[10px] bg-accent-subtle text-accent px-1.5 py-0.5 rounded-full font-medium">
          {requests.length}
        </span>
      </div>

      <div className="pb-2 space-y-0.5">
        {requests.map((req) => (
          <div
            key={req._id}
            className="flex items-center gap-3 px-4 py-2"
          >
            <Avatar
              size="sm"
              src={req.sender.image || null}
              fallback={req.sender.name}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {req.sender.name}
              </p>
              <p className="text-[11px] text-muted truncate">
                @{req.sender.username}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  setAccepting(req._id);
                  const res = await onAccept(req._id);
                  setAccepting(null);
                  if (!res.ok) alert(res.error || "Failed to accept");
                }}
                disabled={accepting === req._id}
              >
                {accepting === req._id ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  "Accept"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  setRejecting(req._id);
                  const res = await onReject(req._id);
                  setRejecting(null);
                  if (!res.ok) alert(res.error || "Failed to reject");
                }}
                disabled={rejecting === req._id}
              >
                {rejecting === req._id ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  "✕"
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
