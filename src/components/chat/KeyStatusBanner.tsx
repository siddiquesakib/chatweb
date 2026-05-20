"use client";

import { useState } from "react";
import { KeyResetDialog } from "./KeyResetDialog";

interface KeyStatusBannerProps {
  keyMissing: boolean;
  keyVersion: number;
  onReset: () => Promise<{ ok: boolean; error?: string }>;
  onClear: () => Promise<void>;
}

export function KeyStatusBanner({
  keyMissing,
  keyVersion,
  onReset,
  onClear,
}: KeyStatusBannerProps) {
  const [showResetDialog, setShowResetDialog] = useState(false);

  if (keyMissing) {
    return (
      <div className="shrink-0 bg-danger/15 border-b border-danger/20 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-danger text-lg leading-none mt-0.5">&#9888;</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-danger">
              Encryption keys not found
            </p>
            <p className="text-xs text-muted mt-1">
              Your device does not have the private key required to decrypt
              messages. This usually happens when you clear browser data or use
              a new device.
            </p>
            <p className="text-xs text-muted mt-0.5">
              <span className="font-medium">You cannot read old messages.</span>{" "}
              New messages will use a fresh encryption key.
            </p>
            <button
              onClick={() => setShowResetDialog(true)}
              className="mt-2 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Generate new encryption keys
            </button>
          </div>
        </div>
        {showResetDialog && (
          <KeyResetDialog
            isOpen={showResetDialog}
            onClose={() => setShowResetDialog(false)}
            onReset={onReset}
            keyVersion={keyVersion}
          />
        )}
      </div>
    );
  }

  return null;
}
