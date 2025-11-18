/**
 * Rate Limiter
 *
 * In-memory rate limiting for API endpoints.
 * For production, consider using Redis-based rate limiting (e.g., upstash-ratelimit).
 *
 * Implements sliding window rate limiting algorithm.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Optional message to return when rate limit is exceeded
   */
  message?: string;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  requests: number[];
  resetAt: number;
}

/**
 * In-memory store for rate limiting
 * Key format: "identifier:endpoint"
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get identifier from request
 * Uses IP address or user ID from auth token
 */
function getIdentifier(request: NextRequest): string {
  // Try to get user ID from auth (if implemented)
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return userId;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.ip || 'anonymous';

  return ip;
}

/**
 * Check if request should be rate limited
 *
 * @param identifier - Unique identifier for the client (IP, user ID, etc.)
 * @param endpoint - API endpoint path
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
} {
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  // Get or create entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry
    entry = {
      requests: [now],
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Filter out requests outside the window
  entry.requests = entry.requests.filter((timestamp) => timestamp > now - windowMs);

  // Check if limit exceeded
  if (entry.requests.length >= config.maxRequests) {
    const oldestRequest = entry.requests[0];
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Add current request
  entry.requests.push(now);
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.requests.length,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit middleware for API routes
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = rateLimit(request, '/api/publish', {
 *     maxRequests: 5,
 *     windowSeconds: 60,
 *   });
 *
 *   if (rateLimitResult) {
 *     return rateLimitResult; // Returns 429 response
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig
): NextResponse | null {
  const identifier = getIdentifier(request);
  const result = checkRateLimit(identifier, endpoint, config);

  // Add rate limit headers to response (even if allowed)
  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message:
          config.message ||
          `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': result.retryAfter!.toString(),
        },
      }
    );
  }

  // Request is allowed, headers can be added to response in route handler
  return null;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Publishing endpoints - 5 requests per minute
  publish: {
    maxRequests: 5,
    windowSeconds: 60,
    message: 'Publishing rate limit exceeded. Please wait before publishing again.',
  },

  // Translation endpoints - 10 requests per minute
  translate: {
    maxRequests: 10,
    windowSeconds: 60,
    message: 'Translation rate limit exceeded. Please wait before translating again.',
  },

  // Content processing - 10 requests per minute
  contentProcess: {
    maxRequests: 10,
    windowSeconds: 60,
    message: 'Content processing rate limit exceeded. Please wait before processing again.',
  },

  // Authentication - 5 requests per 5 minutes
  auth: {
    maxRequests: 5,
    windowSeconds: 300,
    message: 'Too many authentication attempts. Please try again later.',
  },

  // General API - 30 requests per minute
  general: {
    maxRequests: 30,
    windowSeconds: 60,
    message: 'API rate limit exceeded. Please slow down your requests.',
  },
} as const;

/**
 * Helper to apply rate limit with default config
 */
export function applyRateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS
): NextResponse | null {
  const endpoint = new URL(request.url).pathname;
  return rateLimit(request, endpoint, RATE_LIMITS[type]);
}

/**
 * Get rate limit status without incrementing counter
 * Useful for checking limits before expensive operations
 */
export function getRateLimitStatus(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): {
  remaining: number;
  resetAt: number;
  allowed: boolean;
} {
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    return {
      remaining: config.maxRequests,
      resetAt: now + windowMs,
      allowed: true,
    };
  }

  const validRequests = entry.requests.filter((timestamp) => timestamp > now - windowMs);

  return {
    remaining: Math.max(0, config.maxRequests - validRequests.length),
    resetAt: entry.resetAt,
    allowed: validRequests.length < config.maxRequests,
  };
}

/**
 * Reset rate limit for a specific identifier and endpoint
 * Useful for testing or admin operations
 */
export function resetRateLimit(identifier: string, endpoint?: string): void {
  if (endpoint) {
    const key = `${identifier}:${endpoint}`;
    rateLimitStore.delete(key);
  } else {
    // Reset all endpoints for this identifier
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        rateLimitStore.delete(key);
      }
    }
  }
}
