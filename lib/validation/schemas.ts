/**
 * Form Validation Schemas
 *
 * Centralized Zod schemas for form validation across the application.
 * Provides type-safe validation with user-friendly error messages.
 */

import { z } from 'zod';
import { Platform, ArticleStatus } from '@/types';

/**
 * Article creation/edit schema
 */
export const articleSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),

  content: z
    .string()
    .min(1, 'Content is required')
    .max(100000, 'Content must be less than 100,000 characters'),

  excerpt: z
    .string()
    .max(500, 'Excerpt must be less than 500 characters')
    .optional()
    .nullable(),

  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),

  coverImageUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .nullable(),

  status: z.nativeEnum(ArticleStatus).default(ArticleStatus.DRAFT),

  language: z
    .string()
    .length(2, 'Language must be a 2-letter ISO code')
    .default('en'),
});

export type ArticleFormData = z.infer<typeof articleSchema>;

/**
 * Platform configuration schema
 */
export const platformConfigSchema = z.object({
  platform: z.nativeEnum(Platform),

  apiKey: z
    .string()
    .min(1, 'API key is required')
    .max(500, 'API key is too long')
    .trim(),

  accessToken: z
    .string()
    .max(1000, 'Access token is too long')
    .optional()
    .nullable(),

  refreshToken: z
    .string()
    .max(1000, 'Refresh token is too long')
    .optional()
    .nullable(),

  enabled: z.boolean().default(true),

  autoPublish: z.boolean().default(false),

  metadata: z
    .record(z.unknown())
    .optional()
    .nullable(),
});

export type PlatformConfigFormData = z.infer<typeof platformConfigSchema>;

/**
 * Translation request schema
 */
export const translationRequestSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be less than 50,000 characters'),

  sourceLang: z
    .string()
    .length(2, 'Source language must be a 2-letter ISO code')
    .regex(/^[a-z]{2}$/, 'Invalid language code'),

  targetLang: z
    .string()
    .length(2, 'Target language must be a 2-letter ISO code')
    .regex(/^[a-z]{2}$/, 'Invalid language code'),

  context: z
    .string()
    .max(1000, 'Context must be less than 1,000 characters')
    .optional()
    .nullable(),
});

export type TranslationRequestData = z.infer<typeof translationRequestSchema>;

/**
 * Publish request schema
 */
export const publishRequestSchema = z.object({
  articleId: z
    .string()
    .min(1, 'Article ID is required'),

  platforms: z
    .array(z.nativeEnum(Platform))
    .min(1, 'At least one platform must be selected')
    .max(10, 'Maximum 10 platforms allowed'),

  scheduledAt: z
    .date()
    .min(new Date(), 'Scheduled time must be in the future')
    .optional()
    .nullable(),

  customMetadata: z
    .record(z.unknown())
    .optional()
    .nullable(),
});

export type PublishRequestData = z.infer<typeof publishRequestSchema>;

/**
 * User registration schema
 */
export const userRegistrationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  confirmPassword: z.string(),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  acceptTerms: z
    .boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type UserRegistrationData = z.infer<typeof userRegistrationSchema>;

/**
 * User login schema
 */
export const userLoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(1, 'Password is required'),
});

export type UserLoginData = z.infer<typeof userLoginSchema>;

/**
 * Content processing schema
 */
export const contentProcessSchema = z.object({
  articleId: z.string().min(1, 'Article ID is required'),

  platforms: z
    .array(z.nativeEnum(Platform))
    .min(1, 'At least one platform must be selected'),

  useAI: z
    .boolean()
    .default(true),

  aiProvider: z
    .enum(['openai', 'anthropic'])
    .optional()
    .nullable(),
});

export type ContentProcessData = z.infer<typeof contentProcessSchema>;

/**
 * Image upload schema
 */
export const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      'File must be a valid image (JPEG, PNG, GIF, or WebP)'
    ),

  articleId: z
    .string()
    .min(1, 'Article ID is required'),
});

export type ImageUploadData = z.infer<typeof imageUploadSchema>;

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  defaultLanguage: z
    .string()
    .length(2, 'Language must be a 2-letter ISO code')
    .default('en'),

  editorTheme: z
    .enum(['light', 'dark', 'system'])
    .default('system'),

  autoSaveInterval: z
    .number()
    .int()
    .min(10, 'Auto-save interval must be at least 10 seconds')
    .max(300, 'Auto-save interval must be at most 300 seconds')
    .default(30),

  defaultPlatforms: z
    .array(z.nativeEnum(Platform))
    .max(10, 'Maximum 10 default platforms')
    .default([]),

  enableAIOptimization: z
    .boolean()
    .default(true),

  preferredAIProvider: z
    .enum(['openai', 'anthropic'])
    .default('openai'),
});

export type UserPreferencesData = z.infer<typeof userPreferencesSchema>;

/**
 * Validate data against a schema and return formatted errors
 */
export function validateWithSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _error: 'Validation failed' } };
  }
}

/**
 * Safe parse with type safety
 */
export function safeParse<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.SafeParseReturnType<unknown, z.infer<T>> {
  return schema.safeParse(data);
}
