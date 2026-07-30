export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

export class CmsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'request_failed',
  ) {
    super(message);
    this.name = 'CmsApiError';
  }
}

export async function cmsRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers,
  });

  if (response.status === 401) {
    window.location.assign('/admin/');
    throw new CmsApiError('登录已过期，请重新登录。', 401, 'unauthorized');
  }

  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;
  if (!response.ok) {
    throw new CmsApiError(
      payload.error?.message ?? '请求失败，请稍后重试。',
      response.status,
      payload.error?.code,
    );
  }
  return payload;
}
