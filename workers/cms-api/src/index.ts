import type { CmsEnv } from './types';
import { apiError, errorResponse, requireSameOrigin } from './lib/http';
import {
  handleGitHubDailyRequest,
  refreshGitHubDaily,
} from './lib/github-daily';
import {
  handleWallpaperRequest,
  refreshWallpaperPool,
} from './lib/wallpaper';
import { handleAuth } from './routes/auth';
import { handleDeploy } from './routes/deploy';
import { handleMedia } from './routes/media';
import { handlePet } from './routes/pet';
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

    if (pathname === '/api/wallpaper') {
      try {
        return await handleWallpaperRequest(request, env);
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
      if (pathname === '/admin/api/pet' || pathname === '/admin/api/pet/upload') {
        return await handlePet(request, env);
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
    const scheduledNow = new Date(controller.scheduledTime);
    const [dailyResult, wallpaperResult] = await Promise.allSettled([
      refreshGitHubDaily(env, scheduledNow),
      refreshWallpaperPool(env, scheduledNow),
    ]);

    const errors: string[] = [];

    if (dailyResult.status === 'fulfilled') {
      const snapshot = dailyResult.value;
      console.log(
        JSON.stringify({
          event: 'github_daily_refresh_complete',
          generatedAt: snapshot.generatedAt,
          itemCount: snapshot.items.length,
          aiReviewCount: snapshot.items.filter((item) => item.review.source === 'ai').length,
        }),
      );
    } else {
      const message =
        dailyResult.reason instanceof Error ? dailyResult.reason.message : 'unknown_error';
      console.error(
        JSON.stringify({
          event: 'github_daily_refresh_failed',
          error: message,
        }),
      );
      errors.push(`github_daily: ${message}`);
    }

    if (wallpaperResult.status === 'fulfilled') {
      const snapshot = wallpaperResult.value;
      console.log(
        JSON.stringify({
          event: 'wallpaper_refresh_complete',
          generatedAt: snapshot.generatedAt,
          itemCount: snapshot.items.length,
        }),
      );
    } else {
      const message =
        wallpaperResult.reason instanceof Error
          ? wallpaperResult.reason.message
          : 'unknown_error';
      console.error(
        JSON.stringify({
          event: 'wallpaper_refresh_failed',
          error: message,
        }),
      );
      errors.push(`wallpaper: ${message}`);
    }

    if (errors.length > 0) {
      throw new Error(`Scheduled refresh failed (${errors.join('; ')})`);
    }
  },
} satisfies ExportedHandler<CmsEnv>;
