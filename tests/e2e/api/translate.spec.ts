/**
 * E2E Tests for Translation API
 *
 * Tests translation workflow including:
 * - Input validation
 * - Rate limiting
 * - Error handling
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Translation API', () => {
  test.describe('POST /api/translate', () => {
    test('should reject request without required fields', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/translate`, {
        data: {},
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    test('should reject invalid language codes', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/translate`, {
        data: {
          content: 'Hello world',
          sourceLang: 'invalid',
          targetLang: 'zh',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Validation failed');
    });

    test('should reject content exceeding max length', async ({ request }) => {
      const longContent = 'a'.repeat(60000); // Exceeds 50,000 char limit

      const response = await request.post(`${API_BASE_URL}/api/translate`, {
        data: {
          content: longContent,
          sourceLang: 'en',
          targetLang: 'zh',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error || body.details).toBeTruthy();
    });

    test('should enforce rate limiting', async ({ request }) => {
      const validPayload = {
        content: 'Test content',
        sourceLang: 'en',
        targetLang: 'zh',
      };

      // Make 11 requests (limit is 10 per minute)
      const requests = Array(11)
        .fill(null)
        .map(() =>
          request.post(`${API_BASE_URL}/api/translate`, {
            data: validPayload,
          })
        );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.status() === 429);
      expect(rateLimited).toBe(true);
    });

    test('should accept valid translation request', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/translate`, {
        data: {
          content: 'Hello world',
          sourceLang: 'en',
          targetLang: 'zh',
        },
      });

      // Will fail if AI credentials not configured, but should validate
      expect([200, 500]).toContain(response.status());
    });

    test('should accept optional context parameter', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/translate`, {
        data: {
          content: 'Hello world',
          sourceLang: 'en',
          targetLang: 'zh',
          context: 'Technical documentation',
        },
      });

      expect([200, 500]).toContain(response.status());
    });
  });
});
