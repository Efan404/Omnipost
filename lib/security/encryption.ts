/**
 * API Key Encryption Utilities
 *
 * Encrypts and decrypts sensitive data like API keys and access tokens.
 * Uses AES-256-GCM encryption with Web Crypto API.
 *
 * IMPORTANT: The encryption key must be stored securely in environment variables.
 * Never commit the encryption key to version control.
 */

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: openssl rand -hex 32'
    );
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)');
  }

  return key;
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get crypto subtle (works in Node.js and browser)
 */
function getCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.subtle;
  }

  // Node.js
  const { webcrypto } = require('crypto');
  return webcrypto.subtle;
}

/**
 * Import encryption key for use with Web Crypto API
 */
async function importKey(): Promise<CryptoKey> {
  const keyHex = getEncryptionKey();
  const keyBytes = hexToBytes(keyHex);

  const crypto = getCrypto();

  return crypto.importKey(
    'raw',
    keyBytes,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive data (API keys, tokens, etc.)
 *
 * Uses AES-256-GCM encryption with a random IV.
 *
 * @param plaintext - The data to encrypt
 * @returns Base64-encoded encrypted data with format: iv:ciphertext:authTag
 *
 * @example
 * ```ts
 * const encrypted = await encrypt('my-api-key-12345');
 * // Returns: "a1b2c3d4:e5f6g7h8:i9j0k1l2"
 * ```
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const crypto = getCrypto();
    const key = await importKey();

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encode plaintext
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // Encrypt
    const ciphertextBytes = await crypto.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      plaintextBytes
    );

    // Convert to hex
    const ivHex = bytesToHex(iv);
    const ciphertextHex = bytesToHex(new Uint8Array(ciphertextBytes));

    // Return format: iv:ciphertext
    return `${ivHex}:${ciphertextHex}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 *
 * @param ciphertext - Base64-encoded encrypted data (format: iv:ciphertext:authTag)
 * @returns Decrypted plaintext
 *
 * @example
 * ```ts
 * const decrypted = await decrypt('a1b2c3d4:e5f6g7h8:i9j0k1l2');
 * // Returns: "my-api-key-12345"
 * ```
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const crypto = getCrypto();
    const key = await importKey();

    // Parse format: iv:ciphertext
    const [ivHex, ciphertextHex] = ciphertext.split(':');

    if (!ivHex || !ciphertextHex) {
      throw new Error('Invalid ciphertext format');
    }

    // Convert from hex
    const iv = hexToBytes(ivHex);
    const ciphertextBytes = hexToBytes(ciphertextHex);

    // Decrypt
    const plaintextBytes = await crypto.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertextBytes
    );

    // Decode plaintext
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBytes);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt platform configuration credentials
 *
 * @param config - Platform configuration with sensitive data
 * @returns Configuration with encrypted credentials
 */
export async function encryptPlatformConfig(config: {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}): Promise<{
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}> {
  const encrypted = { ...config };

  if (config.apiKey) {
    encrypted.apiKey = await encrypt(config.apiKey);
  }

  if (config.accessToken) {
    encrypted.accessToken = await encrypt(config.accessToken);
  }

  if (config.refreshToken) {
    encrypted.refreshToken = await encrypt(config.refreshToken);
  }

  return encrypted;
}

/**
 * Decrypt platform configuration credentials
 *
 * @param config - Platform configuration with encrypted data
 * @returns Configuration with decrypted credentials
 */
export async function decryptPlatformConfig(config: {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}): Promise<{
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}> {
  const decrypted = { ...config };

  if (config.apiKey) {
    try {
      decrypted.apiKey = await decrypt(config.apiKey);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      // Return as-is if decryption fails (might be unencrypted legacy data)
    }
  }

  if (config.accessToken) {
    try {
      decrypted.accessToken = await decrypt(config.accessToken);
    } catch (error) {
      console.error('Failed to decrypt access token:', error);
    }
  }

  if (config.refreshToken) {
    try {
      decrypted.refreshToken = await decrypt(config.refreshToken);
    } catch (error) {
      console.error('Failed to decrypt refresh token:', error);
    }
  }

  return decrypted;
}

/**
 * Generate a new encryption key
 *
 * This is a utility function for generating a secure encryption key.
 * Run this once and store the result in your .env file.
 *
 * @returns 64-character hex string (32 bytes)
 *
 * @example
 * ```ts
 * const key = generateEncryptionKey();
 * console.log('Add to .env file:');
 * console.log(`ENCRYPTION_KEY=${key}`);
 * ```
 */
export function generateEncryptionKey(): string {
  const crypto = getCrypto();
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

/**
 * Sanitize sensitive data for logging
 *
 * Masks API keys and tokens in log messages.
 *
 * @param data - Data to sanitize
 * @returns Sanitized data with masked credentials
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };

  const sensitiveKeys = [
    'apiKey',
    'accessToken',
    'refreshToken',
    'password',
    'secret',
    'token',
  ];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      const value = sanitized[key];

      if (typeof value === 'string' && value.length > 0) {
        // Show first 4 and last 4 characters
        if (value.length > 8) {
          sanitized[key] = `${value.slice(0, 4)}...${value.slice(-4)}`;
        } else {
          sanitized[key] = '****';
        }
      }
    }
  }

  return sanitized;
}
