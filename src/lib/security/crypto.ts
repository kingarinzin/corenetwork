/**
 * SECURITY: End-to-End Encryption (E2EE) Simulation.
 * In production, replace Base64 with window.crypto.subtle (AES-GCM/RSA).
 */

export const encryptPayload = async (plaintext: string): Promise<string> => {
  if (!plaintext) return "";
  try {
    // Simulated encryption: Base64 encoding
    return btoa(unescape(encodeURIComponent(plaintext)));
  } catch {
    return plaintext;
  }
};

export const decryptPayload = async (ciphertext: string): Promise<string> => {
  if (!ciphertext) return "";
  try {
    return decodeURIComponent(escape(atob(ciphertext)));
  } catch {
    return ciphertext; // Fallback if it's already plaintext
  }
};