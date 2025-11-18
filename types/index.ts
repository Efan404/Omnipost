/**
 * Core type definitions for Omnipost multi-platform publishing system
 */

// ============================================================================
// Platform Types
// ============================================================================

/**
 * Supported publishing platforms
 */
export enum Platform {
  DEV_TO = 'devto',
  MEDIUM = 'medium',
  JUEJIN = 'juejin',
  ZHIHU = 'zhihu',
  SSPAI = 'sspai',
}

/**
 * Platform display information
 */
export interface PlatformInfo {
  id: Platform;
  name: string;
  icon: string;
  color: string;
  requiresAuth: boolean;
  authType: 'api_key' | 'oauth2' | 'cookie';
  isAvailable: boolean;
}

/**
 * Platform capabilities and constraints
 */
export interface PlatformCapabilities {
  supportMarkdown: boolean;
  maxTitleLength: number;
  maxContentLength?: number;
  imageHosting: 'self' | 'external' | 'cdn';
  requiresCover: boolean;
  supportsCodeBlocks: boolean;
  supportsTags: boolean;
  maxTags?: number;
  supportsSeries: boolean;
  canUpdate: boolean;
  requiresManualPublish: boolean;
}

// ============================================================================
// Article Types
// ============================================================================

/**
 * Article status in the publishing workflow
 */
export enum ArticleStatus {
  DRAFT = 'draft',
  TRANSLATING = 'translating',
  TRANSLATION_REVIEW = 'translation_review',
  READY_TO_PUBLISH = 'ready',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  PARTIALLY_PUBLISHED = 'partial',
  FAILED = 'failed',
}

/**
 * Platform-specific publish status
 */
export enum PlatformPublishStatus {
  NOT_PUBLISHED = 'not_published',
  PENDING = 'pending',
  PLATFORM_REVIEW = 'reviewing',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

/**
 * Content variant for a specific platform
 */
export interface ContentVariant {
  content: string;
  lastModified: string;
  isCustomized: boolean; // User manually edited
  contentHash?: string;
}

/**
 * Platform-specific content variants
 */
export type PlatformVariants = {
  [key in Platform]?: ContentVariant;
};

/**
 * Article metadata
 */
export interface ArticleMetadata {
  title: string;
  tags: string[];
  category?: string;
  seoDescription?: string;
  coverImage?: string;
  canonicalUrl?: string;
  series?: string;
}

/**
 * Translation for a specific language
 */
export interface Translation {
  language: string;
  content: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  qualityScore?: number;
  reviewReport?: TranslationReviewReport;
  reviewedAt?: string;
  reviewedBy?: string;
}

/**
 * Publication record for a platform
 */
export interface Publication {
  platform: Platform;
  status: PlatformPublishStatus;
  publishedUrl?: string;
  publishedAt?: string;
  lastSyncedAt?: string;
  contentHash?: string;
  error?: string;
  retryCount?: number;
}

/**
 * Sync warning when content is out of date
 */
export interface SyncWarning {
  hasUnsynced: boolean;
  platforms: Platform[];
  message: string;
}

/**
 * Complete Article entity
 */
export interface Article {
  id: string;
  userId: string;
  status: ArticleStatus;
  metadata: ArticleMetadata;

  // Content
  contentOriginal: string;
  contentVariants: PlatformVariants;

  // Translations
  translations: Record<string, Translation>;

  // Publications
  publications: Record<Platform, Publication>;

  // Sync status
  syncWarning?: SyncWarning;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Draft article for creation
 */
export type CreateArticleInput = Pick<Article, 'metadata' | 'contentOriginal'> & {
  userId: string;
};

/**
 * Article update input
 */
export type UpdateArticleInput = Partial<Pick<Article, 'metadata' | 'contentOriginal' | 'contentVariants' | 'status'>>;

// ============================================================================
// Platform Adapter Types
// ============================================================================

/**
 * Platform credentials storage
 */
export interface PlatformCredentials {
  platform: Platform;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  cookie?: string;
  expiresAt?: string;
}

/**
 * Platform configuration per user
 */
export interface PlatformConfig {
  id: string;
  userId: string;
  platform: Platform;
  credentials: PlatformCredentials;
  isValid: boolean;
  lastValidatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Result type for operation results
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Publish result from platform adapter
 */
export interface PublishResult {
  platform: Platform;
  success: boolean;
  url?: string;
  articleId?: string;
  error?: string;
  isDraft?: boolean;
}

/**
 * Draft creation result
 */
export interface DraftResult {
  platform: Platform;
  draftId: string;
  editUrl?: string;
}

/**
 * Update result
 */
export interface UpdateResult {
  platform: Platform;
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Platform status check result
 */
export interface PlatformStatus {
  platform: Platform;
  status: PlatformPublishStatus;
  url?: string;
  publishedAt?: string;
  error?: string;
}

// ============================================================================
// Translation Types
// ============================================================================

/**
 * Translation request
 */
export interface TranslationRequest {
  content: string;
  sourceLang: string;
  targetLang: string;
  domain?: string;
  context?: string;
}

/**
 * Translation review report
 */
export interface TranslationReviewReport {
  accuracyScore: number;
  fluencyScore: number;
  terminologyScore: number;
  overallScore: number;
  suggestions: string[];
  issues?: TranslationIssue[];
}

/**
 * Translation issue
 */
export interface TranslationIssue {
  type: 'accuracy' | 'fluency' | 'terminology' | 'grammar';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: {
    line: number;
    column: number;
  };
  suggestion?: string;
}

/**
 * Translation response
 */
export interface TranslationResponse {
  translationId: string;
  translatedContent: string;
  reviewReport: TranslationReviewReport;
  status: 'pending_human_review' | 'auto_approved';
  createdAt: string;
}

// ============================================================================
// AI Content Processing Types
// ============================================================================

/**
 * Content processing input
 */
export interface ContentProcessInput {
  originalMarkdown: string;
  metadata: ArticleMetadata;
  platforms: Platform[];
}

/**
 * Processed content for a platform
 */
export interface ProcessedContent {
  platform: Platform;
  content: string;
  modifications: ContentModification[];
}

/**
 * Content modification record
 */
export interface ContentModification {
  type: 'removed' | 'added' | 'modified';
  reason: string;
  originalText?: string;
  modifiedText?: string;
  location?: number;
}

/**
 * Platform markup configuration
 */
export interface PlatformMarkup {
  type: 'include' | 'exclude';
  platforms: Platform[];
  content: string;
}

// ============================================================================
// User Types
// ============================================================================

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  defaultPlatforms: Platform[];
  autoTranslate: boolean;
  translationAutoApproveThreshold: number;
  requireManualReview: boolean;
  defaultLanguage: string;
  targetLanguages: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic API response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Editor Types
// ============================================================================

/**
 * Editor mode
 */
export type EditorMode = 'wysiwyg' | 'source';

/**
 * Editor state
 */
export interface EditorState {
  mode: EditorMode;
  content: string;
  isDirty: boolean;
  lastSaved?: string;
}
