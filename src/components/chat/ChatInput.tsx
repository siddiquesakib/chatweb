"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping?: () => void;
  sending?: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onTyping, sending = false, disabled = false }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingFiredRef = useRef(false);

  useEffect(() => {
    if (!sending && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [sending]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setText(val);
      autoResize();

      if (val.trim() && onTyping && !typingFiredRef.current) {
        onTyping();
        typingFiredRef.current = true;
        setTimeout(() => { typingFiredRef.current = false; }, 3000);
      }
      if (!val.trim()) {
        typingFiredRef.current = false;
      }
    },
    [onTyping, autoResize],
  );

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    onSend(trimmed);
    setText("");
    typingFiredRef.current = false;
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = text.trim().length > 0 && !sending && !disabled;

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none rounded-xl border bg-surface-alt px-4 py-[10px] text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all duration-150 max-h-32 disabled:opacity-50 leading-relaxed"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
        aria-label="Send message"
      >
        {sending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  );
}
