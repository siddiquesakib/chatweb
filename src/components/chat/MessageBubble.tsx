"use client";

import { memo } from "react";

interface MessageBubbleProps {
  text?: string;
  timestamp: Date;
  isSender: boolean;
  showAvatar?: boolean;
  senderName?: string;
  seen?: boolean;
  encrypted?: boolean;
  decryptionFailed?: boolean;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const MessageBubble = memo(function MessageBubble({
  text,
  timestamp,
  isSender,
  showAvatar,
  senderName,
  seen,
  encrypted = true,
  decryptionFailed = false,
}: MessageBubbleProps) {
  return (
    <div className={`flex gap-2 animate-fade-in-up ${isSender ? "flex-row-reverse" : "flex-row"}`}>
      {showAvatar && !isSender && (
        <div className="h-8 w-8 shrink-0 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-xs font-medium mt-1">
          {senderName?.charAt(0).toUpperCase() ?? "?"}
        </div>
      )}

      {(!showAvatar || isSender) && <div className="w-8 shrink-0" />}

      <div className={`flex flex-col max-w-[75%] ${isSender ? "items-end" : "items-start"}`}>
        {showAvatar && !isSender && senderName && (
          <span className="text-[10px] text-muted mb-1 ml-1 font-medium">{senderName}</span>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 break-words transition-all duration-150 ${
            isSender
              ? "bg-accent text-white rounded-br-md"
              : decryptionFailed
                ? "bg-danger/10 text-danger border border-danger/20 rounded-bl-md"
                : "bg-surface-alt text-foreground rounded-bl-md"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text ?? ""}</p>
          <div className={`flex items-center gap-1.5 mt-1 ${isSender ? "justify-end" : "justify-start"}`}>
            <span
              className={`text-[10px] leading-none ${
                isSender ? "text-white/60" : decryptionFailed ? "text-danger/60" : "text-muted"
              }`}
            >
              {formatTime(timestamp)}
            </span>
            {isSender && (
              <span className={`text-[10px] leading-none ${seen ? "text-blue-300" : "text-white/40"}`}>
                {seen ? "✓✓" : "✓"}
              </span>
            )}
            {encrypted && !decryptionFailed && (
              <span
                className={`text-[10px] leading-none ${isSender ? "text-white/40" : "text-muted"}`}
                title="End-to-end encrypted"
              >
                &#128274;
              </span>
            )}
            {decryptionFailed && (
              <span
                className="text-[10px] leading-none text-danger"
                title="Could not decrypt — keys may have changed"
              >
                &#128274;
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
