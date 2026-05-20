"use client";

import { useState } from "react";

interface KeyResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => Promise<{ ok: boolean; error?: string }>;
  keyVersion: number;
}

export function KeyResetDialog({
  isOpen,
  onClose,
  onReset,
  keyVersion,
}: KeyResetDialogProps) {
  const [step, setStep] = useState<"warning" | "confirming" | "done" | "error">("warning");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm() {
    setStep("confirming");
    setError(null);
    const result = await onReset();
    if (result.ok) {
      setStep("done");
    } else {
      setStep("error");
      setError(result.error ?? "Key reset failed");
    }
  }

  function handleClose() {
    setStep("warning");
    setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <div
        className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "warning" && (
          <>
            <div className="p-5">
              <div className="h-10 w-10 rounded-full bg-danger/15 flex items-center justify-center mb-4">
                <span className="text-danger text-lg">&#9888;</span>
              </div>
              <h2 className="text-base font-bold text-foreground mb-2">
                Reset encryption keys?
              </h2>
              <div className="space-y-3 text-sm text-muted">
                <p>
                  Your current private key (version {keyVersion}) was not found
                  on this device. Generating new keys will:
                </p>
                <ul className="space-y-2 list-disc pl-4">
                  <li className="text-danger">
                    <span className="font-medium">Permanently lose access</span>{" "}
                    to all past messages in every conversation
                  </li>
                  <li>
                    Create a fresh key pair (version {keyVersion + 1}) for new
                    conversations
                  </li>
                  <li>
                    Upload your new public key to the server so friends can
                    send you encrypted messages
                  </li>
                </ul>
                <p className="text-xs text-muted/70 italic mt-2">
                  This cannot be undone. Make sure you want to proceed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 bg-surface-alt border-t border-border">
              <button
                onClick={handleClose}
                className="h-9 px-4 text-sm rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="h-9 px-4 text-sm rounded-lg bg-danger text-white hover:opacity-90 font-medium transition-all"
              >
                Generate new keys
              </button>
            </div>
          </>
        )}

        {step === "confirming" && (
          <div className="p-8 text-center">
            <div className="h-10 w-10 mx-auto mb-4 rounded-full border-[3px] border-accent border-t-transparent animate-spin" />
            <p className="text-sm text-foreground font-medium">
              Generating new encryption keys...
            </p>
            <p className="text-xs text-muted mt-1">
              This uses your device&apos;s secure hardware
            </p>
          </div>
        )}

        {step === "done" && (
          <>
            <div className="p-5">
              <div className="h-10 w-10 rounded-full bg-success/15 flex items-center justify-center mb-4">
                <span className="text-success text-lg">&#10003;</span>
              </div>
              <h2 className="text-base font-bold text-foreground mb-2">
                Keys generated successfully
              </h2>
              <div className="space-y-2 text-sm text-muted">
                <p>
                  Your new encryption key (version {keyVersion + 1}) is ready.
                </p>
                <p>
                  <span className="font-medium text-warning">Note:</span> You
                  will not be able to read messages sent before this reset.
                  Friends will automatically use your new key for future
                  conversations.
                </p>
              </div>
            </div>
            <div className="flex justify-end px-5 py-3 bg-surface-alt border-t border-border">
              <button
                onClick={handleClose}
                className="h-9 px-4 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover font-medium transition-all"
              >
                Got it
              </button>
            </div>
          </>
        )}

        {step === "error" && (
          <>
            <div className="p-5">
              <div className="h-10 w-10 rounded-full bg-danger/15 flex items-center justify-center mb-4">
                <span className="text-danger text-lg">&#10007;</span>
              </div>
              <h2 className="text-base font-bold text-foreground mb-2">
                Key reset failed
              </h2>
              <p className="text-sm text-danger">{error ?? "Unknown error"}</p>
              <p className="text-xs text-muted mt-2">
                Check your connection and try again. If the problem persists,
                clear your site data and reload.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 bg-surface-alt border-t border-border">
              <button
                onClick={handleClose}
                className="h-9 px-4 text-sm rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleConfirm}
                className="h-9 px-4 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover font-medium transition-all"
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
