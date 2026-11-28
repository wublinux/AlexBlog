import type { CmsEnv } from '../types';
import { authenticate } from '../lib/auth-middleware';
import {
  decodeBase64,
  encodeBase64,
  encodeGitHubPath,
  getRepositoryFile,
  githubRequest,
  writeRepositoryFile,
} from '../lib/github';
import { apiError, HttpError, json, methodNotAllowed, readJson } from '../lib/http';
import {
  isSupportedImage,
  safeImageName,
  validatePidanConfig,
} from '../lib/validation';

interface DirectoryEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  sha: string;
  size: number;
}

interface SavePetBody {
  config?: unknown;
  sha?: unknown;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CONFIG_BYTES = 200_000;

function petPaths(env: CmsEnv) {
  const base = env.IMAGE_BASE_PATH.replace(/\/+$/, '');
  const publicPrefix = base.replace(/^public\/?/, '').replace(/\/+$/, '');
  return {
    configRepoPath: `${base}/pet/pidan-config.json`,
    cardsRepoDir: `${base}/pet/cards`,
    cardsImagePrefix: `${publicPrefix}/pet/cards`,
  };
}

export async function handlePet(request: Request, env: CmsEnv): Promise<Response> {
  const authentication = await authenticate(request, env);
  if (!authentication.authenticated) return authentication.response;
  const { auth } = authentication;
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '');
  const paths = petPaths(env);

  if (pathname === '/admin/api/pet' && request.method === 'GET') {
    let config: unknown = null;
    let sha: string | null = null;

    try {
      const file = await getRepositoryFile(env, auth.token, paths.configRepoPath);
      sha = file.sha;
      config = JSON.parse(decodeBase64(file.content ?? ''));
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) {
        throw error;
      }
    }

    let availableImages: Array<{ name: string; image: string; url: string; size: number }> = [];
    try {
      const entries = await githubRequest<DirectoryEntry[]>(
        auth.token,
        `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${encodeGitHubPath(paths.cardsRepoDir)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
      );
      if (Array.isArray(entries)) {
        availableImages = entries
          .filter(
            (entry) =>
              entry.type === 'file' && /\.(?:webp|jpe?g|png|gif|avif)$/i.test(entry.name),
          )
          .map((entry) => ({
            name: entry.name,
            image: `${paths.cardsImagePrefix}/${entry.name}`,
            url: `/${paths.cardsImagePrefix}/${encodeURIComponent(entry.name)}`,
            size: entry.size,
          }))
          .sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'));
      }
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) {
        throw error;
      }
    }

    return json({ config, sha, availableImages });
  }

  if (pathname === '/admin/api/pet' && request.method === 'PUT') {
    const body = await readJson<SavePetBody>(request, MAX_CONFIG_BYTES);
    const validated = validatePidanConfig(body.config);
    const sha =
      typeof body.sha === 'string' && /^[a-f0-9]{40}$/i.test(body.sha) ? body.sha : undefined;

    if (!sha) {
      let exists = false;
      try {
        await getRepositoryFile(env, auth.token, paths.configRepoPath);
        exists = true;
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 404)) throw error;
      }
      if (exists) {
        return apiError(409, 'missing_sha', '皮蛋配置已存在，请刷新页面获取最新版本后再保存。');
      }
    }

    const serialized = `${JSON.stringify(validated, null, 2)}\n`;
    const result = await writeRepositoryFile(
      env,
      auth.token,
      paths.configRepoPath,
      encodeBase64(serialized),
      '更新皮蛋萌照卡片与互动台词配置',
      sha,
    );

    return json({
      success: true,
      config: validated,
      sha: result.content?.sha ?? null,
      commit: {
        sha: result.commit.sha,
        url: result.commit.html_url,
      },
    });
  }

  if (pathname === '/admin/api/pet/upload' && request.method === 'POST') {
    const declaredLength = Number(request.headers.get('Content-Length') ?? '0');
    if (declaredLength > MAX_IMAGE_BYTES + 128_000) {
      throw new HttpError(413, 'image_too_large', '图片不能超过 5 MB。');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new HttpError(400, 'missing_file', '请选择要上传的皮蛋照片。');
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      throw new HttpError(413, 'image_too_large', '图片必须小于 5 MB。');
    }

    const { stem, extension } = safeImageName(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isSupportedImage(bytes, extension)) {
      throw new HttpError(415, 'invalid_image', '图片内容与文件类型不匹配。');
    }

    const prefix = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const nonce = crypto.randomUUID().slice(0, 6);
    const cleanStem = stem.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'pidan';
    const fileName = `pidan-${prefix}-${nonce}-${cleanStem.slice(0, 32)}.${extension}`;
    const repoPath = `${paths.cardsRepoDir}/${fileName}`;

    const result = await writeRepositoryFile(
      env,
      auth.token,
      repoPath,
      encodeBase64(bytes),
      `上传皮蛋卡片照片：${fileName}`,
    );

    const image = `${paths.cardsImagePrefix}/${fileName}`;
    const publicUrl = `/${paths.cardsImagePrefix}/${encodeURIComponent(fileName)}`;

    return json({
      success: true,
      file: {
        name: fileName,
        image,
        url: publicUrl,
        sha: result.content?.sha ?? null,
      },
      commit: {
        sha: result.commit.sha,
        url: result.commit.html_url,
      },
    });
  }

  return methodNotAllowed(['GET', 'PUT', 'POST']);
}
