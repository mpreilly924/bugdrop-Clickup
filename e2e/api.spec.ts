import { test, expect } from '@playwright/test';

/**
 * E2E tests for API endpoints
 * Tests run against wrangler dev server at http://localhost:8787
 */

test.describe('Health API', () => {
  test('GET /api/health returns correct structure', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.environment).toBe('development');
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('GET /api/health has CORS headers', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.headers()['access-control-allow-origin']).toBe('*');
  });
});

test.describe('ClickUp destination check API', () => {
  test('GET /api/check reports whether the ClickUp destination is configured', async ({
    request,
  }) => {
    const response = await request.get('/api/check');

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ configured: false });
  });
});

test.describe('Feedback API - Validation', () => {
  test('POST /api/feedback does not require a GitHub repository', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {
        title: 'Test',
        description: 'Test description',
      },
    });
    expect(response.status()).toBe(503);
  });

  test('POST /api/feedback returns 400 for missing title', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {
        description: 'Test description',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('POST /api/feedback accepts missing description (optional field)', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {
        title: 'Test',
      },
    });
    // Description is optional — server should not reject this.
    // It reaches destination configuration instead of failing repository validation.
    expect(response.status()).toBe(503);
  });

  test('POST /api/feedback returns 400 for invalid JSON', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not valid json{',
    });
    expect(response.status()).toBe(400);
  });
});

test.describe('Feedback API - Valid Payloads', () => {
  test('POST /api/feedback with valid payload returns 503 when ClickUp is not configured', async ({
    request,
  }) => {
    const response = await request.post('/api/feedback', {
      data: {
        title: 'Test Feedback',
        description: 'This is a test feedback submission',
        metadata: {
          url: 'http://localhost:8787/test/',
          userAgent: 'Playwright Test',
          viewport: { width: 1920, height: 1080 },
          timestamp: new Date().toISOString(),
        },
      },
    });

    expect(response.status()).toBe(503);
  });
});

test.describe('CORS', () => {
  test('OPTIONS /api/health returns correct CORS headers', async ({ request }) => {
    const response = await request.fetch('/api/health', { method: 'OPTIONS' });
    expect(response.status()).toBe(204);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toContain('GET');
  });

  test('OPTIONS /api/feedback returns correct CORS headers', async ({ request }) => {
    const response = await request.fetch('/api/feedback', { method: 'OPTIONS' });
    expect(response.status()).toBe(204);
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toContain('POST');
  });
});
