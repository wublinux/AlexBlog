import type { CmsEnv } from './types';
import { apiError, errorResponse, requireSameOrigin } from './lib/http';
import {
  handleGitHubDailyRequest,
  refreshGitHubDaily,
} from './lib/github-daily';
import { handleAuth } from './routes/auth';
import { handleDeploy } from './routes/deploy';
import { handleMedia } from './routes/media';
import { handlePosts } from './routes/posts';

export default {
  async fetch(request: Request, env: CmsEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    if (pathname === '/api/github-daily') {
      try {
        return await handleGitHubDailyRequest(request, env);
      } catch (error) {
        return errorResponse(error);
      }
    }

    if (pathname === '/admin/api/health' && request.method === 'GET') {
      return Response.json(
        { ok: true },
        {
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
          },
        },
      );
    }

    if (!pathname.startsWith('/admin/api/')) {
      return apiError(404, 'route_not_found', '接口不存在。');
    }

    const originError = requireSameOrigin(request, env);
    if (originError) return originError;

    try {
      if (pathname.startsWith('/admin/api/auth/')) {
        return await handleAuth(request, env);
      }
      if (pathname === '/admin/api/posts' || pathname.startsWith('/admin/api/posts/')) {
        return await handlePosts(request, env);
      }
      if (pathname === '/admin/api/media' || pathname === '/admin/api/media/upload') {
        return await handleMedia(request, env);
      }
      if (pathname === '/admin/api/deploy/status') {
        return await handleDeploy(request, env);
      }
      return apiError(404, 'route_not_found', '接口不存在。');
    } catch (error) {
      return errorResponse(error);
    }
  },
  async scheduled(controller: ScheduledController, env: CmsEnv): Promise<void> {
    try {
      const snapshot = await refreshGitHubDaily(env, new Date(controller.scheduledTime));
      console.log(
        JSON.stringify({
          event: 'github_daily_refresh_complete',
          generatedAt: snapshot.generatedAt,
          itemCount: snapshot.items.length,
          aiReviewCount: snapshot.items.filter((item) => item.review.source === 'ai').length,
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'github_daily_refresh_failed',
          error: error instanceof Error ? error.message : 'unknown_error',
        }),
      );
      throw error;
    }
  },
} satisfies ExportedHandler<CmsEnv>;
