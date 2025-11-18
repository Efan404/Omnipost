/**
 * Appwrite Database Setup Script
 *
 * Creates all necessary collections and indexes for Omnipost.
 * Run with: tsx scripts/setup-database.ts
 */

import { Client, Databases, ID, Permission, Role } from 'appwrite';

// Configuration
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = 'omnipost_main';

if (!PROJECT_ID || !API_KEY) {
  console.error('Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY environment variables');
  process.exit(1);
}

// Initialize client
const client = new Client();
client.setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

const databases = new Databases(client);

/**
 * Collection definitions
 */
const collections = [
  {
    id: 'articles',
    name: 'Articles',
    permissions: [
      Permission.create(Role.users()),
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    attributes: [
      { key: 'userId', type: 'string', size: 128, required: true },
      { key: 'status', type: 'string', size: 32, required: true },
      { key: 'contentOriginal', type: 'string', size: 1000000, required: true },
      { key: 'contentVariants', type: 'string', size: 1000000, required: false }, // JSON
      { key: 'metadata', type: 'string', size: 10000, required: true }, // JSON
      { key: 'translations', type: 'string', size: 1000000, required: false }, // JSON
      { key: 'publications', type: 'string', size: 10000, required: false }, // JSON
      { key: 'syncWarning', type: 'string', size: 1000, required: false }, // JSON
      { key: 'createdAt', type: 'datetime', required: true },
      { key: 'updatedAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'userId_idx', type: 'key', attributes: ['userId'] },
      { key: 'status_idx', type: 'key', attributes: ['status'] },
      { key: 'updatedAt_idx', type: 'key', attributes: ['updatedAt'], orders: ['DESC'] },
    ],
  },
  {
    id: 'translations',
    name: 'Translations',
    permissions: [
      Permission.create(Role.users()),
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    attributes: [
      { key: 'articleId', type: 'string', size: 128, required: true },
      { key: 'language', type: 'string', size: 10, required: true },
      { key: 'content', type: 'string', size: 1000000, required: true },
      { key: 'status', type: 'string', size: 32, required: true },
      { key: 'qualityScore', type: 'double', required: false },
      { key: 'reviewReport', type: 'string', size: 10000, required: false }, // JSON
      { key: 'reviewedAt', type: 'datetime', required: false },
      { key: 'reviewedBy', type: 'string', size: 128, required: false },
      { key: 'createdAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'articleId_idx', type: 'key', attributes: ['articleId'] },
      { key: 'language_idx', type: 'key', attributes: ['language'] },
    ],
  },
  {
    id: 'publications',
    name: 'Publications',
    permissions: [
      Permission.create(Role.users()),
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    attributes: [
      { key: 'articleId', type: 'string', size: 128, required: true },
      { key: 'platform', type: 'string', size: 32, required: true },
      { key: 'status', type: 'string', size: 32, required: true },
      { key: 'publishedUrl', type: 'string', size: 512, required: false },
      { key: 'publishedAt', type: 'datetime', required: false },
      { key: 'lastSyncedAt', type: 'datetime', required: false },
      { key: 'contentHash', type: 'string', size: 128, required: false },
      { key: 'error', type: 'string', size: 1000, required: false },
      { key: 'retryCount', type: 'integer', required: false },
      { key: 'createdAt', type: 'datetime', required: true },
      { key: 'updatedAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'articleId_idx', type: 'key', attributes: ['articleId'] },
      { key: 'platform_idx', type: 'key', attributes: ['platform'] },
      { key: 'status_idx', type: 'key', attributes: ['status'] },
    ],
  },
  {
    id: 'platform_configs',
    name: 'Platform Configurations',
    permissions: [
      Permission.create(Role.users()),
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    attributes: [
      { key: 'userId', type: 'string', size: 128, required: true },
      { key: 'platform', type: 'string', size: 32, required: true },
      { key: 'credentials', type: 'string', size: 10000, required: true }, // JSON (encrypted)
      { key: 'isValid', type: 'boolean', required: true },
      { key: 'lastValidatedAt', type: 'datetime', required: true },
      { key: 'createdAt', type: 'datetime', required: true },
      { key: 'updatedAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'userId_idx', type: 'key', attributes: ['userId'] },
      { key: 'platform_idx', type: 'key', attributes: ['platform'] },
      { key: 'userId_platform_idx', type: 'unique', attributes: ['userId', 'platform'] },
    ],
  },
  {
    id: 'user_preferences',
    name: 'User Preferences',
    permissions: [
      Permission.create(Role.users()),
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    attributes: [
      { key: 'userId', type: 'string', size: 128, required: true },
      { key: 'defaultPlatforms', type: 'string', size: 500, required: false }, // JSON
      { key: 'autoTranslate', type: 'boolean', required: true },
      { key: 'translationAutoApproveThreshold', type: 'double', required: true },
      { key: 'requireManualReview', type: 'boolean', required: true },
      { key: 'defaultLanguage', type: 'string', size: 10, required: true },
      { key: 'targetLanguages', type: 'string', size: 500, required: false }, // JSON
      { key: 'createdAt', type: 'datetime', required: true },
      { key: 'updatedAt', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'userId_idx', type: 'unique', attributes: ['userId'] },
    ],
  },
];

/**
 * Create database and collections
 */
async function setupDatabase() {
  console.log('🚀 Starting Omnipost database setup...\n');

  try {
    // Create database
    console.log(`📊 Creating database: ${DATABASE_ID}`);
    try {
      await databases.create(DATABASE_ID, 'Omnipost Database');
      console.log('✅ Database created successfully\n');
    } catch (error: any) {
      if (error.code === 409) {
        console.log('ℹ️  Database already exists\n');
      } else {
        throw error;
      }
    }

    // Create collections
    for (const collection of collections) {
      console.log(`📝 Creating collection: ${collection.name} (${collection.id})`);

      try {
        // Create collection
        await databases.createCollection(
          DATABASE_ID,
          collection.id,
          collection.name,
          collection.permissions
        );

        console.log(`   ✅ Collection created`);

        // Create attributes
        for (const attr of collection.attributes) {
          console.log(`   📌 Creating attribute: ${attr.key}`);

          try {
            switch (attr.type) {
              case 'string':
                await databases.createStringAttribute(
                  DATABASE_ID,
                  collection.id,
                  attr.key,
                  attr.size,
                  attr.required
                );
                break;

              case 'integer':
                await databases.createIntegerAttribute(
                  DATABASE_ID,
                  collection.id,
                  attr.key,
                  attr.required
                );
                break;

              case 'double':
                await databases.createFloatAttribute(
                  DATABASE_ID,
                  collection.id,
                  attr.key,
                  attr.required
                );
                break;

              case 'boolean':
                await databases.createBooleanAttribute(
                  DATABASE_ID,
                  collection.id,
                  attr.key,
                  attr.required
                );
                break;

              case 'datetime':
                await databases.createDatetimeAttribute(
                  DATABASE_ID,
                  collection.id,
                  attr.key,
                  attr.required
                );
                break;
            }
          } catch (error: any) {
            if (error.code === 409) {
              console.log(`   ℹ️  Attribute ${attr.key} already exists`);
            } else {
              throw error;
            }
          }
        }

        // Wait for attributes to be ready
        console.log(`   ⏳ Waiting for attributes to be ready...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Create indexes
        for (const index of collection.indexes) {
          console.log(`   🔍 Creating index: ${index.key}`);

          try {
            await databases.createIndex(
              DATABASE_ID,
              collection.id,
              index.key,
              index.type as any,
              index.attributes,
              index.orders
            );
          } catch (error: any) {
            if (error.code === 409) {
              console.log(`   ℹ️  Index ${index.key} already exists`);
            } else {
              throw error;
            }
          }
        }

        console.log(`   ✅ Collection ${collection.name} setup complete\n`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`   ℹ️  Collection ${collection.name} already exists\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✨ Database setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Database: ${DATABASE_ID}`);
    console.log(`   Collections: ${collections.length}`);
    console.log(`   Collections created: ${collections.map((c) => c.name).join(', ')}`);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
