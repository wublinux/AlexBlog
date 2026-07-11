# Alex's Blog

A static Astro + Tailwind personal blog for technical notes, projects, and long-form writing.

## Tech Stack

- **Framework**: Astro 5 (static output)
- **Styling**: Tailwind CSS 4 + Typography plugin
- **Content**: Astro Content Collections (Markdown + MDX)
- **Code Highlighting**: Shiki (github-light / github-dark)
- **Deployment**: Cloudflare Pages

## Features

- Static-first blog with Astro Content Collections
- Dark mode with view-transition circle animation
- Article TOC: desktop sticky sidebar + mobile drawer
- CN/EN language pairing support
- RSS feeds (all / 中文 / English)
- GitHub-style alert blocks ([!NOTE], [!TIP], etc.)
- Responsive design with mobile drawer navigation
- Code block copy button and expand/collapse

## Development

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Writing

Place `.md` / `.mdx` files under `src/content/blog/`.

Recommended frontmatter:

```yaml
---
title: "Your Title"
description: "Short summary"
pubDate: 2026-07-03
tags: ["tag-a", "tag-b"]
---
```

## Deployment (Cloudflare Pages)

1. Connect your GitHub repo in Cloudflare Dashboard → Pages
2. Build command: `npm run build`
3. Output directory: `dist/`
4. Environment variable: `CF_PAGES=1`
5. Bind your custom domain

## License

MIT — see [LICENSE](./LICENSE)
# Auto-deploy test
