import type { FeedbackAttachment } from '../types';

const CLICKUP_API = 'https://api.clickup.com/api/v2';

export interface ClickUpTask {
  id: string;
  url: string;
}

function headers(token: string): HeadersInit {
  return {
    Authorization: token,
    Accept: 'application/json',
  };
}

export async function createTask(
  token: string,
  listId: string,
  name: string,
  markdownContent: string,
  tags: string[]
): Promise<ClickUpTask> {
  const response = await fetch(`${CLICKUP_API}/list/${encodeURIComponent(listId)}/task`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      markdown_content: markdownContent,
      tags,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create ClickUp task: ${response.status} - ${await response.text()}`);
  }

  const task = (await response.json()) as Partial<ClickUpTask>;
  if (!task.id || !task.url) {
    throw new Error('ClickUp returned an invalid task response');
  }
  return { id: task.id, url: task.url };
}

export async function uploadTaskAttachment(
  token: string,
  taskId: string,
  attachment: FeedbackAttachment
): Promise<void> {
  const bytes = dataUrlToBytes(attachment.dataUrl);
  const form = new FormData();
  // ClickUp's v2 attachment endpoint expects files under a plain "attachment"
  // field (repeat the field for multiple files) — per ClickUp's OpenAPI schema.
  // Also use File (not Blob): a plain Blob risks losing its filename through
  // Workers' multipart serialization, which ClickUp then rejects.
  form.append('attachment', new File([bytes], attachment.name, { type: attachment.type }));

  const response = await fetch(`${CLICKUP_API}/task/${encodeURIComponent(taskId)}/attachment`, {
    method: 'POST',
    headers: headers(token),
    body: form,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to upload ClickUp attachment: ${response.status} - ${await response.text()}`
    );
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
