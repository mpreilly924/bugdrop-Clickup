import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTask, uploadTaskAttachment } from '../src/lib/clickup';

describe('ClickUp API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates a tagged task in the configured list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'abc123', url: 'https://app.clickup.com/t/abc123' }), {
        status: 200,
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createTask('pk_test', '901234', 'Broken checkout', 'Details', ['bugdrop', 'bug'])
    ).resolves.toEqual({
      id: 'abc123',
      url: 'https://app.clickup.com/t/abc123',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.clickup.com/api/v2/list/901234/task',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'pk_test' }),
        body: JSON.stringify({
          name: 'Broken checkout',
          markdown_content: 'Details',
          tags: ['bugdrop', 'bug'],
        }),
      })
    );
  });

  it('uploads files with ClickUp’s attachment multipart field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await uploadTaskAttachment('pk_test', 'abc123', {
      name: 'evidence.pdf',
      type: 'application/pdf',
      size: 3,
      dataUrl: 'data:application/pdf;base64,MTIz',
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.clickup.com/api/v2/task/abc123/attachment'
    );
    expect(request.headers).toEqual(expect.objectContaining({ Authorization: 'pk_test' }));
    expect(request.body).toBeInstanceOf(FormData);
    const uploaded = (request.body as FormData).get('attachment');
    // Must be a File (not a bare Blob) — ClickUp rejects the upload with
    // "Incorrect filename!" (UPLOAD_002) if the filename isn't carried through.
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe('evidence.pdf');
    expect((uploaded as File).type).toBe('application/pdf');
  });
});
