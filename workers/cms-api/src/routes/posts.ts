import type { CmsEnv } from '../types';
import { authenticate } from '../lib/auth-middleware';
import {
  deleteRepositoryFile,
  encodeBase64,
  getBlogPost,
  listBlogPosts,
  writeRepositoryFile,
} from '../lib/github';
import { apiError, HttpError, json, methodNotAllowed, readJson } from '../lib/http';
import {
  normalizeExtension,
  normalizeSlug,
  validateMarkdown,
} from '../lib/validation';

interface SavePostBody {
  content?: unknown;
  sha?: unknown;
  extension?: unknown;
}

interface DeletePostBody {
  sha?: unknown;
  extension?: unknown;
}

export async function handlePosts(request: Request, env: CmsEnv): Promise<Response> {
  const authentication = await authenticate(request, env);
  if (!authentication.authenticated) return authentication.response;
  const { auth } = authentication;
  const url = new URL(request.url);
  const routeSuffix = url.pathname.slice('/admin/api/posts'.length).replace(/^\/+|\/+$/g, '');

  if (!routeSuffix) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    return json({ posts: await listBlogPosts(env, auth.token) });
  }

  const slug = normalizeSlug(routeSuffix);

  if (request.method === 'GET') {
    return json(await getBlogPost(env, auth.token, slug));
  }

  if (request.method === 'PUT') {
    const body = await readJson<SavePostBody>(request);
    validateMarkdown(body.content);
    const extension = normalizeExtension(body.extension);
    const sha =
      typeof body.sha === 'string' && /^[a-f0-9]{40}$/i.test(body.sha) ? body.sha : undefined;
    const filePath = `${env.BLOG_BASE_PATH}/${slug}.${extension}`;

    if (!sha) {
      let duplicate = false;
      try {
        await getBlogPost(env, auth.token, slug);
        duplicate = true;
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 404)) throw error;
      }
      if (duplicate) {
        throw new HttpError(
          409,
          'post_exists',
          '同名文章已经存在，请重新加载后编辑，或更换文件名。',
        );
      }
    }

    const result = await writeRepositoryFile(
      env,
      auth.token,
      filePath,
      encodeBase64(body.content),
      `${sha ? '更新' : '创建'}文章：${slug}`,
      sha,
    );

    return json({
      success: true,
      sha: result.content?.sha ?? null,
      commit: {
        sha: result.commit.sha,
        url: result.commit.html_url,
      },
    });
  }

  if (request.method === 'DELETE') {
    const body = await readJson<DeletePostBody>(request, 20_000);
    const extension = normalizeExtension(body.extension);
    if (typeof body.sha !== 'string' || !/^[a-f0-9]{40}$/i.test(body.sha)) {
      return apiError(400, 'missing_sha', '删除文章需要当前文件版本，请刷新后重试。');
    }
    const filePath = `${env.BLOG_BASE_PATH}/${slug}.${extension}`;
    const result = await deleteRepositoryFile(
      env,
      auth.token,
      filePath,
      body.sha,
      `删除文章：${slug}`,
    );
    return json({
      success: true,
      commit: { sha: result.commit.sha, url: result.commit.html_url },
    });
  }

  return methodNotAllowed(['GET', 'PUT', 'DELETE']);
}
