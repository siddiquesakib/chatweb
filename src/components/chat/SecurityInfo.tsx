"use client";

import { useState } from "react";

interface SecurityInfoProps {
  keyVersion?: number;
  hasPublicKey?: boolean;
  currentUserId?: string | null;
}

export function SecurityInfo({ keyVersion = 0, hasPublicKey = false }: SecurityInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-7 w-7 flex items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface-alt transition-colors"
        aria-label="Security info"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-9.364a9 9 0 110 12.728 9 9 0 010-12.728z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-xl border bg-surface shadow-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Security</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Encryption</span>
                <span className="flex items-center gap-1 text-success">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  End-to-end
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Key version</span>
                <span className="font-mono text-foreground">v{keyVersion}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Keys loaded</span>
                <span className={hasPublicKey ? "text-success" : "text-warning"}>
                  {hasPublicKey ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
