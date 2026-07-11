# Alex's Blog

基于 Astro 5 与 Tailwind CSS 4 的静态个人博客，用于记录技术笔记、项目实践和生活思考。

- 在线站点：<https://letsgogogogogo.pp.ua/>
- GitHub 仓库：<https://github.com/wublinux/AlexBlog>
- GitHub 主页：<https://github.com/wublinux>

## 功能

- Astro Content Collections 驱动的 Markdown/MDX 内容
- 首页、博客、分页、归档、精选、标签、友链、项目与关于页面
- 中英文文章配对与独立 RSS
- 桌面端目录侧栏和移动端目录抽屉
- 暗色模式、View Transitions 与响应式导航
- GitHub Projects 实时元数据：语言、Star、Fork 和更新时间
- Sitemap、Canonical、Open Graph 与 IndexNow 支持
- 日系清新二次元首页主视觉

## 本地开发

```bash
npm install
npm run dev
```

正式构建：

```bash
npm run check:encoding
npm run build
npm run preview
```

## 内容写作

文章文件位于 `src/content/blog/`，支持 `.md` 与 `.mdx`。

```yaml
---
title: "文章标题"
description: "文章摘要"
pubDate: 2026-07-03
updatedDate: 2026-07-04
tags: ["Astro", "Web"]
lang: cn
draft: false
---
```

中英文文章可通过相同的 `group` 字段配对，也可以使用 `-cn`、`-en` 文件名后缀。

## GitHub Projects

精选仓库配置位于 `src/data/projects.ts`。Projects 页面先输出静态回退内容，再通过 GitHub 公共 API 更新仓库描述、语言、Star、Fork、Homepage 与更新时间。成功响应在当前浏览器会话中缓存五分钟；API 不可用或触发限流时，静态卡片仍可正常访问。

## 部署

项目输出为纯静态文件，构建目录是 `dist/`。GitHub Actions 会在 `V2.0.0` 分支更新时构建并部署到 Cloudflare Pages。

Cloudflare Pages 配置：

- 构建命令：`npm run build`
- 输出目录：`dist/`
- Node.js：20
- 环境变量：`CF_PAGES=1`

## 目录

```text
src/
├── components/      Astro UI 组件
├── content/blog/    Markdown 与 MDX 文章
├── data/            导航、友链、项目与语录数据
├── layouts/         文章页面布局
├── pages/           文件路由
├── styles/          全局样式
└── utils/           内容、标签、RSS 与统计工具
```

项目采用 MIT 许可证。
