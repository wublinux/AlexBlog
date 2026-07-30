import type { CmsEnv, SessionData } from '../types';
import { githubRequest } from '../lib/github';
import { apiError, json, methodNotAllowed } from '../lib/http';
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  clearCookie,
  constantTimeEqual,
  consumeOAuthState,
  createOAuthState,
  createSession,
  deleteSession,
  oauthCookie,
  oauthStateFromRequest,
  randomToken,
  requireSession,
  sessionCookie,
} from '../lib/session';

interface OAuthTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
}

interface GitHubPermission {
  permission: string;
}

const WRITE_PERMISSIONS = new Set<SessionData['permission']>([
  'write',
  'maintain',
  'admin',
]);

export async function handleAuth(request: Request, env: CmsEnv): Promise<Response> {
  const url = new URL(request.url);
  const action = url.pathname.split('/').filter(Boolean).at(-1);

  if (action === 'login') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);

    const state = randomToken();
    await createOAuthState(env, state);

    const callback = new URL('/admin/api/auth/callback', env.PUBLIC_APP_ORIGIN);
    const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
    authorizationUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    authorizationUrl.searchParams.set('redirect_uri', callback.toString());
    authorizationUrl.searchParams.set('scope', env.GITHUB_OAUTH_SCOPE);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('allow_signup', 'false');

    return new Response(null, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store',
        Location: authorizationUrl.toString(),
        'Set-Cookie': oauthCookie(state),
      },
    });
  }

  if (action === 'callback') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);

    const oauthError = url.searchParams.get('error');
    if (oauthError) {
      return apiError(401, 'oauth_denied', 'GitHub 登录未完成，请返回后台重试。');
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const stateCookie = oauthStateFromRequest(request);
    if (!code || !state || !stateCookie) {
      return apiError(400, 'invalid_oauth_callback', 'GitHub 登录回调缺少必要参数。');
    }

    const statesMatch = await constantTimeEqual(state, stateCookie);
    const storedStateIsValid = statesMatch && (await consumeOAuthState(env, state));
    if (!storedStateIsValid) {
      return apiError(403, 'invalid_oauth_state', '登录请求已过期或无法验证，请重新登录。');
    }

    const callback = new URL('/admin/api/auth/callback', env.PUBLIC_APP_ORIGIN);
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'AlexBlog-CMS',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callback.toString(),
      }),
    });
    const tokenPayload = (await tokenResponse.json()) as OAuthTokenResponse;
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      console.warn(
        JSON.stringify({
          event: 'oauth_exchange_failed',
          status: tokenResponse.status,
          error: tokenPayload.error,
        }),
      );
      return apiError(
        401,
        'oauth_exchange_failed',
        tokenPayload.error_description ?? 'GitHub 登录授权失败。',
      );
    }

    const token = tokenPayload.access_token;
    const user = await githubRequest<GitHubUser>(token, '/user');
    const permission = await githubRequest<GitHubPermission>(
      token,
      `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/collaborators/${encodeURIComponent(user.login)}/permission`,
    );

    if (!WRITE_PERMISSIONS.has(permission.permission as SessionData['permission'])) {
      return apiError(403, 'insufficient_permission', '此 GitHub 账号没有仓库写入权限。');
    }

    const sessionId = await createSession(env, {
      user: user.login,
      avatar: user.avatar_url,
      token,
      permission: permission.permission as SessionData['permission'],
      createdAt: Date.now(),
    });
    const headers = new Headers({
      'Cache-Control': 'no-store',
      Location: new URL('/admin/dashboard/', env.PUBLIC_APP_ORIGIN).toString(),
    });
    headers.append('Set-Cookie', sessionCookie(sessionId));
    headers.append('Set-Cookie', clearCookie(OAUTH_COOKIE));
    return new Response(null, { status: 302, headers });
  }

  if (action === 'me') {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const session = await requireSession(request, env);
    return json({
      user: session
        ? {
            login: session.user,
            avatar: session.avatar,
            permission: session.permission,
          }
        : null,
    });
  }

  if (action === 'logout') {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const session = await requireSession(request, env);
    if (session) await deleteSession(env, session.sessionId);
    return json(
      { success: true },
      {
        headers: {
          'Set-Cookie': clearCookie(SESSION_COOKIE),
        },
      },
    );
  }

  return apiError(404, 'route_not_found', '接口不存在。');
}
