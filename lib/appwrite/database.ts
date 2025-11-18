/**
 * Appwrite Database Service
 *
 * Provides type-safe database operations for all collections.
 */

import { ID, Query, Models } from 'appwrite';
import { getDatabases, DATABASE_ID, COLLECTIONS } from './config';
import type {
  Article,
  Translation,
  Publication,
  PlatformConfig,
  UserPreferences,
  Platform,
} from '@/types';

/**
 * Database service class
 */
export class DatabaseService {
  private db = getDatabases();

  // ============================================================================
  // Articles
  // ============================================================================

  /**
   * Create a new article
   */
  async createArticle(article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<Article> {
    const now = new Date().toISOString();

    const doc = await this.db.createDocument(
      DATABASE_ID,
      COLLECTIONS.ARTICLES,
      ID.unique(),
      {
        ...article,
        createdAt: now,
        updatedAt: now,
      }
    );

    return this.mapDocument<Article>(doc);
  }

  /**
   * Get article by ID
   */
  async getArticle(articleId: string): Promise<Article | null> {
    try {
      const doc = await this.db.getDocument(
        DATABASE_ID,
        COLLECTIONS.ARTICLES,
        articleId
      );

      return this.mapDocument<Article>(doc);
    } catch (error) {
      console.error('Failed to get article:', error);
      return null;
    }
  }

  /**
   * List articles for a user
   */
  async listArticles(
    userId: string,
    limit: number = 25,
    offset: number = 0
  ): Promise<Article[]> {
    const { documents } = await this.db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ARTICLES,
      [
        Query.equal('userId', userId),
        Query.orderDesc('updatedAt'),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );

    return documents.map((doc) => this.mapDocument<Article>(doc));
  }

  /**
   * Update article
   */
  async updateArticle(
    articleId: string,
    updates: Partial<Article>
  ): Promise<Article> {
    const doc = await this.db.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ARTICLES,
      articleId,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    );

    return this.mapDocument<Article>(doc);
  }

  /**
   * Delete article
   */
  async deleteArticle(articleId: string): Promise<boolean> {
    try {
      await this.db.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.ARTICLES,
        articleId
      );
      return true;
    } catch (error) {
      console.error('Failed to delete article:', error);
      return false;
    }
  }

  // ============================================================================
  // Translations
  // ============================================================================

  /**
   * Create translation
   */
  async createTranslation(
    articleId: string,
    translation: Translation
  ): Promise<Translation> {
    const doc = await this.db.createDocument(
      DATABASE_ID,
      COLLECTIONS.TRANSLATIONS,
      ID.unique(),
      {
        articleId,
        ...translation,
        createdAt: new Date().toISOString(),
      }
    );

    return this.mapDocument<Translation>(doc);
  }

  /**
   * Get translations for an article
   */
  async getTranslations(articleId: string): Promise<Translation[]> {
    const { documents } = await this.db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.TRANSLATIONS,
      [Query.equal('articleId', articleId)]
    );

    return documents.map((doc) => this.mapDocument<Translation>(doc));
  }

  // ============================================================================
  // Publications
  // ============================================================================

  /**
   * Create or update publication record
   */
  async upsertPublication(
    articleId: string,
    publication: Publication
  ): Promise<Publication> {
    // Try to find existing publication
    const { documents } = await this.db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PUBLICATIONS,
      [
        Query.equal('articleId', articleId),
        Query.equal('platform', publication.platform),
        Query.limit(1),
      ]
    );

    if (documents.length > 0) {
      // Update existing
      const doc = await this.db.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PUBLICATIONS,
        documents[0].$id,
        {
          ...publication,
          updatedAt: new Date().toISOString(),
        }
      );

      return this.mapDocument<Publication>(doc);
    } else {
      // Create new
      const doc = await this.db.createDocument(
        DATABASE_ID,
        COLLECTIONS.PUBLICATIONS,
        ID.unique(),
        {
          articleId,
          ...publication,
          createdAt: new Date().toISOString(),
        }
      );

      return this.mapDocument<Publication>(doc);
    }
  }

  /**
   * Get publications for an article
   */
  async getPublications(articleId: string): Promise<Publication[]> {
    const { documents } = await this.db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PUBLICATIONS,
      [Query.equal('articleId', articleId)]
    );

    return documents.map((doc) => this.mapDocument<Publication>(doc));
  }

  // ============================================================================
  // Platform Configurations
  // ============================================================================

  /**
   * Create or update platform configuration
   */
  async upsertPlatformConfig(
    userId: string,
    platform: Platform,
    config: Partial<PlatformConfig>
  ): Promise<PlatformConfig> {
    // Try to find existing config
    const { documents } = await this.db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLATFORM_CONFIGS,
      [
        Query.equal('userId', userId),
        Query.equal('platform', platform),
        Query.limit(1),
      ]
    );

    const now = new Date().toISOString();

    if (documents.length > 0) {
      // Update existing
      const doc = await this.db.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLATFORM_CONFIGS,
        documents[0].$id,
        {
          ...config,
          updatedAt: now,
        }
      );

      return this.mapDocument<PlatformConfig>(doc);
    } else {
      // Create new
      const doc = await this.db.createDocument(
        DATABASE_ID,
        COLLECTIONS.PLATFORM_CONFIGS,
        ID.unique(),
        {
          userId,
          platform,
          ...config,
          createdAt: now,
          updatedAt: now,
        }
      );

      return this.mapDocument<PlatformConfig>(doc);
    }
  }

  /**
   * Get platform configurations for user
   */
  async getPlatformConfigs(userId: string): Promise<PlatformConfig[]> {
    const { documents } = await this.db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLATFORM_CONFIGS,
      [Query.equal('userId', userId)]
    );

    return documents.map((doc) => this.mapDocument<PlatformConfig>(doc));
  }

  /**
   * Get specific platform config
   */
  async getPlatformConfig(
    userId: string,
    platform: Platform
  ): Promise<PlatformConfig | null> {
    const { documents } = await this.db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLATFORM_CONFIGS,
      [
        Query.equal('userId', userId),
        Query.equal('platform', platform),
        Query.limit(1),
      ]
    );

    if (documents.length === 0) {
      return null;
    }

    return this.mapDocument<PlatformConfig>(documents[0]);
  }

  // ============================================================================
  // User Preferences
  // ============================================================================

  /**
   * Get or create user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { documents } = await this.db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USER_PREFERENCES,
      [Query.equal('userId', userId), Query.limit(1)]
    );

    if (documents.length > 0) {
      return this.mapDocument<UserPreferences>(documents[0]);
    }

    // Create default preferences
    const defaultPreferences: UserPreferences = {
      defaultPlatforms: [],
      autoTranslate: false,
      translationAutoApproveThreshold: 0.9,
      requireManualReview: false,
      defaultLanguage: 'en',
      targetLanguages: ['zh', 'ja'],
    };

    const doc = await this.db.createDocument(
      DATABASE_ID,
      COLLECTIONS.USER_PREFERENCES,
      ID.unique(),
      {
        userId,
        ...defaultPreferences,
        createdAt: new Date().toISOString(),
      }
    );

    return this.mapDocument<UserPreferences>(doc);
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);

    const doc = await this.db.updateDocument(
      DATABASE_ID,
      COLLECTIONS.USER_PREFERENCES,
      current.id as any,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    );

    return this.mapDocument<UserPreferences>(doc);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Map Appwrite document to typed entity
   */
  private mapDocument<T>(doc: Models.Document): T {
    const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...data } = doc;

    return {
      id: $id,
      ...data,
    } as T;
  }
}

/**
 * Singleton instance
 */
let dbServiceInstance: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbServiceInstance) {
    dbServiceInstance = new DatabaseService();
  }
  return dbServiceInstance;
}
