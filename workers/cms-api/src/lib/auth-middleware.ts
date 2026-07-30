import type { AuthContext, CmsEnv } from '../types';
import { apiError } from './http';
import { requireSession } from './session';

export type AuthResult =
  | { authenticated: true; auth: AuthContext }
  | { authenticated: false; response: Response };

export async function authenticate(request: Request, env: CmsEnv): Promise<AuthResult> {
  const auth = await requireSession(request, env);
  if (!auth) {
    return {
      authenticated: false,
      response: apiError(401, 'unauthorized', '登录已过期，请重新登录。'),
    };
  }
  return { authenticated: true, auth };
}
