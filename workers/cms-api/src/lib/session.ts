import type { AuthContext, CmsEnv, SessionData } from '../types';

export const SESSION_COOKIE = '__Host-alexblog_cms';
export const OAUTH_COOKIE = '__Host-alexblog_oauth';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const OAUTH_TTL_SECONDS = 10 * 60;

function cookieValue(request: Request, name: string): string | null {
  const cookies = request.headers.get('Cookie') ?? '';
  for (const item of cookies.split(';')) {
    const [rawName, ...rawValue] = item.trim().split('=');
    if (rawName === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

export function sessionCookie(sessionId: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function oauthCookie(state: string): string {
  return `${OAUTH_COOKIE}=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${OAUTH_TTL_SECONDS}`;
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createOAuthState(env: CmsEnv, state: string): Promise<void> {
  await env.SESSIONS.put(`oauth:${state}`, '1', {
    expirationTtl: OAUTH_TTL_SECONDS,
  });
}

export async function consumeOAuthState(env: CmsEnv, state: string): Promise<boolean> {
  const key = `oauth:${state}`;
  const value = await env.SESSIONS.get(key);
  await env.SESSIONS.delete(key);
  return value === '1';
}

export function oauthStateFromRequest(request: Request): string | null {
  return cookieValue(request, OAUTH_COOKIE);
}

export async function createSession(env: CmsEnv, data: SessionData): Promise<string> {
  const sessionId = randomToken();
  await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return sessionId;
}

export async function requireSession(
  request: Request,
  env: CmsEnv,
): Promise<AuthContext | null> {
  const sessionId = cookieValue(request, SESSION_COOKIE);
  if (!sessionId) return null;

  const session = await env.SESSIONS.get<SessionData>(`session:${sessionId}`, 'json');
  if (!session) return null;

  return { ...session, sessionId };
}

export async function deleteSession(env: CmsEnv, sessionId: string): Promise<void> {
  await env.SESSIONS.delete(`session:${sessionId}`);
}

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

export async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);

  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(leftHash, rightHash);
  }

  // Node's Web Crypto used by local Vitest does not yet expose
  // timingSafeEqual. Both SHA-256 digests are fixed at 32 bytes, so this
  // no-early-return fallback preserves the same comparison shape.
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index]! ^ rightBytes[index]!;
  }
  return difference === 0;
}
