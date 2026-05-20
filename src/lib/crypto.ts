const RSA_KEY_ALGO: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

const AES_KEY_ALGO: AesKeyGenParams = {
  name: "AES-GCM",
  length: 256,
};

const AES_ENCRYPT_ALGO: AesGcmParams = {
  name: "AES-GCM",
  iv: new Uint8Array(12),
};

const EXPORT_FORMAT = "spki";
const PRIVATE_EXPORT_FORMAT = "pkcs8";

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  const keyPair = await crypto.subtle.generateKey(RSA_KEY_ALGO, true, ["encrypt", "decrypt"]);
  return keyPair;
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey(EXPORT_FORMAT, publicKey);
  return arrayBufferToBase64(spki);
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey(PRIVATE_EXPORT_FORMAT, privateKey);
  return arrayBufferToBase64(pkcs8);
}

export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const spki = base64ToArrayBuffer(spkiBase64);
  const key = await crypto.subtle.importKey(
    EXPORT_FORMAT,
    spki,
    RSA_KEY_ALGO,
    true,
    ["encrypt"],
  );
  return key;
}

export async function importPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
  const pkcs8 = base64ToArrayBuffer(pkcs8Base64);
  const key = await crypto.subtle.importKey(
    PRIVATE_EXPORT_FORMAT,
    pkcs8,
    RSA_KEY_ALGO,
    true,
    ["decrypt"],
  );
  return key;
}

export async function generateConversationKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(AES_KEY_ALGO, true, ["encrypt", "decrypt"]);
  return key;
}

export async function exportConversationKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(raw);
}

export async function importConversationKey(rawBase64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(rawBase64);
  const key = await crypto.subtle.importKey("raw", raw, AES_KEY_ALGO, true, ["encrypt", "decrypt"]);
  return key;
}

export async function encryptConversationKey(
  conversationKey: CryptoKey,
  recipientPublicKey: CryptoKey,
): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", conversationKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    raw,
  );
  return arrayBufferToBase64(encrypted);
}

export async function decryptConversationKey(
  encryptedBase64: string,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const encrypted = base64ToArrayBuffer(encryptedBase64);
  const raw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encrypted,
  );
  const key = await crypto.subtle.importKey("raw", raw, AES_KEY_ALGO, true, ["encrypt", "decrypt"]);
  return key;
}

export async function encryptMessage(
  plaintext: string,
  conversationKey: CryptoKey,
): Promise<{ encryptedText: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    conversationKey,
    encoded,
  );
  return {
    encryptedText: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  conversationKey: CryptoKey,
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    conversationKey,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
