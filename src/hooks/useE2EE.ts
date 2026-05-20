"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
  generateConversationKey,
  encryptConversationKey,
  decryptConversationKey,
  encryptMessage as cryptoEncrypt,
  decryptMessage as cryptoDecrypt,
} from "@/lib/crypto";
import { storeKeyPair, getKeyPair, deleteKeyPair } from "@/lib/db/crypto-store";

const API_BASE = "/api";

const DECRYPT_CONCURRENCY = 4;

interface DecryptTask {
  encryptedText: string;
  iv: string;
  conversationId: string;
  resolve: (plaintext: string | null) => void;
}

export function useE2EE(currentUserId: string | null) {
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [keyMissing, setKeyMissing] = useState(false);
  const [keyVersion, setKeyVersion] = useState(0);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const publicKeyRef = useRef<CryptoKey | null>(null);
  const publicKeySpkiRef = useRef<string>("");
  const keyVersionRef = useRef(0);
  const initGuardRef = useRef(false);

  const conversationKeysRef = useRef<Map<string, CryptoKey>>(new Map());

  const decryptQueueRef = useRef<DecryptTask[]>([]);
  const decryptProcessingRef = useRef(false);

  const getConversationKeyInternal = useCallback(
    async (conversationId: string): Promise<CryptoKey | null> => {
      if (!currentUserId) return null;

      const cached = conversationKeysRef.current.get(conversationId);
      if (cached) return cached;

      if (!privateKeyRef.current) return null;

      try {
        const res = await fetch(`${API_BASE}/conversations/${conversationId}/key`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.encryptedKey) return null;

        const key = await decryptConversationKey(data.encryptedKey, privateKeyRef.current);
        conversationKeysRef.current.set(conversationId, key);
        return key;
      } catch {
        return null;
      }
    },
    [currentUserId],
  );

  const processDecryptQueue = useCallback(async () => {
    if (decryptProcessingRef.current) return;
    decryptProcessingRef.current = true;

    while (decryptQueueRef.current.length > 0) {
      const batch = decryptQueueRef.current.splice(0, DECRYPT_CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (task) => {
          try {
            const key = await getConversationKeyInternal(task.conversationId);
            if (!key) {
              task.resolve(null);
              return;
            }
            const plaintext = await cryptoDecrypt(task.encryptedText, task.iv, key);
            task.resolve(plaintext);
          } catch {
            task.resolve(null);
          }
        }),
      );
    }

    decryptProcessingRef.current = false;
  }, [getConversationKeyInternal]);

  const initKeys = useCallback(async () => {
    if (!currentUserId || initGuardRef.current) return;
    initGuardRef.current = true;
    setInitializing(true);
    setKeyMissing(false);

    try {
      const stored = await getKeyPair(currentUserId);

      if (stored) {
        privateKeyRef.current = await importPrivateKey(stored.privateKey);
        publicKeyRef.current = await importPublicKey(stored.publicKey);
        publicKeySpkiRef.current = stored.publicKey;
        keyVersionRef.current = stored.keyVersion;
        setKeyVersion(stored.keyVersion);
        setReady(true);
        return;
      }

      setKeyMissing(true);
      setReady(false);
    } catch (error) {
      console.error("E2EE init error:", error);
      setKeyMissing(true);
    } finally {
      setInitializing(false);
      initGuardRef.current = false;
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId && !ready && !initGuardRef.current && !keyMissing) {
      initKeys();
    }
  }, [currentUserId, ready, keyMissing, initKeys]);

  const resetKeys = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!currentUserId) return { ok: false, error: "Not authenticated" };

    try {
      setInitializing(true);
      setReady(false);

      const keyPair = await generateKeyPair();
      const publicKeySpki = await exportPublicKey(keyPair.publicKey);
      const privateKeyPkcs8 = await exportPrivateKey(keyPair.privateKey);
      const newVersion = keyVersionRef.current + 1;

      await storeKeyPair(currentUserId, privateKeyPkcs8, publicKeySpki, newVersion);
      privateKeyRef.current = keyPair.privateKey;
      publicKeyRef.current = keyPair.publicKey;
      publicKeySpkiRef.current = publicKeySpki;
      keyVersionRef.current = newVersion;
      setKeyVersion(newVersion);

      conversationKeysRef.current.clear();

      const res = await fetch(`${API_BASE}/users/keys`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: publicKeySpki, keyVersion: newVersion }),
      });

      if (!res.ok) {
        await deleteKeyPair(currentUserId);
        privateKeyRef.current = null;
        setKeyMissing(true);
        return { ok: false, error: "Failed to upload new public key to server" };
      }

      setKeyMissing(false);
      setReady(true);
      return { ok: true };
    } catch (error) {
      privateKeyRef.current = null;
      setKeyMissing(true);
      setReady(false);
      return { ok: false, error: error instanceof Error ? error.message : "Key reset failed" };
    } finally {
      setInitializing(false);
    }
  }, [currentUserId]);

  const getConversationKey = useCallback(
    async (conversationId: string): Promise<CryptoKey | null> => {
      return getConversationKeyInternal(conversationId);
    },
    [getConversationKeyInternal],
  );

  const setupConversationKey = useCallback(
    async (
      conversationId: string,
      participantKeys: { userId: string; publicKey: string }[],
    ): Promise<boolean> => {
      if (!currentUserId) return false;

      try {
        const conversationKey = await generateConversationKey();
        const keyBundles: { userId: string; encryptedKey: string }[] = [];

        for (const p of participantKeys) {
          const pubKey = await importPublicKey(p.publicKey);
          const encrypted = await encryptConversationKey(conversationKey, pubKey);
          keyBundles.push({ userId: p.userId, encryptedKey: encrypted });
        }

        const ownPubKey = publicKeyRef.current;
        if (ownPubKey) {
          const encryptedSelf = await encryptConversationKey(conversationKey, ownPubKey);
          keyBundles.push({ userId: currentUserId, encryptedKey: encryptedSelf });
        }

        const res = await fetch(`${API_BASE}/conversations/${conversationId}/key`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyBundles }),
        });

        if (!res.ok) return false;

        conversationKeysRef.current.set(conversationId, conversationKey);
        return true;
      } catch {
        return false;
      }
    },
    [currentUserId],
  );

  const getOwnPublicKeySpki = useCallback((): string | null => {
    return publicKeySpkiRef.current || null;
  }, []);

  const encrypt = useCallback(
    async (
      plaintext: string,
      conversationId: string,
    ): Promise<{ encryptedText: string; iv: string } | null> => {
      const key = await getConversationKeyInternal(conversationId);
      if (!key) return null;

      try {
        return await cryptoEncrypt(plaintext, key);
      } catch {
        return null;
      }
    },
    [getConversationKeyInternal],
  );

  const decrypt = useCallback(
    async (
      encryptedText: string,
      iv: string,
      conversationId: string,
    ): Promise<string | null> => {
      return new Promise((resolve) => {
        decryptQueueRef.current.push({
          encryptedText,
          iv,
          conversationId,
          resolve: (plaintext) => {
            resolve(plaintext ?? "🔒 Decryption failed");
          },
        });
        processDecryptQueue();
      });
    },
    [processDecryptQueue],
  );

  const decryptBatch = useCallback(
    async (messages: { encryptedText: string; iv: string; conversationId: string }[]): Promise<(string | null)[]> => {
      const results: (string | null)[] = new Array(messages.length).fill(null);

      const queue = messages.map((msg, i) => ({
        task: msg,
        index: i,
      }));

      async function worker() {
        while (true) {
          const item = queue.shift();
          if (!item) break;
          const key = await getConversationKeyInternal(item.task.conversationId);
          if (!key) continue;
          try {
            results[item.index] = await cryptoDecrypt(item.task.encryptedText, item.task.iv, key);
          } catch {
            results[item.index] = null;
          }
        }
      }

      const workers = Array.from({ length: DECRYPT_CONCURRENCY }, () => worker());
      await Promise.allSettled(workers);

      return results;
    },
    [getConversationKeyInternal],
  );

  const invalidateConversationKey = useCallback((conversationId: string) => {
    conversationKeysRef.current.delete(conversationId);
  }, []);

  const clearKeys = useCallback(async () => {
    if (!currentUserId) return;
    await deleteKeyPair(currentUserId);
    privateKeyRef.current = null;
    publicKeyRef.current = null;
    publicKeySpkiRef.current = "";
    conversationKeysRef.current.clear();
    setReady(false);
    setKeyMissing(true);
  }, [currentUserId]);

  return {
    ready,
    initializing,
    keyMissing,
    keyVersion,
    encrypt,
    decrypt,
    decryptBatch,
    getConversationKey,
    setupConversationKey,
    invalidateConversationKey,
    getOwnPublicKeySpki,
    resetKeys,
    clearKeys,
  };
}
