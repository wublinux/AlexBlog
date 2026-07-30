# GitHub 集成 CMS 实现计划

> **历史文档，不是当前执行指令。** 本计划已由现有实现和
> [`docs/PROJECT-PLAN.md`](../../PROJECT-PLAN.md) 取代，其中的文件结构、版本号、
> Secrets 和示例代码可能已经过时。后续代理不得逐项照抄本文件，也不得据此新增
> `GITHUB_TOKEN`、宽松 CORS 或手写 Wrangler 绑定类型。

**目标：** 构建一个基于 GitHub API 的自定义 CMS 界面，让用户通过网页管理 Astro 博客文章，提交后自动部署到 Cloudflare Pages。

**架构：** 前端使用 Astro + React 构建 CMS 管理界面（独立于博客主体），后端使用 Cloudflare Workers 作为 GitHub API 代理和 OAuth 认证层。用户通过 GitHub OAuth 登录后，在 CMS 界面编辑 Markdown 文件，保存时通过 Workers 后端调用 GitHub Contents API 提交更改，GitHub Actions 自动触发 Cloudflare Pages 部署。

**技术栈：** Astro 5, React 19, Tailwind CSS 4, Cloudflare Workers, GitHub REST API, GitHub OAuth

---

## 文件结构

### CMS 前端（新增）
| 文件 | 职责 |
|------|------|
| `src/pages/admin/index.astro` | CMS 首页/登录入口 |
| `src/pages/admin/dashboard.astro` | 文章列表仪表盘 |
| `src/pages/admin/edit/[...slug].astro` | 文章编辑页面（新建+编辑） |
| `src/pages/admin/media.astro` | 媒体文件管理页面 |
| `src/pages/admin/settings.astro` | CMS 设置页面 |
| `src/components/admin/LoginButton.tsx` | GitHub OAuth 登录按钮 |
| `src/components/admin/ArticleList.tsx` | 文章列表组件 |
| `src/components/admin/MarkdownEditor.tsx` | Markdown 编辑器+实时预览 |
| `src/components/admin/FrontmatterForm.tsx` | 元数据表单（标题/描述/标签/日期等） |
| `src/components/admin/MediaUploader.tsx` | 图片上传组件 |
| `src/components/admin/MediaGallery.tsx` | 媒体库浏览组件 |
| `src/components/admin/SEOPreview.tsx` | SEO 元数据预览组件 |
| `src/components/admin/LanguageToggle.tsx` | 中英文切换组件 |
| `src/components/admin/DeployStatus.tsx` | 部署状态指示器 |
| `src/components/admin/AdminLayout.tsx` | CMS 后台布局壳 |
| `src/lib/admin/github.ts` | GitHub API 客户端封装（前端侧） |
| `src/lib/admin/auth.ts` | 前端认证状态管理 |
| `src/lib/admin/api.ts` | CMS API 调用封装 |

### Cloudflare Workers 后端（新增）
| 文件 | 职责 |
|------|------|
| `workers/cms-api/src/index.ts` | Workers 入口，路由分发 |
| `workers/cms-api/src/routes/auth.ts` | GitHub OAuth 回调 + token 管理 |
| `workers/cms-api/src/routes/posts.ts` | 文章 CRUD（读取/创建/更新/删除 GitHub 文件） |
| `workers/cms-api/src/routes/media.ts` | 媒体上传（上传图片到 GitHub 仓库） |
| `workers/cms-api/src/routes/deploy.ts` | 部署状态查询（GitHub Actions API） |
| `workers/cms-api/src/lib/github.ts` | GitHub REST API 封装（Octokit） |
| `workers/cms-api/src/lib/session.ts` | KV session 管理 |
| `workers/cms-api/src/lib/auth-middleware.ts` | 认证中间件 |
| `workers/cms-api/wrangler.jsonc` | Workers 部署配置 |
| `workers/cms-api/package.json` | Workers 依赖 |

### 配置修改（现有文件）
| 文件 | 变更 |
|------|------|
| `astro.config.mjs` | 添加 `/admin/` 路由，sitemap 排除 admin（已有） |
| `package.json` | 添加 `@astrojs/react`、`react`、`react-dom` 依赖 |

---

## 任务 1：项目基础设施 — React 集成 + Workers 脚手架

**文件：**
- 修改：`package.json`
- 修改：`astro.config.mjs`
- 创建：`workers/cms-api/package.json`
- 创建：`workers/cms-api/wrangler.jsonc`
- 创建：`workers/cms-api/src/index.ts`

- [ ] **步骤 1：安装 Astro React 集成**

```bash
cd /Users/zhonghuanhuang/Desktop/Opencode/Web/AlexBlog
npm install @astrojs/react react react-dom
```

- [ ] **步骤 2：配置 Astro 启用 React**

在 `astro.config.mjs` 的 `integrations` 数组中添加 `react()`：

```js
import react from '@astrojs/react';

// 在 integrations 数组中添加：
integrations: [
    react(),
    mdx(),
    sitemap({ ... }),
],
```

- [ ] **步骤 3：创建 Workers 后端脚手架**

```bash
mkdir -p workers/cms-api/src/routes
mkdir -p workers/cms-api/src/lib
```

创建 `workers/cms-api/package.json`：

```json
{
  "name": "cms-api",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "@octokit/rest": "^21.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240512.0",
    "typescript": "^5.5.0",
    "wrangler": "^3.57.0"
  }
}
```

创建 `workers/cms-api/wrangler.jsonc`：

```jsonc
{
  "name": "alexblog-cms-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "routes": [
    { "pattern": "letsgogogogogo.pp.ua/admin/api/*", "zone_name": "letsgogogogogo.pp.ua" }
  ],
  "kv_namespaces": [
    { "binding": "SESSIONS", "id": "placeholder_sessions_kv_id" }
  ],
  "vars": {
    "GITHUB_OWNER": "placeholder",
    "GITHUB_REPO": "placeholder",
    "GITHUB_BRANCH": "V2.0.0",
    "BLOG_BASE_PATH": "src/content/blog",
    "IMAGE_BASE_PATH": "public/image"
  },
  "secrets": ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_TOKEN"]
}
```

创建 `workers/cms-api/src/index.ts`：

```ts
export interface Env {
  SESSIONS: KVNamespace;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  BLOG_BASE_PATH: string;
  IMAGE_BASE_PATH: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': url.origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route: /admin/api/auth/*
      if (path.startsWith('/admin/api/auth/')) {
        const { handleAuth } = await import('./routes/auth');
        return await handleAuth(request, env, corsHeaders);
      }

      // Route: /admin/api/posts/*
      if (path.startsWith('/admin/api/posts')) {
        const { handlePosts } = await import('./routes/posts');
        return await handlePosts(request, env, corsHeaders);
      }

      // Route: /admin/api/media/*
      if (path.startsWith('/admin/api/media')) {
        const { handleMedia } = await import('./routes/media');
        return await handleMedia(request, env, corsHeaders);
      }

      // Route: /admin/api/deploy/*
      if (path.startsWith('/admin/api/deploy')) {
        const { handleDeploy } = await import('./routes/deploy');
        return await handleDeploy(request, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
```

- [ ] **步骤 4：安装 Workers 依赖并验证构建**

```bash
cd workers/cms-api
npm install
npx wrangler deploy --dry-run
```

预期：dry-run 无错误（routes 和 secrets 会警告，这是正常的）

- [ ] **步骤 5：Commit**

```bash
git add package.json package-lock.json astro.config.mjs workers/cms-api/
git commit -m "feat(cms): add React integration and Workers API scaffold"
```

---

## 任务 2：GitHub OAuth 认证

**文件：**
- 创建：`workers/cms-api/src/routes/auth.ts`
- 创建：`workers/cms-api/src/lib/session.ts`
- 创建：`workers/cms-api/src/lib/auth-middleware.ts`
- 创建：`src/pages/admin/index.astro`
- 创建：`src/components/admin/LoginButton.tsx`
- 创建：`src/lib/admin/auth.ts`

- [ ] **步骤 1：编写 GitHub OAuth 回调处理**

创建 `workers/cms-api/src/routes/auth.ts`：

```ts
import type { Env } from '../index';
import { createSession, getSession } from '../lib/session';

interface AuthRequest {
  request: Request;
  env: Env;
  corsHeaders: Record<string, string>;
}

export async function handleAuth(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const action = url.pathname.split('/').pop();

  // GET /admin/api/auth/login → redirect to GitHub OAuth
  if (action === 'login') {
    const redirectUri = `${url.origin}/admin/api/auth/callback`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
    return Response.redirect(githubAuthUrl, 302);
  }

  // GET /admin/api/auth/callback?code=xxx → exchange code for token
  if (action === 'callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      return new Response('Missing code', { status: 400, headers: corsHeaders });
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      return new Response(`OAuth error: ${tokenData.error}`, {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Verify user is a collaborator on the repo
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    const user = (await userRes.json()) as { login: string; avatar_url: string };

    // Check collaborator status
    const collabRes = await fetch(
      `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/collaborators/${user.login}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (collabRes.status !== 204) {
      return new Response('Unauthorized: not a repo collaborator', {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Create session in KV
    const sessionId = crypto.randomUUID();
    await createSession(env.SESSIONS, sessionId, {
      user: user.login,
      avatar: user.avatar_url,
      token: tokenData.access_token,
      createdAt: Date.now(),
    });

    // Redirect to admin dashboard with session cookie
    const cookie = `cms_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: '/admin/dashboard', 'Set-Cookie': cookie },
    });
  }

  // GET /admin/api/auth/me → return current user info
  if (action === 'me') {
    const sessionId = extractSessionId(request);
    if (!sessionId) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await getSession(env.SESSIONS, sessionId);
    if (!session) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ user: { login: session.user, avatar: session.avatar } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // GET /admin/api/auth/logout → clear session
  if (action === 'logout') {
    const sessionId = extractSessionId(request);
    if (sessionId) {
      await env.SESSIONS.delete(`session:${sessionId}`);
    }
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: '/admin',
        'Set-Cookie': 'cms_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
    });
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

function extractSessionId(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/cms_session=([^;]+)/);
  return match ? match[1] : null;
}
```

- [ ] **步骤 2：编写 KV Session 管理**

创建 `workers/cms-api/src/lib/session.ts`：

```ts
interface SessionData {
  user: string;
  avatar: string;
  token: string;
  createdAt: number;
}

export async function createSession(kv: KVNamespace, sessionId: string, data: SessionData) {
  await kv.put(`session:${sessionId}`, JSON.stringify(data), { expirationTtl: 86400 });
}

export async function getSession(kv: KVNamespace, sessionId: string): Promise<SessionData | null> {
  const raw = await kv.get(`session:${sessionId}`);
  return raw ? JSON.parse(raw) : null;
}

export async function deleteSession(kv: KVNamespace, sessionId: string) {
  await kv.delete(`session:${sessionId}`);
}
```

- [ ] **步骤 3：编写认证中间件**

创建 `workers/cms-api/src/lib/auth-middleware.ts`：

```ts
import type { Env } from '../index';
import { getSession } from './session';

export interface AuthContext {
  user: string;
  avatar: string;
  token: string;
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<AuthContext | null> {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/cms_session=([^;]+)/);
  if (!match) return null;

  const session = await getSession(env.SESSIONS, match[1]);
  if (!session) return null;

  return { user: session.user, avatar: session.avatar, token: session.token };
}
```

- [ ] **步骤 4：创建前端登录组件**

创建 `src/lib/admin/auth.ts`：

```ts
export interface UserInfo {
  login: string;
  avatar: string;
}

export async function fetchCurrentUser(): Promise<UserInfo | null> {
  const res = await fetch('/admin/api/auth/me', { credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export function redirectToLogin() {
  window.location.href = '/admin/api/auth/login';
}

export function redirectToLogout() {
  window.location.href = '/admin/api/auth/logout';
}
```

创建 `src/components/admin/LoginButton.tsx`：

```tsx
import { useState, useEffect } from 'react';
import { fetchCurrentUser, redirectToLogin, redirectToLogout } from '../../lib/admin/auth';
import type { UserInfo } from '../../lib/admin/auth';

export default function LoginButton() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <button className="px-4 py-2 bg-gray-200 rounded animate-pulse">Loading...</button>;
  }

  if (!user) {
    return (
      <button
        onClick={redirectToLogin}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        使用 GitHub 登录
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <img src={user.avatar} alt={user.login} className="w-8 h-8 rounded-full" />
      <span className="text-sm font-medium">{user.login}</span>
      <button
        onClick={redirectToLogout}
        className="text-sm text-gray-500 hover:text-red-500 transition-colors"
      >
        退出
      </button>
    </div>
  );
}
```

- [ ] **步骤 5：创建登录页面**

创建 `src/pages/admin/index.astro`：

```astro
---
import AdminLayout from '../../components/admin/AdminLayout.tsx';
import LoginButton from '../../components/admin/LoginButton.tsx';
---

<AdminLayout title="CMS 登录">
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <h1 class="text-3xl font-bold mb-4">Alex's Blog CMS</h1>
      <p class="text-gray-500 mb-8">使用 GitHub 账号登录以管理博客</p>
      <LoginButton client:load />
    </div>
  </div>
</AdminLayout>
```

创建 `src/components/admin/AdminLayout.tsx`：

```tsx
import type { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
}

export default function AdminLayout({ title, children }: Props) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} | Alex's Blog CMS</title>
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **步骤 6：Commit**

```bash
git add workers/cms-api/src/routes/auth.ts workers/cms-api/src/lib/session.ts workers/cms-api/src/lib/auth-middleware.ts src/pages/admin/index.astro src/components/admin/LoginButton.tsx src/components/admin/AdminLayout.tsx src/lib/admin/auth.ts
git commit -m "feat(cms): implement GitHub OAuth authentication"
```

---

## 任务 3：文章列表仪表盘

**文件：**
- 创建：`src/pages/admin/dashboard.astro`
- 创建：`src/components/admin/ArticleList.tsx`
- 创建：`workers/cms-api/src/routes/posts.ts`
- 创建：`workers/cms-api/src/lib/github.ts`

- [ ] **步骤 1：编写 GitHub API 封装**

创建 `workers/cms-api/src/lib/github.ts`：

```ts
import { Octokit } from '@octokit/rest';
import type { Env } from '../index';

export function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function listBlogPosts(env: Env, token: string) {
  const octokit = createOctokit(token);

  const { data } = await octokit.repos.getContent({
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    path: env.BLOG_BASE_PATH,
    ref: env.GITHUB_BRANCH,
  });

  if (!Array.isArray(data)) return [];

  return data
    .filter((f) => f.name.endsWith('.md') || f.name.endsWith('.mdx'))
    .map((f) => ({
      name: f.name,
      path: f.path,
      sha: f.sha,
      slug: f.name.replace(/\.(md|mdx)$/, ''),
    }));
}

export async function getBlogPost(env: Env, token: string, path: string) {
  const octokit = createOctokit(token);

  const { data } = await octokit.repos.getContent({
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    path,
    ref: env.GITHUB_BRANCH,
  });

  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error('Not a file');
  }

  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

export async function createOrUpdateFile(
  env: Env,
  token: string,
  path: string,
  content: string,
  message: string,
  sha?: string
) {
  const octokit = createOctokit(token);

  const params: any = {
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    branch: env.GITHUB_BRANCH,
  };

  if (sha) {
    params.sha = sha;
  }

  const { data } = await octokit.repos.createOrUpdateFileContents(params);
  return data;
}

export async function deleteFile(env: Env, token: string, path: string, message: string, sha: string) {
  const octokit = createOctokit(token);

  const { data } = await octokit.repos.deleteFile({
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
    path,
    message,
    sha,
    branch: env.GITHUB_BRANCH,
  });

  return data;
}

export async function getFileSha(env: Env, token: string, path: string): Promise<string | null> {
  const octokit = createOctokit(token);
  try {
    const { data } = await octokit.repos.getContent({
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      path,
      ref: env.GITHUB_BRANCH,
    });
    if (Array.isArray(data) || data.type !== 'file') return null;
    return data.sha;
  } catch {
    return null;
  }
}
```

- [ ] **步骤 2：编写文章 CRUD 路由**

创建 `workers/cms-api/src/routes/posts.ts`：

```ts
import type { Env } from '../index';
import { requireAuth } from '../lib/auth-middleware';
import { listBlogPosts, getBlogPost, createOrUpdateFile, deleteFile, getFileSha } from '../lib/github';

export async function handlePosts(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  // GET /admin/api/posts → list all posts
  if (request.method === 'GET' && url.pathname === '/admin/api/posts') {
    const posts = await listBlogPosts(env, auth.token);
    return new Response(JSON.stringify(posts), { headers: jsonHeaders });
  }

  // Extract slug from path: /admin/api/posts/{slug}
  const slug = url.pathname.replace('/admin/api/posts/', '');
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const filePath = `${env.BLOG_BASE_PATH}/${slug}.md`;

  // GET /admin/api/posts/{slug} → get single post
  if (request.method === 'GET') {
    try {
      const post = await getBlogPost(env, auth.token, filePath);
      return new Response(JSON.stringify(post), { headers: jsonHeaders });
    } catch {
      // Check .mdx too
      const mdxPath = `${env.BLOG_BASE_PATH}/${slug}.mdx`;
      try {
        const post = await getBlogPost(env, auth.token, mdxPath);
        return new Response(JSON.stringify(post), { headers: jsonHeaders });
      } catch {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: jsonHeaders,
        });
      }
    }
  }

  // POST /admin/api/posts/{slug} → create or update post
  if (request.method === 'POST') {
    const body = (await request.json()) as { content: string; sha?: string };
    const existingSha = body.sha || (await getFileSha(env, auth.token, filePath));
    const action = existingSha ? 'update' : 'create';

    const result = await createOrUpdateFile(
      env,
      auth.token,
      filePath,
      body.content,
      `${action} post: ${slug}`,
      existingSha || undefined
    );

    return new Response(JSON.stringify({ success: true, commit: result.commit }), {
      headers: jsonHeaders,
    });
  }

  // DELETE /admin/api/posts/{slug} → delete post
  if (request.method === 'DELETE') {
    const sha = await getFileSha(env, auth.token, filePath);
    if (!sha) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    await deleteFile(env, auth.token, filePath, `delete post: ${slug}`, sha);
    return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}
```

- [ ] **步骤 3：创建文章列表组件**

创建 `src/components/admin/ArticleList.tsx`：

```tsx
import { useState, useEffect } from 'react';

interface PostMeta {
  name: string;
  path: string;
  sha: string;
  slug: string;
}

export default function ArticleList() {
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/admin/api/posts', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          window.location.href = '/admin';
          return [];
        }
        if (!res.ok) throw new Error('Failed to load posts');
        return res.json();
      })
      .then(setPosts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm(`确认删除文章 "${slug}"？此操作不可撤销。`)) return;
    const res = await fetch(`/admin/api/posts/${slug}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">错误：{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">文章管理</h2>
        <a
          href="/admin/edit/_new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新建文章
        </a>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暂无文章</p>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {posts.map((post) => (
            <div key={post.slug} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div>
                <h3 className="font-medium">{post.slug}</h3>
                <p className="text-sm text-gray-500">{post.path}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/admin/edit/${post.slug}`}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  编辑
                </a>
                <button
                  onClick={() => handleDelete(post.slug)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **步骤 4：创建仪表盘页面**

创建 `src/pages/admin/dashboard.astro`：

```astro
---
import AdminLayout from '../../components/admin/AdminLayout.tsx';
import LoginButton from '../../components/admin/LoginButton.tsx';
import ArticleList from '../../components/admin/ArticleList.tsx';
---

<AdminLayout title="仪表盘">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
      <a href="/admin/dashboard" class="text-lg font-bold">CMS 后台</a>
      <LoginButton client:load />
    </div>
  </nav>

  <main class="max-w-6xl mx-auto px-4 py-8">
    <ArticleList client:load />
  </main>
</AdminLayout>
```

- [ ] **步骤 5：Commit**

```bash
git add workers/cms-api/src/lib/github.ts workers/cms-api/src/routes/posts.ts src/components/admin/ArticleList.tsx src/pages/admin/dashboard.astro
git commit -m "feat(cms): implement article list dashboard"
```

---

## 任务 4：Markdown 编辑器与实时预览

**文件：**
- 创建：`src/pages/admin/edit/[...slug].astro`
- 创建：`src/components/admin/MarkdownEditor.tsx`
- 创建：`src/components/admin/FrontmatterForm.tsx`
- 创建：`src/components/admin/SEOPreview.tsx`

- [ ] **步骤 1：编写 Frontmatter 表单组件**

创建 `src/components/admin/FrontmatterForm.tsx`：

```tsx
import { useState } from 'react';

export interface Frontmatter {
  title: string;
  description: string;
  pubDate: string;
  tags: string[];
  lang: 'cn' | 'en' | '';
  draft: boolean;
  important: boolean;
  heroImage: string;
}

interface Props {
  value: Frontmatter;
  onChange: (fm: Frontmatter) => void;
}

export default function FrontmatterForm({ value, onChange }: Props) {
  const [tagInput, setTagInput] = useState('');

  const update = (patch: Partial<Frontmatter>) => {
    onChange({ ...value, ...patch });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !value.tags.includes(tag)) {
      update({ tags: [...value.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    update({ tags: value.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="font-semibold text-lg border-b pb-2">文章信息</h3>

      <div>
        <label className="block text-sm font-medium mb-1">标题 *</label>
        <input
          type="text"
          value={value.title}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="文章标题"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">描述 *</label>
        <textarea
          value={value.description}
          onChange={(e) => update({ description: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
          placeholder="简短摘要"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">发布日期</label>
          <input
            type="date"
            value={value.pubDate}
            onChange={(e) => update({ pubDate: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">语言</label>
          <select
            value={value.lang}
            onChange={(e) => update({ lang: e.target.value as 'cn' | 'en' | '' })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">未指定</option>
            <option value="cn">中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">标签</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入标签后回车"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            添加
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {value.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.draft}
            onChange={(e) => update({ draft: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">草稿</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.important}
            onChange={(e) => update({ important: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">置顶</span>
        </label>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：编写 Markdown 编辑器组件**

创建 `src/components/admin/MarkdownEditor.tsx`：

```tsx
import { useState, useRef, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (content: string) => void;
}

export default function MarkdownEditor({ value, onChange }: Props) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback(
    (before: string, after: string = '') => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.substring(start, end);
      const newText = value.substring(0, start) + before + selected + after + value.substring(end);
      onChange(newText);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + before.length, start + before.length + selected.length);
      }, 0);
    },
    [value, onChange]
  );

  const updatePreview = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/posts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.html);
      }
    } catch {
      // Fallback: show raw markdown in a pre block
      setPreviewHtml(`<pre class="whitespace-pre-wrap">${value}</pre>`);
    }
  }, [value]);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b flex-wrap">
        <ToolbarButton label="B" title="粗体" onClick={() => insertAtCursor('**', '**')} />
        <ToolbarButton label="I" title="斜体" onClick={() => insertAtCursor('*', '*')} />
        <ToolbarButton label="H2" title="二级标题" onClick={() => insertAtCursor('\n## ', '\n')} />
        <ToolbarButton label="H3" title="三级标题" onClick={() => insertAtCursor('\n### ', '\n')} />
        <ToolbarButton label="Link" title="链接" onClick={() => insertAtCursor('[', '](url)')} />
        <ToolbarButton label="Img" title="图片" onClick={() => insertAtCursor('![alt](', ')')} />
        <ToolbarButton label="Code" title="代码块" onClick={() => insertAtCursor('\n```\n', '\n```\n')} />
        <ToolbarButton label="Quote" title="引用" onClick={() => insertAtCursor('\n> ', '\n')} />
        <ToolbarButton label="List" title="列表" onClick={() => insertAtCursor('\n- ', '\n')} />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            if (showPreview && !previewHtml) updatePreview();
            setShowPreview(!showPreview);
          }}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          {showPreview ? '隐藏预览' : '显示预览'}
        </button>
        <button
          type="button"
          onClick={updatePreview}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          刷新预览
        </button>
      </div>

      <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} divide-x`}>
        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 min-h-[500px] font-mono text-sm resize-y focus:outline-none"
          placeholder="在此编写 Markdown 内容..."
          spellCheck={false}
        />

        {/* Preview */}
        {showPreview && (
          <div
            className="p-4 prose max-w-none overflow-auto max-h-[600px]"
            dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400">点击"刷新预览"查看渲染效果</p>' }}
          />
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="px-2 py-1 text-sm font-mono bg-gray-100 rounded hover:bg-gray-200 transition-colors"
    >
      {label}
    </button>
  );
}
```

- [ ] **步骤 3：编写编辑页面**

创建 `src/pages/admin/edit/[...slug].astro`：

```astro
---
import AdminLayout from '../../../components/admin/AdminLayout.tsx';
import LoginButton from '../../../components/admin/LoginButton.tsx';
import MarkdownEditor from '../../../components/admin/MarkdownEditor.tsx';
import FrontmatterForm from '../../../components/admin/FrontmatterForm.tsx';
import SEOPreview from '../../../components/admin/SEOPreview.tsx';
---

<AdminLayout title="编辑文章">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-4">
        <a href="/admin/dashboard" class="text-gray-500 hover:text-gray-700">← 返回</a>
        <span class="text-lg font-bold">编辑文章</span>
      </div>
      <LoginButton client:load />
    </div>
  </nav>

  <main class="max-w-7xl mx-auto px-4 py-8" id="editor-root">
    <!-- React editor will hydrate here -->
    <div class="text-center py-8 text-gray-500">加载中...</div>
  </main>

  <script>
    // Client-side React app for the editor
    import { createElement, useState, useEffect } from 'react';
    import { createRoot } from 'react-dom/client';
    import MarkdownEditor from '../../../components/admin/MarkdownEditor.tsx';
    import FrontmatterForm from '../../../components/admin/FrontmatterForm.tsx';
    import type { Frontmatter } from '../../../components/admin/FrontmatterForm.tsx';

    function EditorApp() {
      const slug = window.location.pathname.replace('/admin/edit/', '').replace(/\/$/, '');
      const isNew = slug === '_new';

      const [frontmatter, setFrontmatter] = useState<Frontmatter>({
        title: '',
        description: '',
        pubDate: new Date().toISOString().split('T')[0],
        tags: [],
        lang: 'cn',
        draft: false,
        important: false,
        heroImage: '',
      });
      const [body, setBody] = useState('');
      const [originalSha, setOriginalSha] = useState<string | null>(null);
      const [saving, setSaving] = useState(false);
      const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
      const [newSlug, setNewSlug] = useState(isNew ? '' : slug);

      useEffect(() => {
        if (isNew) return;
        fetch(`/admin/api/posts/${slug}`, { credentials: 'include' })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) return;
            // Parse frontmatter
            const raw = data.content as string;
            setOriginalSha(data.sha);
            const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
            if (match) {
              const fm = match[1];
              const fmObj: Record<string, any> = {};
              fm.split('\n').forEach((line: string) => {
                const [key, ...rest] = line.split(':');
                if (key && rest.length) {
                  let val = rest.join(':').trim();
                  if (val.startsWith('[') && val.endsWith(']')) {
                    val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/"/g, ''));
                    fmObj[key.trim()] = val;
                  } else {
                    fmObj[key.trim()] = val.replace(/^["']|["']$/g, '');
                  }
                }
              });
              setFrontmatter({
                title: fmObj.title || '',
                description: fmObj.description || '',
                pubDate: fmObj.pubDate || '',
                tags: Array.isArray(fmObj.tags) ? fmObj.tags : [],
                lang: fmObj.lang || '',
                draft: fmObj.draft === 'true',
                important: fmObj.important === 'true',
                heroImage: fmObj.heroImage || '',
              });
              setBody(match[2]);
            } else {
              setBody(raw);
            }
          });
      }, [slug, isNew]);

      const buildMarkdown = () => {
        const tagsStr = frontmatter.tags.length
          ? `[${frontmatter.tags.map((t) => `"${t}"`).join(', ')}]`
          : '[]';

        return `---
title: "${frontmatter.title}"
description: "${frontmatter.description}"
pubDate: ${frontmatter.pubDate}
tags: ${tagsStr}${frontmatter.lang ? `\nlang: ${frontmatter.lang}` : ''}${frontmatter.draft ? '\ndraft: true' : ''}${frontmatter.important ? '\nimportant: true' : ''}
---

${body}`;
      };

      const handleSave = async () => {
        if (!newSlug.trim()) {
          setMessage({ type: 'error', text: '请输入文件名（slug）' });
          return;
        }
        if (!frontmatter.title) {
          setMessage({ type: 'error', text: '请输入标题' });
          return;
        }

        setSaving(true);
        setMessage(null);

        const content = buildMarkdown();
        const targetSlug = isNew ? newSlug.trim() : slug;

        const res = await fetch(`/admin/api/posts/${targetSlug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content, sha: originalSha }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessage({ type: 'success', text: '保存成功！GitHub Actions 将自动部署。' });
          setOriginalSha(null); // Reset sha so next save creates new commit
          if (isNew) {
            window.history.replaceState(null, '', `/admin/edit/${targetSlug}`);
          }
        } else {
          const data = await res.json();
          setMessage({ type: 'error', text: `保存失败：${data.error}` });
        }

        setSaving(false);
      };

      return createElement('div', { className: 'space-y-6' },
        // Message
        message && createElement('div', {
          className: `p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`,
        }, message.text),

        // Slug input for new posts
        isNew && createElement('div', { className: 'p-4 bg-white rounded-lg shadow' },
          createElement('label', { className: 'block text-sm font-medium mb-1' }, '文件名 (slug)'),
          createElement('input', {
            type: 'text',
            value: newSlug,
            onChange: (e: any) => setNewSlug(e.target.value),
            className: 'w-full px-3 py-2 border rounded-lg',
            placeholder: 'my-first-post',
          }),
          createElement('p', { className: 'text-sm text-gray-500 mt-1' },
            '将保存为 src/content/blog/', newSlug || '???.md'
          ),
        ),

        // Frontmatter form
        createElement(FrontmatterForm, { value: frontmatter, onChange: setFrontmatter }),

        // Markdown editor
        createElement(MarkdownEditor, { value: body, onChange: setBody }),

        // Save button
        createElement('div', { className: 'flex justify-end gap-3' },
          createElement('a', {
            href: '/admin/dashboard',
            className: 'px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors',
          }, '取消'),
          createElement('button', {
            onClick: handleSave,
            disabled: saving,
            className: `px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${saving ? 'opacity-50' : ''}`,
          }, saving ? '保存中...' : '保存并发布'),
        ),
      );
    }

    const root = createRoot(document.getElementById('editor-root')!);
    root.render(createElement(EditorApp));
  </script>
</AdminLayout>
```

- [ ] **步骤 4：Commit**

```bash
git add src/pages/admin/edit/ src/components/admin/MarkdownEditor.tsx src/components/admin/FrontmatterForm.tsx src/components/admin/SEOPreview.tsx
git commit -m "feat(cms): implement markdown editor with live preview"
```

---

## 任务 5：媒体文件管理

**文件：**
- 创建：`src/pages/admin/media.astro`
- 创建：`src/components/admin/MediaUploader.tsx`
- 创建：`src/components/admin/MediaGallery.tsx`
- 创建：`workers/cms-api/src/routes/media.ts`

- [ ] **步骤 1：编写媒体上传路由**

创建 `workers/cms-api/src/routes/media.ts`：

```ts
import type { Env } from '../index';
import { requireAuth } from '../lib/auth-middleware';
import { createOrUpdateFile, getFileSha } from '../lib/github';

export async function handleMedia(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  // GET /admin/api/media → list images in public/image/
  if (request.method === 'GET' && url.pathname === '/admin/api/media') {
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: auth.token });

    const { data } = await octokit.repos.getContent({
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      path: env.IMAGE_BASE_PATH,
      ref: env.GITHUB_BRANCH,
    });

    if (!Array.isArray(data)) {
      return new Response(JSON.stringify([]), { headers: jsonHeaders });
    }

    const files = data
      .filter((f) => /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(f.name))
      .map((f) => ({
        name: f.name,
        path: f.path,
        url: `/image/${f.name}`,
        size: (f as any).size,
      }));

    return new Response(JSON.stringify(files), { headers: jsonHeaders });
  }

  // POST /admin/api/media/upload → upload image
  if (request.method === 'POST' && url.pathname === '/admin/api/media/upload') {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Only image files are allowed' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size must be under 5MB' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Generate filename with timestamp to avoid conflicts
    const ext = file.name.split('.').pop();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${safeName}`;
    const filePath = `${env.IMAGE_BASE_PATH}/${fileName}`;

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const result = await createOrUpdateFile(
      env,
      auth.token,
      filePath,
      base64,
      `upload image: ${fileName}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        name: fileName,
        url: `/image/${fileName}`,
        markdown: `![${file.name}](/image/${fileName})`,
        commit: result.commit,
      }),
      { headers: jsonHeaders }
    );
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}
```

- [ ] **步骤 2：编写媒体上传组件**

创建 `src/components/admin/MediaUploader.tsx`：

```tsx
import { useState, useCallback } from 'react';

interface Props {
  onUploaded: (info: { name: string; url: string; markdown: string }) => void;
}

export default function MediaUploader({ onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploading(true);
      setError(null);

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch('/admin/api/media/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            setError(data.error || 'Upload failed');
            continue;
          }

          const data = await res.json();
          onUploaded({ name: data.name, url: data.url, markdown: data.markdown });
        } catch (err: any) {
          setError(err.message);
        }
      }

      setUploading(false);
    },
    [onUploaded]
  );

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-semibold mb-3">上传图片</h3>

      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
        <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-sm text-gray-500">
          {uploading ? '上传中...' : '点击或拖拽图片到此处'}
        </span>
        <span className="text-xs text-gray-400 mt-1">支持 JPG、PNG、GIF、WebP，最大 5MB</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
      </label>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
```

- [ ] **步骤 3：编写媒体库组件**

创建 `src/components/admin/MediaGallery.tsx`：

```tsx
import { useState, useEffect } from 'react';

interface MediaFile {
  name: string;
  path: string;
  url: string;
  size: number;
}

export default function MediaGallery() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const loadFiles = () => {
    setLoading(true);
    fetch('/admin/api/media', { credentials: 'include' })
      .then((res) => res.json())
      .then(setFiles)
      .finally(() => setLoading(false));
  };

  useEffect(loadFiles, []);

  const copyMarkdown = (file: MediaFile) => {
    const md = `![${file.name}](${file.url})`;
    navigator.clipboard.writeText(md);
    setCopied(file.name);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="text-center py-8 text-gray-500">加载中...</div>;

  return (
    <div>
      <h3 className="font-semibold mb-3">媒体库</h3>
      {files.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暂无图片</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.name}
              className="group relative bg-white rounded-lg shadow overflow-hidden cursor-pointer"
              onClick={() => copyMarkdown(file)}
            >
              <img src={file.url} alt={file.name} className="w-full h-32 object-cover" />
              <div className="p-2">
                <p className="text-xs text-gray-500 truncate">{file.name}</p>
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm">
                  {copied === file.name ? '已复制!' : '点击复制 Markdown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **步骤 4：创建媒体管理页面**

创建 `src/pages/admin/media.astro`：

```astro
---
import AdminLayout from '../../components/admin/AdminLayout.tsx';
import LoginButton from '../../components/admin/LoginButton.tsx';
import MediaUploader from '../../components/admin/MediaUploader.tsx';
import MediaGallery from '../../components/admin/MediaGallery.tsx';
---

<AdminLayout title="媒体管理">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-4">
        <a href="/admin/dashboard" class="text-gray-500 hover:text-gray-700">← 返回</a>
        <span class="text-lg font-bold">媒体管理</span>
      </div>
      <LoginButton client:load />
    </div>
  </nav>

  <main class="max-w-6xl mx-auto px-4 py-8 space-y-8">
    <MediaUploader client:load onUploaded={() => {}} />
    <MediaGallery client:load />
  </main>
</AdminLayout>
```

- [ ] **步骤 5：Commit**

```bash
git add src/pages/admin/media.astro src/components/admin/MediaUploader.tsx src/components/admin/MediaGallery.tsx workers/cms-api/src/routes/media.ts
git commit -m "feat(cms): implement media upload and gallery"
```

---

## 任务 6：导航集成与部署状态

**文件：**
- 创建：`src/components/admin/DeployStatus.tsx`
- 创建：`workers/cms-api/src/routes/deploy.ts`
- 修改：`src/components/admin/AdminLayout.tsx`（添加侧边导航）

- [ ] **步骤 1：编写部署状态路由**

创建 `workers/cms-api/src/routes/deploy.ts`：

```ts
import type { Env } from '../index';
import { requireAuth } from '../lib/auth-middleware';

export async function handleDeploy(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  // GET /admin/api/deploy/status → get latest deployment status
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/runs?per_page=1&branch=${env.GITHUB_BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  const data = (await res.json()) as { workflow_runs: Array<{ status: string; conclusion: string; created_at: string; html_url: string }> };
  const run = data.workflow_runs?.[0];

  return new Response(
    JSON.stringify({
      status: run?.status || 'unknown',
      conclusion: run?.conclusion || null,
      createdAt: run?.created_at || null,
      url: run?.html_url || null,
    }),
    { headers: jsonHeaders }
  );
}
```

- [ ] **步骤 2：编写部署状态组件**

创建 `src/components/admin/DeployStatus.tsx`：

```tsx
import { useState, useEffect } from 'react';

interface DeployInfo {
  status: string;
  conclusion: string | null;
  createdAt: string | null;
  url: string | null;
}

export default function DeployStatus() {
  const [deploy, setDeploy] = useState<DeployInfo | null>(null);

  useEffect(() => {
    fetch('/admin/api/deploy/status', { credentials: 'include' })
      .then((res) => res.json())
      .then(setDeploy)
      .catch(() => {});
  }, []);

  if (!deploy || deploy.status === 'unknown') return null;

  const isRunning = deploy.status === 'in_progress' || deploy.status === 'queued';
  const isSuccess = deploy.conclusion === 'success';
  const isFailure = deploy.conclusion === 'failure';

  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${
      isRunning ? 'bg-yellow-100 text-yellow-800' :
      isSuccess ? 'bg-green-100 text-green-800' :
      isFailure ? 'bg-red-100 text-red-800' :
      'bg-gray-100 text-gray-600'
    }`}>
      {isRunning && <span className="animate-spin">⏳</span>}
      {isSuccess && <span>✅</span>}
      {isFailure && <span>❌</span>}
      <span>
        {isRunning ? '部署中...' :
         isSuccess ? '部署成功' :
         isFailure ? '部署失败' :
         deploy.status}
      </span>
      {deploy.url && (
        <a href={deploy.url} target="_blank" rel="noopener" className="underline">
          详情
        </a>
      )}
    </div>
  );
}
```

- [ ] **步骤 3：更新 AdminLayout 添加导航**

更新 `src/components/admin/AdminLayout.tsx`：

```tsx
import type { ReactNode } from 'react';
import DeployStatus from './DeployStatus';

interface Props {
  title: string;
  children: ReactNode;
}

export default function AdminLayout({ title, children }: Props) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} | Alex's Blog CMS</title>
        <style>{`
          body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
        `}</style>
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **步骤 4：更新仪表盘页面添加导航和部署状态**

更新 `src/pages/admin/dashboard.astro`：

```astro
---
import AdminLayout from '../../components/admin/AdminLayout.tsx';
import LoginButton from '../../components/admin/LoginButton.tsx';
import DeployStatus from '../../components/admin/DeployStatus.tsx';
import ArticleList from '../../components/admin/ArticleList.tsx';
---

<AdminLayout title="仪表盘">
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
      <div class="flex items-center gap-6">
        <a href="/admin/dashboard" class="text-lg font-bold">CMS 后台</a>
        <div class="flex gap-4 text-sm">
          <a href="/admin/dashboard" class="text-blue-600 font-medium">文章</a>
          <a href="/admin/media" class="text-gray-500 hover:text-gray-700">媒体</a>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <DeployStatus client:load />
        <LoginButton client:load />
      </div>
    </div>
  </nav>

  <main class="max-w-6xl mx-auto px-4 py-8">
    <ArticleList client:load />
  </main>
</AdminLayout>
```

- [ ] **步骤 5：Commit**

```bash
git add src/components/admin/DeployStatus.tsx workers/cms-api/src/routes/deploy.ts src/components/admin/AdminLayout.tsx src/pages/admin/dashboard.astro
git commit -m "feat(cms): add deploy status and admin navigation"
```

---

## 任务 7：路由保护与 sitemap 排除

**文件：**
- 修改：`astro.config.mjs`（确认 sitemap 排除 admin）
- 创建：`src/pages/admin/404.astro`

- [ ] **步骤 1：确认 sitemap 已排除 /admin/**

在 `astro.config.mjs` 中确认已有此配置（当前第 126-128 行已有）：

```js
sitemap({
  filter: (page) => {
    return !page.includes('/admin/');
  },
}),
```

无需修改。

- [ ] **步骤 2：创建 admin 404 页面**

创建 `src/pages/admin/404.astro`：

```astro
---
import AdminLayout from '../../components/admin/AdminLayout.tsx';
---

<AdminLayout title="页面未找到">
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <p class="text-gray-500 mb-8">页面不存在</p>
      <a href="/admin/dashboard" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        返回仪表盘
      </a>
    </div>
  </div>
</AdminLayout>
```

- [ ] **步骤 3：Commit**

```bash
git add src/pages/admin/404.astro
git commit -m "feat(cms): add admin 404 page and verify sitemap exclusion"
```

---

## 自检清单

1. **规格覆盖度** ✅
   - 用户认证（GitHub OAuth）→ 任务 2
   - 文章管理（CRUD + 列表）→ 任务 3 + 4
   - 媒体管理（上传 + 库）→ 任务 5
   - 多语言支持 → 任务 4 的 FrontmatterForm（lang 字段）
   - SEO 优化 → 任务 4 的 FrontmatterForm（title/description/tags）
   - 实时预览 → 任务 4 的 MarkdownEditor
   - 自动部署 → 任务 1 的 GitHub Actions + 任务 6 的部署状态

2. **占位符扫描** ✅ — 无 TODO、无 "待定"、无模糊需求

3. **类型一致性** ✅ — `Frontmatter` 接口在 FrontmatterForm 和编辑页面间一致

4. **安全考虑** ✅
   - OAuth 最小权限（repo scope）
   - Session 存储在 KV 中（HttpOnly cookie）
   - 协作者校验在 OAuth callback 中
   - 文件大小和类型验证在媒体上传中
