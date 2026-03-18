// AES-256-GCM encryption for OAuth tokens
// Uses Web Crypto API (available in Cloudflare Workers)

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 128; // bits

// Cache for encryption key
let cachedKey: CryptoKey | null = null;
let cachedKeySource: string | null = null;

async function getEncryptionKey(encryptionKeyHex: string): Promise<CryptoKey> {
  // Return cached key if source hasn't changed
  if (cachedKey && cachedKeySource === encryptionKeyHex) {
    return cachedKey;
  }

  // Convert hex string to Uint8Array (32 bytes = 256 bits)
  const keyBytes = hexToBytes(encryptionKeyHex);
  if (keyBytes.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }

  cachedKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
  cachedKeySource = encryptionKeyHex;

  return cachedKey;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

/**
 * Encrypts a token using AES-256-GCM
 * @param token - The plain text token to encrypt
 * @param encryptionKeyHex - 32-byte key as hex string (from ENV)
 * @returns Base64-encoded string: IV (12 bytes) + ciphertext + tag
 */
export async function encryptToken(
  token: string,
  encryptionKeyHex: string
): Promise<string> {
  const key = await getEncryptionKey(encryptionKeyHex);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode token to bytes
  const tokenBytes = new TextEncoder().encode(token);

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    tokenBytes
  );

  // Combine IV + encrypted data (which includes auth tag)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return as base64
  return bytesToBase64(combined);
}

/**
 * Decrypts a token encrypted with encryptToken
 * @param encryptedBase64 - Base64-encoded encrypted data
 * @param encryptionKeyHex - 32-byte key as hex string (from ENV)
 * @returns Decrypted plain text token
 */
export async function decryptToken(
  encryptedBase64: string,
  encryptionKeyHex: string
): Promise<string> {
  const key = await getEncryptionKey(encryptionKeyHex);

  // Decode from base64
  const combined = base64ToBytes(encryptedBase64);

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    ciphertext
  );

  // Decode to string
  return new TextDecoder().decode(decrypted);
}

/**
 * Generates a random 32-byte key for AES-256
 * Use this to generate a new ENCRYPTION_KEY
 * @returns Hex string (64 characters)
 */
export function generateEncryptionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

/**
 * Validates that an encryption key is properly formatted
 * @param keyHex - The key to validate
 * @returns true if valid, false otherwise
 */
export function validateEncryptionKey(keyHex: string): boolean {
  if (!keyHex || typeof keyHex !== 'string') return false;
  if (keyHex.length !== 64) return false;
  return /^[0-9a-fA-F]+$/.test(keyHex);
}

// ═══════════════════════════════════════════
// HASHING (for webhook verification, etc.)
// ═══════════════════════════════════════════

/**
 * Computes HMAC-SHA256
 * @param message - Message to sign
 * @param secretKey - Secret key
 * @returns Hex-encoded signature
 */
export async function hmacSha256(
  message: string,
  secretKey: string
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  return bytesToHex(new Uint8Array(signature));
}

/**
 * Computes SHA-256 hash
 * @param message - Message to hash
 * @returns Hex-encoded hash
 */
export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

// ═══════════════════════════════════════════
// SECURE RANDOM
// ═══════════════════════════════════════════

/**
 * Generates a secure random string (URL-safe base64)
 * @param length - Number of random bytes
 * @returns URL-safe base64 string
 */
export function generateSecureRandom(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // URL-safe base64
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generates a session token
 * @returns 32-byte random token as URL-safe base64
 */
export function generateSessionToken(): string {
  return generateSecureRandom(32);
}
