import type { CmsEnv } from '../types';
import { HttpError } from './http';

const GITHUB_API = 'https://api.github.com';
const GITHUB_API_VERSION = '2026-03-10';

interface GitHubFile {
  type: 'file';
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
}

interface GitHubDirectoryEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  sha: string;
  size: number;
}

interface GitHubCommitResult {
  content: { sha: string; path: string } | null;
  commit: { sha: string; html_url: string };
}

export interface BlogPostSummary {
  name: string;
  path: string;
  sha: string;
  slug: string;
  extension: 'md' | 'mdx';
  size: number;
}

export interface BlogPostFile {
  content: string;
  sha: string;
  path: string;
  extension: 'md' | 'mdx';
}

function repositoryPath(env: CmsEnv, suffix: string): string {
  return `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}${suffix}`;
}

export function encodeGitHubPath(pathname: string): string {
  return pathname.split('/').map(encodeURIComponent).join('/');
}

export async function githubRequest<T>(
  token: string,
  pathname: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('User-Agent', 'AlexBlog-CMS');
  headers.set('X-GitHub-Api-Version', GITHUB_API_VERSION);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${GITHUB_API}${pathname}`, { ...init, headers });
  if (!response.ok) {
    let detail = '';
    try {
      const payload = (await response.json()) as { message?: string };
      detail = payload.message ?? '';
    } catch {
      detail = response.statusText;
    }

    if (response.status === 404) {
      throw new HttpError(404, 'github_not_found', 'GitHub 中未找到对应内容。');
    }
    if (response.status === 409 || response.status === 422) {
      throw new HttpError(
        409,
        'github_conflict',
        '文件已在其他位置发生变化，请重新加载后再保存。',
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(
        403,
        'github_forbidden',
        'GitHub 授权已失效或权限不足，请重新登录。',
      );
    }
    throw new HttpError(
      502,
      'github_error',
      `GitHub 请求失败${detail ? `：${detail}` : ''}`,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function listBlogPosts(
  env: CmsEnv,
  token: string,
): Promise<BlogPostSummary[]> {
  const path = encodeGitHubPath(env.BLOG_BASE_PATH);
  const data = await githubRequest<GitHubDirectoryEntry[] | GitHubFile>(
    token,
    `${repositoryPath(env, `/contents/${path}`)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
  );

  if (!Array.isArray(data)) return [];

  return data
    .flatMap((file): BlogPostSummary[] => {
      const match = file.type === 'file' ? file.name.match(/^(.+)\.(md|mdx)$/i) : null;
      if (!match?.[1] || !match[2]) return [];
      return [
        {
          name: file.name,
          path: file.path,
          sha: file.sha,
          slug: match[1],
          extension: match[2].toLowerCase() as 'md' | 'mdx',
          size: file.size,
        },
      ];
    })
    .sort((left, right) => left.slug.localeCompare(right.slug, 'zh-CN'));
}

export async function getBlogPost(
  env: CmsEnv,
  token: string,
  slug: string,
): Promise<BlogPostFile> {
  for (const extension of ['md', 'mdx'] as const) {
    const filePath = `${env.BLOG_BASE_PATH}/${slug}.${extension}`;
    try {
      const file = await getRepositoryFile(env, token, filePath);
      return {
        content: decodeBase64(file.content ?? ''),
        sha: file.sha,
        path: file.path,
        extension,
      };
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) continue;
      throw error;
    }
  }
  throw new HttpError(404, 'post_not_found', '文章不存在。');
}

export async function getRepositoryFile(
  env: CmsEnv,
  token: string,
  filePath: string,
): Promise<GitHubFile> {
  const data = await githubRequest<GitHubFile | GitHubDirectoryEntry[]>(
    token,
    `${repositoryPath(env, `/contents/${encodeGitHubPath(filePath)}`)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
  );
  if (Array.isArray(data) || data.type !== 'file') {
    throw new HttpError(404, 'file_not_found', '文件不存在。');
  }
  return data;
}

export async function writeRepositoryFile(
  env: CmsEnv,
  token: string,
  filePath: string,
  contentBase64: string,
  message: string,
  sha?: string,
): Promise<GitHubCommitResult> {
  return githubRequest<GitHubCommitResult>(
    token,
    repositoryPath(env, `/contents/${encodeGitHubPath(filePath)}`),
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: contentBase64,
        branch: env.GITHUB_BRANCH,
        ...(sha ? { sha } : {}),
      }),
    },
  );
}

export async function deleteRepositoryFile(
  env: CmsEnv,
  token: string,
  filePath: string,
  sha: string,
  message: string,
): Promise<GitHubCommitResult> {
  return githubRequest<GitHubCommitResult>(
    token,
    repositoryPath(env, `/contents/${encodeGitHubPath(filePath)}`),
    {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch: env.GITHUB_BRANCH }),
    },
  );
}

export function encodeBase64(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

export function decodeBase64(value: string): string {
  const normalized = value.replace(/\s/g, '');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
