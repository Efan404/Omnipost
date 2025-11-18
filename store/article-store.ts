/**
 * Article State Management
 *
 * Zustand store for managing article state, including:
 * - Article list
 * - Current article editing
 * - Auto-save functionality
 * - Sync status tracking
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type {
  Article,
  ArticleStatus,
  Platform,
  Publication,
  PlatformVariants,
  SyncWarning,
} from '@/types';
import { getDatabaseService } from '@/lib/appwrite/database';
import { hashContent } from '@/lib/utils';

/**
 * Article store state
 */
interface ArticleState {
  // Data
  articles: Article[];
  currentArticle: Article | null;
  selectedArticleId: string | null;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: string | null;
  syncWarnings: Map<string, SyncWarning>;

  // Actions
  loadArticles: (userId: string) => Promise<void>;
  loadArticle: (articleId: string) => Promise<void>;
  createArticle: (userId: string, title: string) => Promise<Article>;
  updateArticle: (articleId: string, updates: Partial<Article>) => Promise<void>;
  deleteArticle: (articleId: string) => Promise<void>;
  setCurrentArticle: (article: Article | null) => void;

  // Content editing
  updateContent: (content: string) => void;
  updateMetadata: (metadata: Partial<Article['metadata']>) => void;
  updateVariant: (platform: Platform, content: string) => void;

  // Status management
  updateStatus: (articleId: string, status: ArticleStatus) => void;
  updatePublicationStatus: (articleId: string, publication: Publication) => void;

  // Sync management
  checkSyncStatus: (articleId: string) => Promise<void>;
  markAsCustomized: (platform: Platform) => void;

  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
}

/**
 * Auto-save interval (30 seconds)
 */
const AUTO_SAVE_INTERVAL = 30000;
let autoSaveTimer: NodeJS.Timeout | null = null;

/**
 * Article store
 */
export const useArticleStore = create<ArticleState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      articles: [],
      currentArticle: null,
      selectedArticleId: null,
      isLoading: false,
      isSaving: false,
      lastSaved: null,
      syncWarnings: new Map(),

      // Load articles for user
      loadArticles: async (userId: string) => {
        set({ isLoading: true });

        try {
          const db = getDatabaseService();
          const articles = await db.listArticles(userId);

          set({
            articles,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load articles:', error);
          set({ isLoading: false });
        }
      },

      // Load single article
      loadArticle: async (articleId: string) => {
        set({ isLoading: true });

        try {
          const db = getDatabaseService();
          const article = await db.getArticle(articleId);

          if (article) {
            set({
              currentArticle: article,
              selectedArticleId: articleId,
              isLoading: false,
            });

            // Check sync status
            await get().checkSyncStatus(articleId);
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to load article:', error);
          set({ isLoading: false });
        }
      },

      // Create new article
      createArticle: async (userId: string, title: string) => {
        const db = getDatabaseService();

        const newArticle: Omit<Article, 'id' | 'createdAt' | 'updatedAt'> = {
          userId,
          status: ArticleStatus.DRAFT,
          metadata: {
            title,
            tags: [],
          },
          contentOriginal: '',
          contentVariants: {},
          translations: {},
          publications: {} as any,
        };

        const article = await db.createArticle(newArticle);

        set((state) => {
          state.articles.unshift(article);
          state.currentArticle = article;
          state.selectedArticleId = article.id;
        });

        return article;
      },

      // Update article
      updateArticle: async (articleId: string, updates: Partial<Article>) => {
        set({ isSaving: true });

        try {
          const db = getDatabaseService();
          const updated = await db.updateArticle(articleId, updates);

          set((state) => {
            // Update in articles list
            const index = state.articles.findIndex((a) => a.id === articleId);
            if (index !== -1) {
              state.articles[index] = updated;
            }

            // Update current article
            if (state.currentArticle?.id === articleId) {
              state.currentArticle = updated;
            }

            state.isSaving = false;
            state.lastSaved = new Date().toISOString();
          });

          // Check if sync is needed
          await get().checkSyncStatus(articleId);
        } catch (error) {
          console.error('Failed to update article:', error);
          set({ isSaving: false });
        }
      },

      // Delete article
      deleteArticle: async (articleId: string) => {
        const db = getDatabaseService();
        const success = await db.deleteArticle(articleId);

        if (success) {
          set((state) => {
            state.articles = state.articles.filter((a) => a.id !== articleId);

            if (state.currentArticle?.id === articleId) {
              state.currentArticle = null;
              state.selectedArticleId = null;
            }

            state.syncWarnings.delete(articleId);
          });
        }
      },

      // Set current article
      setCurrentArticle: (article: Article | null) => {
        set({
          currentArticle: article,
          selectedArticleId: article?.id || null,
        });
      },

      // Update content
      updateContent: (content: string) => {
        set((state) => {
          if (state.currentArticle) {
            state.currentArticle.contentOriginal = content;
          }
        });
      },

      // Update metadata
      updateMetadata: (metadata: Partial<Article['metadata']>) => {
        set((state) => {
          if (state.currentArticle) {
            state.currentArticle.metadata = {
              ...state.currentArticle.metadata,
              ...metadata,
            };
          }
        });
      },

      // Update variant
      updateVariant: (platform: Platform, content: string) => {
        set((state) => {
          if (state.currentArticle) {
            if (!state.currentArticle.contentVariants) {
              state.currentArticle.contentVariants = {};
            }

            state.currentArticle.contentVariants[platform] = {
              content,
              lastModified: new Date().toISOString(),
              isCustomized: true,
            };
          }
        });
      },

      // Update status
      updateStatus: (articleId: string, status: ArticleStatus) => {
        set((state) => {
          const article = state.articles.find((a) => a.id === articleId);
          if (article) {
            article.status = status;
          }

          if (state.currentArticle?.id === articleId) {
            state.currentArticle.status = status;
          }
        });
      },

      // Update publication status
      updatePublicationStatus: (articleId: string, publication: Publication) => {
        set((state) => {
          const article = state.articles.find((a) => a.id === articleId);
          if (article) {
            if (!article.publications) {
              article.publications = {} as any;
            }
            article.publications[publication.platform] = publication;
          }

          if (state.currentArticle?.id === articleId) {
            if (!state.currentArticle.publications) {
              state.currentArticle.publications = {} as any;
            }
            state.currentArticle.publications[publication.platform] = publication;
          }
        });
      },

      // Check sync status
      checkSyncStatus: async (articleId: string) => {
        const article = get().articles.find((a) => a.id === articleId);
        if (!article) return;

        const currentHash = await hashContent(article.contentOriginal);
        const unsyncedPlatforms: Platform[] = [];

        // Check each published platform
        if (article.publications) {
          for (const [platform, pub] of Object.entries(article.publications)) {
            if (pub.contentHash && pub.contentHash !== currentHash) {
              unsyncedPlatforms.push(platform as Platform);
            }
          }
        }

        if (unsyncedPlatforms.length > 0) {
          const warning: SyncWarning = {
            hasUnsynced: true,
            platforms: unsyncedPlatforms,
            message: `Content modified. ${unsyncedPlatforms.length} platform(s) not updated.`,
          };

          set((state) => {
            state.syncWarnings.set(articleId, warning);

            const article = state.articles.find((a) => a.id === articleId);
            if (article) {
              article.syncWarning = warning;
            }

            if (state.currentArticle?.id === articleId) {
              state.currentArticle.syncWarning = warning;
            }
          });
        } else {
          set((state) => {
            state.syncWarnings.delete(articleId);
          });
        }
      },

      // Mark variant as customized
      markAsCustomized: (platform: Platform) => {
        set((state) => {
          if (state.currentArticle?.contentVariants?.[platform]) {
            state.currentArticle.contentVariants[platform].isCustomized = true;
            state.currentArticle.contentVariants[platform].lastModified =
              new Date().toISOString();
          }
        });
      },

      // Enable auto-save
      enableAutoSave: () => {
        if (autoSaveTimer) return;

        autoSaveTimer = setInterval(() => {
          const { currentArticle, isSaving } = get();

          if (currentArticle && !isSaving) {
            get().updateArticle(currentArticle.id, {
              contentOriginal: currentArticle.contentOriginal,
              metadata: currentArticle.metadata,
              contentVariants: currentArticle.contentVariants,
            });
          }
        }, AUTO_SAVE_INTERVAL);
      },

      // Disable auto-save
      disableAutoSave: () => {
        if (autoSaveTimer) {
          clearInterval(autoSaveTimer);
          autoSaveTimer = null;
        }
      },
    })),
    {
      name: 'omnipost-article-storage',
      partialize: (state) => ({
        selectedArticleId: state.selectedArticleId,
        lastSaved: state.lastSaved,
      }),
    }
  )
);

/**
 * Selector hooks for optimized re-renders
 */
export const useArticles = () => useArticleStore((state) => state.articles);
export const useCurrentArticle = () =>
  useArticleStore((state) => state.currentArticle);
export const useArticleLoading = () =>
  useArticleStore((state) => state.isLoading);
export const useArticleSaving = () =>
  useArticleStore((state) => state.isSaving);
export const useSyncWarnings = () =>
  useArticleStore((state) => state.syncWarnings);
