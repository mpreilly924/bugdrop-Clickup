import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/types';

const mockCreateTask = vi.fn();
const mockUploadTaskAttachment = vi.fn();

vi.mock('../src/lib/clickup', () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  uploadTaskAttachment: (...args: unknown[]) => mockUploadTaskAttachment(...args),
}));

const validPngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const payload = {
  title: 'Checkout button fails',
  description: 'Clicking checkout shows an error.',
  category: 'bug',
  screenshot: validPngDataUrl,
  attachments: [
    {
      name: 'console.txt',
      type: 'application/pdf',
      size: 3,
      dataUrl: 'data:application/pdf;base64,MTIz',
    },
  ],
  metadata: {
    url: 'https://example.test/checkout',
    userAgent: 'test-agent',
    viewport: { width: 1440, height: 900 },
    timestamp: '2026-07-14T12:00:00.000Z',
  },
};

const env: Env = {
  CLICKUP_API_TOKEN: 'pk_test',
  CLICKUP_LIST_ID: '901234',
  ENVIRONMENT: 'test',
  ALLOWED_ORIGINS: '*',
  MAX_SCREENSHOT_SIZE_MB: '5',
  ASSETS: {} as Fetcher,
};

async function api() {
  return (await import('../src/routes/api')).default;
}

describe('ClickUp feedback API', () => {
  beforeEach(() => {
    mockCreateTask.mockReset();
    mockUploadTaskAttachment.mockReset();
    mockCreateTask.mockResolvedValue({ id: 'abc123', url: 'https://app.clickup.com/t/abc123' });
    mockUploadTaskAttachment.mockResolvedValue(undefined);
  });

  it('creates a ClickUp task and uploads the screenshot and files to it', async () => {
    const response = await (
      await api()
    ).fetch(
      new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      taskId: 'abc123',
      taskUrl: 'https://app.clickup.com/t/abc123',
    });
    expect(mockCreateTask).toHaveBeenCalledWith(
      'pk_test',
      '901234',
      payload.title,
      expect.stringContaining('## Description'),
      'bug'
    );
    expect(mockUploadTaskAttachment).toHaveBeenNthCalledWith(
      1,
      'pk_test',
      'abc123',
      expect.objectContaining({ name: 'bugdrop-screenshot.png', type: 'image/png' })
    );
    expect(mockUploadTaskAttachment).toHaveBeenNthCalledWith(
      2,
      'pk_test',
      'abc123',
      payload.attachments[0]
    );
  });

  it('keeps the created task and reports attachment warnings when upload fails', async () => {
    mockUploadTaskAttachment.mockRejectedValue(new Error('storage full'));
    const response = await (
      await api()
    ).fetch(
      new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, attachments: [] }),
      }),
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      taskId: 'abc123',
      attachmentWarnings: ['Could not attach bugdrop-screenshot.png.'],
    });
  });

  it('does not create a task when the ClickUp destination is absent', async () => {
    const response = await (
      await api()
    ).fetch(
      new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, screenshot: undefined }),
      }),
      { ...env, CLICKUP_API_TOKEN: '', CLICKUP_LIST_ID: '' }
    );

    expect(response.status).toBe(503);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('validates screenshot bytes before sending anything to ClickUp', async () => {
    const response = await (
      await api()
    ).fetch(
      new Request('http://localhost/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, screenshot: 'data:image/png;base64,MTIz' }),
      }),
      env
    );

    expect(response.status).toBe(400);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('only reports ClickUp readiness from the check endpoint', async () => {
    const response = await (await api()).fetch(new Request('http://localhost/check'), env);
    await expect(response.json()).resolves.toEqual({ configured: true });
  });
});

describe('CORS wildcard subdomain matching', () => {
  const wildcardEnv: Env = {
    ...env,
    ALLOWED_ORIGINS: 'https://*.example.com,https://example.org',
  };

  async function corsOrigin(origin: string): Promise<string | null> {
    const response = await (
      await api()
    ).fetch(new Request('http://localhost/health', { headers: { Origin: origin } }), wildcardEnv);
    return response.headers.get('Access-Control-Allow-Origin');
  }

  it('allows a subdomain matching the wildcard pattern', async () => {
    expect(await corsOrigin('https://app.example.com')).toBe('https://app.example.com');
  });

  it('allows a multi-label subdomain', async () => {
    expect(await corsOrigin('https://a.b.example.com')).toBe('https://a.b.example.com');
  });

  it('rejects the bare apex domain unless explicitly listed', async () => {
    expect(await corsOrigin('https://example.com')).toBeNull();
  });

  it('rejects a mismatched scheme', async () => {
    expect(await corsOrigin('http://app.example.com')).toBeNull();
  });

  it('rejects an unrelated domain', async () => {
    expect(await corsOrigin('https://evil.com')).toBeNull();
  });

  it('rejects a lookalike domain that merely ends with the same suffix', async () => {
    expect(await corsOrigin('https://notexample.com')).toBeNull();
  });

  it('still allows an exact-match origin listed alongside a wildcard', async () => {
    expect(await corsOrigin('https://example.org')).toBe('https://example.org');
  });
});
