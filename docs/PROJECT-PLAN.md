# AlexBlog CMS 与 GitHub Daily 项目计划

> **项目状态**：CMS 与 GitHub Daily 均已上线；首个生产快照已验证
> **分支**：`V2.0.0`
> **更新日期**：2026-08-01

## 项目目标

在现有 Astro 博客中提供一个仅仓库协作者可使用的管理后台。用户通过
GitHub OAuth 登录后，可以管理 Markdown/MDX 文章和媒体文件；内容写入
GitHub 后，由现有 GitHub Actions 自动部署到 Cloudflare Pages。

同时提供公开的 GitHub Daily 页面，每天香港时间 09:00 与 16:00 汇总过去
24 小时新建并获得较多 Star 的公开仓库，以项目卡片和 README 辅助的中文
AI 短评帮助读者快速判断是否值得进一步了解。

## 计划审查后的调整

原实现计划的产品范围保持不变，但实现方式做了以下修正：

1. OAuth 登录增加一次性 `state`、HttpOnly `__Host-` Cookie、会话过期和
   仓库写权限校验。
2. 所有写接口增加同源校验，API 统一返回结构化错误；文章更新和删除必须
   携带 GitHub SHA，避免静默覆盖他人的新版本。
3. Wrangler 4 使用 `wrangler types` 生成绑定类型，不再手写 `Env`；Secrets
   通过 `wrangler secret put` 管理，不写入配置文件。
4. Astro 使用静态输出，无法为未来才出现在 GitHub 的文章预生成动态编辑
   路由。因此编辑器使用 `/admin/edit/?slug=...`，新文章无需重新构建后台
   即可立即打开。
5. Markdown 预览使用 React Markdown AST 渲染并忽略原始 HTML，避免
   `dangerouslySetInnerHTML` 带来的 XSS 风险。
6. 媒体上传除扩展名和大小外，还检查文件头；不接受 SVG，以避免公开目录
   中的脚本内容。
7. Astro、MDX 和 Sharp 已升级到安全修复版本，部署运行时同步升级到
   Node 22。
8. 增加根目录与 Worker 子目录 `AGENTS.md`，固定生产资源、Secrets、
   GitHub 可写路径、认证/同源约束、验证命令和 Git/部署边界；旧设计文档明确
   标记为历史记录，避免后续模型按过时示例扩权。

## 已完成

### Task 1：基础设施

- [x] 集成 React 19 与 Astro
- [x] 创建 `workers/cms-api` Worker 工程
- [x] 配置 Wrangler 4、KV、环境变量、可观测性与生成类型
- [x] 增加 Worker 类型检查、单元测试和 dry-run 构建

### Task 2：GitHub OAuth 与会话

- [x] 登录、回调、当前用户和退出接口
- [x] OAuth `state` 防护和固定回调 Origin
- [x] KV 会话、8 小时过期与安全 Cookie
- [x] 仅允许拥有 `write`、`maintain` 或 `admin` 权限的协作者
- [x] 后台登录页与登录状态导航

### Task 3：文章仪表盘

- [x] GitHub Contents API 封装
- [x] 文章列表、读取、创建、更新和删除接口
- [x] Unicode slug 校验、内容大小限制和 SHA 并发冲突保护
- [x] 文章搜索、编辑和删除界面

### Task 4：Markdown 编辑器

- [x] 完整 frontmatter 解析与序列化
- [x] 保留 CMS 尚未识别的自定义 frontmatter 字段
- [x] 标题、描述、日期、语言、标签、草稿、重要文章及高级字段
- [x] Markdown 工具栏与安全实时预览
- [x] SEO/社交分享卡片预览
- [x] 未保存离开提醒和保存后的新 SHA 更新

### Task 5：媒体管理

- [x] 媒体列表与多文件上传
- [x] 5 MB 限制、允许类型白名单和文件头校验
- [x] 响应式媒体库和 Markdown 链接复制

### Task 6：部署状态与导航

- [x] GitHub Actions 最新运行状态接口
- [x] 后台导航、用户信息、退出和部署状态轮询
- [x] 博客外链与响应式后台布局

### Task 7：SEO、路由与验证

- [x] Sitemap 排除所有 `/admin/` 页面
- [x] 后台页面添加 `noindex, nofollow, noarchive`
- [x] 后台 404 页面
- [x] Astro 生产构建通过
- [x] Worker TypeScript 检查通过
- [x] Worker 单元测试通过（5 项）
- [x] Worker Wrangler dry-run 构建通过
- [x] 生产依赖审计为 0 个已知漏洞

### Task 8：生产边界与模型约束

- [x] 根目录 `AGENTS.md` 约束内容、Git、Pages 与生产部署范围
- [x] Worker `AGENTS.md` 约束 Secrets、认证、同源、KV 与 GitHub 写入范围
- [x] 本地代理运行状态和敏感开发文件从 Git/模型上下文中排除
- [x] 历史设计文档标记为非执行指令
- [x] OAuth `state` 使用固定长度摘要和常量时间比较

### Task 9：GitHub Daily

- [x] 新增 `/github-daily/` 页面与主导航入口
- [x] 响应式 Top 9 项目卡、更新时间、过期提示和失败状态
- [x] 新增公开只读 `/api/github-daily` 接口
- [x] 按过去 24 小时创建时间筛选 GitHub 仓库并按 Star 排序
- [x] README 有界读取、提示注入隔离和 Workers AI 结构化中文短评
- [x] AI 局部失败规则化降级，GitHub 失败保留最后成功快照
- [x] 每天香港时间 09:00、16:00 的 Worker Cron
- [x] GitHub Daily 数据管道、缓存接口与现有健康接口的单元测试

### Task 10：生产发布防覆盖

- [x] Pages 生产发布仅允许通过 `V2.0.0` 的 GitHub Actions 工作流
- [x] 发布前重新获取远端生产分支并校验构建提交等于最新远端提交
- [x] 使用工作流并发锁取消落后的生产发布任务
- [x] 禁止从脏工作树、分离 HEAD 或落后提交直接上传 Pages 生产版本

## 仍需一次性云端配置

以下步骤需要 Cloudflare 与 GitHub 账号权限，不能在仓库中预填：

1. [x] 已在当前 Cloudflare 账号创建 `alexblog-cms-sessions` KV，并写入
   `SESSIONS` 绑定。
2. [x] 已在 GitHub 创建 OAuth App，Callback URL 设置为：
   `https://letsgogogogogo.pp.ua/admin/api/auth/callback`
3. [x] 已在 Worker 中设置 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` Secrets。
4. [x] 已部署 `workers/cms-api`，确认自定义路由
   `letsgogogogogo.pp.ua/admin/api/*` 生效。
5. [x] 已发布 Cloudflare Pages `alexblog` 的 `V2.0.0` 分支，并用
   `wublinux` 协作者账号完成生产 OAuth 登录，成功进入 `/admin/dashboard/`。
   `/admin/api/health` 返回 `{"ok":true}`。
6. [x] 创建独立的 GitHub Daily KV namespace，将返回的 ID 写入
   `GITHUB_DAILY` 绑定；不得复用只存储 OAuth 状态和会话的 `SESSIONS`。
7. [x] 在明确授权后部署 Worker，确认 Cron、Workers AI 绑定与
   `/api/github-daily` 精确公开路由生效，并等待首个成功快照。
8. [x] Worker 快照可用后，将 GitHub Daily 静态页面发布到现有
   `alexblog` Pages 项目，不创建第二个项目。

具体命令和注意事项见
[`workers/cms-api/README.md`](../workers/cms-api/README.md)。

## 验收标准

- 未登录或无写权限的用户不能读取或修改 CMS 数据。
- OAuth 回调不能在缺少或伪造 `state` 时建立会话。
- 同名文章创建、过期 SHA 更新或删除会返回冲突，不覆盖远端新版本。
- 新建或编辑文章后，GitHub 中的 frontmatter 可通过 Astro 内容 Schema。
- 上传文件只能落在 `public/image`，并返回可用的 Markdown URL。
- GitHub Actions 状态可在后台查看，成功提交会触发现有 Pages 工作流。
- GitHub Daily 只展示符合筛选条件的最多 9 个项目，README 原文不写入 KV
  或公开 API，所有外链与动态文本均经过校验或以纯文本渲染。
- GitHub 或 AI 暂时失败时，页面不会暴露错误细节或删除最后一次成功结果；
  超过 24 小时的快照会明确标记为可能过期。
