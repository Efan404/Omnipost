# Error Handling and Security Features

This document describes the error handling and security features implemented in Omnipost.

## Table of Contents

- [Error Handling](#error-handling)
- [Security Features](#security-features)
- [Testing](#testing)
- [Best Practices](#best-practices)

---

## Error Handling

### 1. Global Error Boundary

**Location:** `components/error-boundary.tsx`

A React error boundary component that catches JavaScript errors anywhere in the component tree and displays a fallback UI.

**Features:**
- Catches React component errors
- Displays user-friendly error messages
- Shows detailed error information in development mode
- Provides "Try Again" and "Go Home" actions
- Logs errors to console (ready for monitoring service integration)

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

The error boundary is automatically applied to the entire app in `app/layout.tsx`.

### 2. API Error Handler

**Location:** `lib/api/error-handler.ts`

Comprehensive error handling for API calls with retry logic and error categorization.

**Features:**
- Error categorization (Network, Auth, Validation, Server, Rate Limit)
- Exponential backoff retry mechanism (max 3 attempts)
- User-friendly error messages
- Structured error types
- Integration-ready for monitoring services (Sentry, etc.)

**Usage:**
```ts
import { fetchWithRetry, apiPost, handleAPIError } from '@/lib/api/error-handler';

// Simple fetch with retry
try {
  const data = await fetchWithRetry('/api/publish', {
    method: 'POST',
    body: JSON.stringify({ articleId: '123' }),
  });
} catch (error) {
  handleAPIError(error, toast);
}

// Or use convenience methods
const data = await apiPost('/api/publish', { articleId: '123' });
```

**Retry Configuration:**
```ts
const data = await fetchWithRetry('/api/endpoint', options, {
  maxAttempts: 5,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
});
```

### 3. Platform-Specific Error Handlers

**Location:** `lib/api/platform-error-handler.ts`

Handles platform-specific errors and edge cases for Dev.to, Medium, and other platforms.

**Features:**
- Dev.to rate limiting (429) handling
- Medium OAuth token expiration handling
- Platform-specific error messages
- Content validation against platform limits
- Retry recommendations

**Dev.to Error Handling:**
- Rate limit: 30 requests per 30 seconds
- Automatic retry after 60 seconds
- Invalid API key detection

**Medium Error Handling:**
- Token expiration detection
- Draft-only limitation messaging
- Re-authentication prompts

**Usage:**
```ts
import { PlatformErrorHandler, validatePlatformLimits } from '@/lib/api/platform-error-handler';

// Handle platform error
const error = PlatformErrorHandler.handleError(
  Platform.DEVTO,
  429,
  responseData
);

// Validate content
const validation = validatePlatformLimits(
  Platform.DEVTO,
  article.title,
  article.content,
  article.tags
);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### 4. Form Validation

**Location:** `lib/validation/schemas.ts`

Centralized Zod schemas for type-safe form validation.

**Available Schemas:**
- `articleSchema` - Article creation/editing
- `platformConfigSchema` - Platform configuration
- `translationRequestSchema` - Translation requests
- `publishRequestSchema` - Publishing requests
- `userRegistrationSchema` - User registration
- `userLoginSchema` - User login
- `imageUploadSchema` - Image uploads

**Usage:**
```ts
import { articleSchema, validateWithSchema } from '@/lib/validation/schemas';

const result = validateWithSchema(articleSchema, formData);

if (result.success) {
  // Use result.data (type-safe)
} else {
  // Display result.errors
}
```

### 5. Toast Notifications

**Location:** `components/ui/toast.tsx`, `hooks/use-toast.ts`

User-friendly toast notifications for errors, success messages, and warnings.

**Usage:**
```ts
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
  title: 'Error',
  description: 'Failed to publish article',
  variant: 'destructive',
});

toast({
  title: 'Success',
  description: 'Article published successfully',
  variant: 'success',
});
```

---

## Security Features

### 1. Security Headers Middleware

**Location:** `middleware.ts`

Next.js middleware that adds security headers to all responses.

**Security Headers:**
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Browser XSS protection
- `Content-Security-Policy` - Restricts resource loading
- `Permissions-Policy` - Controls browser features
- `Referrer-Policy` - Controls referrer information

**CORS Configuration:**
- Whitelist allowed origins
- Credentials support for same-origin
- Preflight request handling

**Protected Routes:**
The middleware is ready for authentication checks (commented out until auth is implemented).

### 2. API Key Encryption

**Location:** `lib/security/encryption.ts`

AES-256-GCM encryption for sensitive data like API keys and access tokens.

**Features:**
- Web Crypto API for browser and Node.js
- Random IV for each encryption
- Secure key derivation from environment variable
- Encryption/decryption utilities
- Platform config encryption helpers

**Setup:**

1. Generate an encryption key:
```bash
openssl rand -hex 32
```

2. Add to `.env`:
```
ENCRYPTION_KEY=your_64_character_hex_key_here
```

**Usage:**
```ts
import { encrypt, decrypt, encryptPlatformConfig } from '@/lib/security/encryption';

// Encrypt API key
const encrypted = await encrypt('my-api-key-12345');

// Decrypt API key
const decrypted = await decrypt(encrypted);

// Encrypt platform config
const config = {
  apiKey: 'secret-key',
  accessToken: 'secret-token',
};

const encryptedConfig = await encryptPlatformConfig(config);
```

**Important:**
- NEVER commit the encryption key to version control
- Store it securely in environment variables
- Rotate keys periodically in production
- Use different keys for different environments

### 3. Rate Limiting

**Location:** `lib/security/rate-limiter.ts`

In-memory rate limiting for API endpoints using sliding window algorithm.

**Configuration:**
- Publishing: 5 requests per minute
- Translation: 10 requests per minute
- Content Processing: 10 requests per minute
- Authentication: 5 requests per 5 minutes
- General API: 30 requests per minute

**Usage in API Routes:**
```ts
import { applyRateLimit } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, 'publish');
  if (rateLimitResponse) {
    return rateLimitResponse; // Returns 429 response
  }

  // Process request...
}
```

**Custom Rate Limiting:**
```ts
import { rateLimit } from '@/lib/security/rate-limiter';

const rateLimitResponse = rateLimit(request, '/api/custom', {
  maxRequests: 10,
  windowSeconds: 60,
  message: 'Custom rate limit exceeded',
});
```

**Production Note:**
For production, consider using Redis-based rate limiting (e.g., `upstash-ratelimit`) for better scalability across multiple server instances.

### 4. Input Sanitization

**Integrated with Zod Validation:**
- All inputs validated against schemas
- Type coercion and sanitization
- Max length enforcement
- Pattern matching (e.g., email, language codes)
- Custom validation rules

**XSS Prevention:**
- Markdown content rendered safely
- HTML sanitization (TODO: integrate DOMPurify)
- Platform markup escaped correctly

---

## Testing

### E2E Testing with Playwright

**Location:** `tests/e2e/`

Comprehensive end-to-end tests for API endpoints and error handling.

**Test Suites:**
1. `api/publish.spec.ts` - Publishing API tests
2. `api/translate.spec.ts` - Translation API tests
3. `error-handling.spec.ts` - Error handling and security tests

**Running Tests:**

```bash
# Install Playwright browsers
npm run test:install

# Run all E2E tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests for specific browser
npm run test:e2e:chromium

# View test report
npm run test:report
```

**Test Configuration:**
- Runs on multiple browsers (Chrome, Firefox, Safari)
- Mobile viewport testing
- Screenshots on failure
- Video recording on failure
- HTML test reports
- Automatic dev server startup

**Writing Tests:**
```ts
import { test, expect } from '@playwright/test';

test('should handle API errors', async ({ request }) => {
  const response = await request.post('/api/publish', {
    data: { invalid: 'data' },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error).toBeTruthy();
});
```

---

## Best Practices

### Error Handling

1. **Always use try-catch blocks** in API routes and async functions
2. **Provide user-friendly messages** - don't expose technical details to users
3. **Log errors comprehensively** - include context, timestamps, user info
4. **Use structured errors** - APIError class with categories
5. **Handle errors at the right level** - component, page, or global
6. **Test error scenarios** - network failures, invalid inputs, timeouts

### Security

1. **Encrypt all sensitive data** - API keys, tokens, passwords
2. **Validate all inputs** - use Zod schemas, never trust user input
3. **Implement rate limiting** - prevent abuse and DoS attacks
4. **Use security headers** - protect against common attacks
5. **Follow principle of least privilege** - minimal permissions
6. **Keep dependencies updated** - regularly audit for vulnerabilities
7. **Use HTTPS in production** - never transmit sensitive data over HTTP
8. **Implement proper CORS** - only allow trusted origins

### API Development

1. **Use rate limiting** - protect endpoints from abuse
2. **Validate inputs** - Zod schemas for all request bodies
3. **Handle errors gracefully** - return proper HTTP status codes
4. **Implement retry logic** - handle transient failures
5. **Log all errors** - include request context
6. **Return consistent error format** - `{ error, category, details }`
7. **Use middleware** - DRY principle for common operations

### Testing

1. **Write E2E tests** - cover critical user flows
2. **Test error scenarios** - not just happy paths
3. **Test security features** - headers, rate limiting, validation
4. **Run tests in CI/CD** - automate testing
5. **Monitor test coverage** - aim for >80% coverage
6. **Use realistic test data** - avoid trivial test cases

---

## Monitoring and Observability

### Ready for Integration

The error handling system is designed to integrate with monitoring services:

**Supported Services:**
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog (APM)
- New Relic (monitoring)

**Integration Points:**
1. `ErrorBoundary.logErrorToService()` - React errors
2. `error-handler.ts` - API errors
3. Middleware - Request/response logging

**Example Sentry Integration:**
```ts
import * as Sentry from '@sentry/nextjs';

// In ErrorBoundary
logErrorToService(error: Error): void {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}
```

---

## Migration Guide

### Updating Existing API Routes

1. Add rate limiting:
```ts
import { applyRateLimit } from '@/lib/security/rate-limiter';

const rateLimitResponse = applyRateLimit(request, 'general');
if (rateLimitResponse) return rateLimitResponse;
```

2. Add validation:
```ts
import { mySchema } from '@/lib/validation/schemas';

const validation = mySchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    { error: 'Validation failed', details: validation.error.errors },
    { status: 400 }
  );
}
```

3. Use error handlers:
```ts
import { APIError, ErrorCategory } from '@/lib/api/error-handler';

catch (error) {
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.userMessage, category: error.category },
      { status: error.statusCode || 500 }
    );
  }
  // Handle other errors
}
```

### Encrypting Existing Credentials

```ts
import { encryptPlatformConfig, decryptPlatformConfig } from '@/lib/security/encryption';

// When saving to database
const encrypted = await encryptPlatformConfig({
  apiKey: userProvidedKey,
  accessToken: userToken,
});
await db.savePlatformConfig(userId, encrypted);

// When retrieving from database
const encrypted = await db.getPlatformConfig(userId);
const decrypted = await decryptPlatformConfig(encrypted);
// Use decrypted.apiKey, decrypted.accessToken
```

---

## Troubleshooting

### Common Issues

**1. ENCRYPTION_KEY not set**
```
Error: ENCRYPTION_KEY environment variable is not set
```
Solution: Generate and add to `.env`:
```bash
openssl rand -hex 32
```

**2. Rate limit in development**
```
Error: Rate limit exceeded
```
Solution: Use `resetRateLimit()` in development or increase limits in `rate-limiter.ts`.

**3. CORS errors**
```
Error: CORS policy: Origin not allowed
```
Solution: Add your origin to `ALLOWED_ORIGINS` in `middleware.ts`.

**4. Playwright tests failing**
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
Solution: Ensure dev server is running or let Playwright start it automatically.

---

## Future Improvements

### Planned Enhancements

1. **Redis-based rate limiting** - Better scalability
2. **DOMPurify integration** - Enhanced XSS protection
3. **Sentry integration** - Production error monitoring
4. **Account lockout** - Brute force protection
5. **CSRF protection** - Additional security layer
6. **Unit tests** - Complement E2E tests
7. **API documentation** - OpenAPI/Swagger spec
8. **Performance monitoring** - Track API response times
9. **Structured logging** - Better observability
10. **Audit logging** - Security compliance

---

## Resources

- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Playwright Documentation](https://playwright.dev/)
- [Zod Documentation](https://zod.dev/)

---

## Support

For questions or issues, please:
1. Check this documentation
2. Review existing code examples
3. Consult test files for usage patterns
4. Open an issue on GitHub

---

**Last Updated:** 2025-11-18
**Version:** 1.0.0
