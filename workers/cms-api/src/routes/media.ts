import type { CmsEnv } from '../types';
import { authenticate } from '../lib/auth-middleware';
import {
  encodeBase64,
  encodeGitHubPath,
  githubRequest,
  writeRepositoryFile,
} from '../lib/github';
import { HttpError, json, methodNotAllowed } from '../lib/http';
import { isSupportedImage, safeImageName } from '../lib/validation';

interface MediaEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  sha: string;
  size: number;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function handleMedia(request: Request, env: CmsEnv): Promise<Response> {
  const authentication = await authenticate(request, env);
  if (!authentication.authenticated) return authentication.response;
  const { auth } = authentication;
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname.replace(/\/$/, '') === '/admin/api/media') {
    const entries = await githubRequest<MediaEntry[]>(
      auth.token,
      `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${encodeGitHubPath(env.IMAGE_BASE_PATH)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
    );
    const publicBase = `/${env.IMAGE_BASE_PATH.replace(/^public\/?/, '').replace(/\/$/, '')}`;
    const files = Array.isArray(entries)
      ? entries
          .filter(
            (entry) =>
              entry.type === 'file' && /\.(?:jpe?g|png|gif|webp|avif)$/i.test(entry.name),
          )
          .map((entry) => ({
            name: entry.name,
            path: entry.path,
            sha: entry.sha,
            size: entry.size,
            url: `${publicBase}/${encodeURIComponent(entry.name)}`,
          }))
          .sort((left, right) => right.name.localeCompare(left.name, 'zh-CN'))
      : [];
    return json({ files });
  }

  if (request.method === 'POST' && url.pathname.replace(/\/$/, '') === '/admin/api/media/upload') {
    const declaredLength = Number(request.headers.get('Content-Length') ?? '0');
    if (declaredLength > MAX_IMAGE_BYTES + 128_000) {
      throw new HttpError(413, 'image_too_large', '图片不能超过 5 MB。');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new HttpError(400, 'missing_file', '请选择要上传的图片。');
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
    const nonce = crypto.randomUUID().slice(0, 8);
    const fileName = `${prefix}-${nonce}-${stem}.${extension}`;
    const filePath = `${env.IMAGE_BASE_PATH}/${fileName}`;
    const result = await writeRepositoryFile(
      env,
      auth.token,
      filePath,
      encodeBase64(bytes),
      `上传图片：${fileName}`,
    );
    const publicBase = `/${env.IMAGE_BASE_PATH.replace(/^public\/?/, '').replace(/\/$/, '')}`;
    const publicUrl = `${publicBase}/${encodeURIComponent(fileName)}`;

    return json({
      success: true,
      file: {
        name: fileName,
        url: publicUrl,
        markdown: `![${stem}](${publicUrl})`,
        sha: result.content?.sha ?? null,
      },
      commit: { sha: result.commit.sha, url: result.commit.html_url },
    });
  }

  return methodNotAllowed(['GET', 'POST']);
}
