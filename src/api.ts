// BrewPage REST calls (POST/PUT /api/html) behind an injectable HTTP function, plus note preparation.
export const API_BASE = 'https://brewpage.app';
export const DEFAULT_NAMESPACE = 'my';

export interface HttpRequest {
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  body: string;
}

export interface HttpResponse {
  status: number;
  json: unknown;
}

export type Http = (request: HttpRequest) => Promise<HttpResponse>;

export interface Publication {
  namespace: string;
  id: string;
  link: string;
}

export interface PublishResult extends Publication {
  ownerToken: string;
}

export interface PublishInput {
  content: string;
  filename: string;
  namespace: string;
  ownerToken: string;
  existing?: Publication;
}

export function normalizeNamespace(value: string): string | null {
  const ns = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,32}$/.test(ns) ? ns : null;
}

export function prepareMarkdown(source: string): string {
  return source
    .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]|#]+)(?:#[^\]]*)?\]\]/g, '$1')
    .replace(/%%[\s\S]*?%%/g, '')
    .trim();
}

export function noteFilename(basename: string): string {
  const name = basename.replace(/[\\/:*?"<>|\p{Cc}]+/gu, '-').trim().slice(0, 120);
  return `${name.length >= 4 ? name : `${name || 'note'}-brewpage`}.md`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readResult(response: HttpResponse, fallback?: Publication): PublishResult {
  const body = asRecord(response.json);
  if (response.status < 200 || response.status >= 300) {
    const retry = typeof body.retryAfterSeconds === 'number' ? ` Retry in ${body.retryAfterSeconds} s.` : '';
    const message = typeof body.message === 'string' ? body.message : `BrewPage answered HTTP ${response.status}.`;
    throw new Error(`${message}${retry}`);
  }
  const link = typeof body.link === 'string' ? body.link : fallback?.link;
  const id = typeof body.id === 'string' ? body.id : fallback?.id;
  if (!link || !id) throw new Error('BrewPage answered without a link.');
  return {
    link,
    id,
    namespace: typeof body.namespace === 'string' ? body.namespace : (fallback?.namespace ?? ''),
    ownerToken: typeof body.ownerToken === 'string' ? body.ownerToken : '',
  };
}

export async function publishMarkdown(input: PublishInput, http: Http): Promise<PublishResult> {
  const body = JSON.stringify({ content: input.content, format: 'markdown', filename: input.filename });
  const { existing, ownerToken } = input;
  if (existing && ownerToken && existing.namespace === input.namespace) {
    const update = await http({
      url: `${API_BASE}/api/html/${encodeURIComponent(existing.namespace)}/${encodeURIComponent(existing.id)}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Owner-Token': ownerToken },
      body: JSON.stringify({ content: input.content, format: 'markdown' }),
    });
    if (update.status !== 404 && update.status !== 410) return readResult(update, existing);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ownerToken) headers['X-Owner-Token'] = ownerToken;
  const create = await http({
    url: `${API_BASE}/api/html?ns=${encodeURIComponent(input.namespace)}`,
    method: 'POST',
    headers,
    body,
  });
  return readResult(create);
}
