/**
 * Appwrite Configuration
 *
 * Central configuration for Appwrite backend services.
 * Provides client instances and helper functions.
 */

import { Client, Account, Databases, Storage, Functions } from 'appwrite';

// Validate environment variables
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
  throw new Error(
    'Missing Appwrite configuration. Please check your environment variables.'
  );
}

/**
 * Appwrite Collection IDs
 * These should match the collections created in your Appwrite console
 */
export const COLLECTIONS = {
  ARTICLES: 'articles',
  TRANSLATIONS: 'translations',
  PUBLICATIONS: 'publications',
  PLATFORM_CONFIGS: 'platform_configs',
  USER_PREFERENCES: 'user_preferences',
};

/**
 * Appwrite Database ID
 */
export const DATABASE_ID = 'omnipost_main';

/**
 * Appwrite Storage Bucket IDs
 */
export const BUCKETS = {
  ARTICLE_IMAGES: 'article_images',
  USER_AVATARS: 'user_avatars',
};

/**
 * Create Appwrite client instance
 */
export function createClient(): Client {
  const client = new Client();

  client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

  return client;
}

/**
 * Singleton client instance
 */
let clientInstance: Client | null = null;

export function getClient(): Client {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

/**
 * Get Account service
 */
export function getAccount(): Account {
  return new Account(getClient());
}

/**
 * Get Databases service
 */
export function getDatabases(): Databases {
  return new Databases(getClient());
}

/**
 * Get Storage service
 */
export function getStorage(): Storage {
  return new Storage(getClient());
}

/**
 * Get Functions service
 */
export function getFunctions(): Functions {
  return new Functions(getClient());
}

/**
 * Server-side client with API key
 * Only use this in API routes or server components
 */
export function createServerClient(): Client {
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!apiKey) {
    throw new Error('Missing APPWRITE_API_KEY for server operations');
  }

  const client = new Client();

  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(apiKey);

  return client;
}
