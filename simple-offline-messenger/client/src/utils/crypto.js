// Utility for Web Crypto API standard AES-GCM encryption

let cryptoKey = null;

/**
 * Derives an AES-GCM 256 key from a plain text password using PBKDF2
 */
export async function deriveKey(password) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  cryptoKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("room-salt-123"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return cryptoKey;
}

export function isKeyReady() {
  return cryptoKey !== null;
}

export async function encryptMessage(text) {
  if (!cryptoKey) return text;

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const encryptedFile = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    enc.encode(text)
  );

  const combined = new Uint8Array(iv.length + encryptedFile.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedFile), iv.length);

  let binary = '';
  combined.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

export async function decryptMessage(cipherTextBase64) {
  if (!cryptoKey) return cipherTextBase64;

  try {
    const binary = atob(cipherTextBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decryptedFile = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      encrypted
    );

    return new TextDecoder().decode(decryptedFile);
  } catch (e) {
    console.error("Failed to decrypt message - wrong key or corrupt data", e);
    return "[Encrypted Message]";
  }
}
