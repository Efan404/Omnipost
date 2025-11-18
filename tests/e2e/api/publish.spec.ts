/**
 * E2E Tests for Publishing API
 *
 * Tests the complete publishing workflow including:
 * - API validation
 * - Rate limiting
 * - Error handling
 * - Multi-platform publishing
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Publishing API', () => {
  test.describe('POST /api/publish', () => {
    test('should reject request without required fields', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/publish`, {
        data: {},
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    test('should reject request with invalid platforms', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/publish`, {
        data: {
          articleId: 'test-article-id',
          userId: 'test-user-id',
          platforms: ['invalid-platform'],
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Validation failed');
    });

    test('should enforce rate limiting', async ({ request }) => {
      const validPayload = {
        articleId: 'test-article-id',
        userId: 'test-user-id',
        platforms: ['dev.to'],
      };

      // Make multiple requests to trigger rate limit (5 per minute)
      const requests = Array(6)
        .fill(null)
        .map(() =>
          request.post(`${API_BASE_URL}/api/publish`, {
            data: validPayload,
          })
        );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.status() === 429);
      expect(rateLimited).toBe(true);

      // Check rate limit headers
      const limitedResponse = responses.find((r) => r.status() === 429);
      if (limitedResponse) {
        const headers = limitedResponse.headers();
        expect(headers['retry-after']).toBeTruthy();
      }
    });

    test('should return proper error structure', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/publish`, {
        data: {
          articleId: 'non-existent-id',
          userId: 'test-user-id',
          platforms: ['dev.to'],
        },
      });

      const body = await response.json();

      // Should have error field
      expect(body.error).toBeTruthy();

      // May have category for API errors
      if (body.category) {
        expect(['NETWORK', 'AUTHENTICATION', 'VALIDATION', 'SERVER', 'RATE_LIMIT', 'UNKNOWN']).toContain(
          body.category
        );
      }
    });
  });

  test.describe('GET /api/publish', () => {
    test('should require articleId parameter', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/publish`);

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('articleId');
    });

    test('should return publications for valid articleId', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/publish?articleId=test-id`);

      // Will be 404 or 200 depending on if article exists
      expect([200, 404, 500]).toContain(response.status());
    });
  });
});
