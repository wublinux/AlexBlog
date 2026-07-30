import type { CmsEnv } from '../types';

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
} as const;

export function json(data: unknown, init: number | ResponseInit = 200): Response {
  const responseInit = typeof init === 'number' ? { status: init } : init;
  const headers = new Headers(responseInit.headers);

  for (const [name, value] of Object.entries(JSON_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }

  return Response.json(data, { ...responseInit, headers });
}

export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

export function methodNotAllowed(methods: string[]): Response {
  const response = apiError(405, 'method_not_allowed', '此接口不支持当前请求方式。');
  response.headers.set('Allow', methods.join(', '));
  return response;
}

export function isMutation(request: Request): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
}

export function hasExpectedOrigin(request: Request, env: CmsEnv): boolean {
  const origin = request.headers.get('Origin');
  return origin === new URL(env.PUBLIC_APP_ORIGIN).origin;
}

export function requireSameOrigin(request: Request, env: CmsEnv): Response | null {
  if (!isMutation(request) || hasExpectedOrigin(request, env)) return null;
  return apiError(403, 'invalid_origin', '请求来源无效，请刷新后台后重试。');
}

export async function readJson<T>(
  request: Request,
  maximumBytes = 1_200_000,
): Promise<T> {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', '请求必须使用 JSON 格式。');
  }

  const declaredLength = Number(request.headers.get('Content-Length') ?? '0');
  if (declaredLength > maximumBytes) {
    throw new HttpError(413, 'payload_too_large', '请求内容过大。');
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new HttpError(413, 'payload_too_large', '请求内容过大。');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'invalid_json', 'JSON 内容无效。');
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return apiError(error.status, error.code, error.message);
  }

  const requestId = crypto.randomUUID();
  console.error(JSON.stringify({ event: 'unhandled_error', requestId, error }));
  return apiError(500, 'internal_error', `服务暂时不可用（${requestId}）。`);
}
