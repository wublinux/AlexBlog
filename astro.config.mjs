// @ts-check

/*
 * Astro runtime configuration:
 * - Uses one codebase for both GitHub Pages (repo subpath) and Cloudflare Pages (root path).
 * - Keeps asset/link behavior deterministic by deriving `site` + `base` from build environment.
 */
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

/*
 * Minimal GitHub-style alert parser for markdown blockquotes.
 * Supports:
 * > [!NOTE]
 * > [!TIP]
 * > [!IMPORTANT]
 * > [!WARNING]
 * > [!CAUTION]
 */
function remarkGitHubAlertFallback() {
	const ALERT_TYPES = new Set(['note', 'tip', 'important', 'warning', 'caution']);

	return (tree) => {
		const visit = (node) => {
			if (!node || typeof node !== 'object') return;

			if (node.type === 'blockquote' && Array.isArray(node.children) && node.children.length > 0) {
				const first = node.children[0];
				if (first?.type === 'paragraph' && Array.isArray(first.children) && first.children.length > 0) {
					const firstChild = first.children[0];
					if (firstChild?.type === 'text') {
						const match = firstChild.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
						if (match) {
							const rawType = match[1].toLowerCase();
							if (ALERT_TYPES.has(rawType)) {
								firstChild.value = firstChild.value.replace(match[0], '');
								if (!firstChild.value.length) {
									first.children.shift();
								}

								node.data ??= {};
								node.data.hName = 'blockquote';
								node.data.hProperties = {
									className: ['markdown-alert', `markdown-alert-${rawType}`],
								};

								const titleNode = {
									type: 'paragraph',
									data: {
										hName: 'p',
										hProperties: { className: ['markdown-alert-title'] },
									},
									children: [{ type: 'text', value: rawType }],
								};

								if (first.children.length === 0) {
									node.children.shift();
								}

								node.children.unshift(titleNode);
							}
						}
					}
				}
			}

			if (Array.isArray(node.children)) {
				for (const child of node.children) visit(child);
			}
		};

		visit(tree);
	};
}

const isCloudflarePages = Boolean(process.env.CF_PAGES);
const isProduction = process.env.NODE_ENV === 'production';
// Cloudflare serves from "/", local dev also uses "/".
const runtimeBase = isCloudflarePages ? '/' : '/';
const runtimeSite = 'https://letsgogogogogo.pp.ua';

/*
 * Rewrites markdown `<img src="/image/...">` to include the active base path.
 * This prevents broken images when the same markdown is built for different hosts.
 */
function rehypePrefixPublicImageBase(basePath) {
	return () => {
		return (tree) => {
			const walk = (node) => {
				if (!node || typeof node !== 'object') return;

				if (
					node.type === 'element' &&
					node.tagName === 'img' &&
					node.properties &&
					typeof node.properties.src === 'string'
				) {
					const src = node.properties.src;
					if (src.startsWith('/image/')) {
						node.properties.src = `${basePath}${src.slice(1)}`;
					}
				}

				if (Array.isArray(node.children)) {
					for (const child of node.children) walk(child);
				}
			};

			walk(tree);
		};
	};
}

// https://astro.build/config
export default defineConfig({
	site: runtimeSite,
	base: runtimeBase,
	trailingSlash: 'always',
	output: 'static',
	build: {
		// Keep component stylesheets external under /_astro/*.css so ClientRouter swaps
		// never inject new inline <style> blocks that violate the initial page's strict CSP.
		inlineStylesheets: 'never',
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Inter',
			cssVariable: '--font-inter',
			weights: [400, 500, 600],
			styles: ['normal'],
			subsets: ['latin'],
			display: 'swap',
			fallbacks: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'Instrument Serif',
			cssVariable: '--font-instrument-serif',
			weights: [400],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			display: 'swap',
			fallbacks: ['Georgia', 'Times New Roman', 'serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'JetBrains Mono',
			cssVariable: '--font-jetbrains-mono',
			weights: [400, 500],
			styles: ['normal'],
			subsets: ['latin'],
			display: 'optional',
			fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
		},
	],
	security: {
		csp: {
			algorithm: 'SHA-256',
			directives: [
				"default-src 'self'",
				"base-uri 'self'",
				"object-src 'none'",
				"img-src 'self' data: https://github.com https://avatars.githubusercontent.com https://*.githubusercontent.com",
				"font-src 'self' data:",
				"connect-src 'self' https://api.github.com https://cloudflareinsights.com",
				"frame-src https://giscus.app",
				"form-action 'self' https://github.com",
			],
			scriptDirective: {
				resources: [
					"'self'",
					"'wasm-unsafe-eval'",
					'https://giscus.app',
					'https://static.cloudflareinsights.com',
				],
			},
			styleDirective: {
				resources: [
					{ resource: "'self'", kind: 'element' },
					{ resource: "'unsafe-inline'", kind: 'attribute' },
				],
			},
		},
	},
	integrations: [
		react(),
		mdx(),
		sitemap({
			filter: (page) => {
				return !page.includes('/admin/');
			},
		}),
	],
	markdown: {
		processor: unified({
			// Keep markdown image URLs deployment-agnostic.
			remarkPlugins: [remarkGitHubAlertFallback],
			rehypePlugins: [rehypePrefixPublicImageBase(runtimeBase)],
		}),
		syntaxHighlight: 'shiki',
		shikiConfig: {
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
			wrap: false,
		},
	},
	vite: {
		plugins: [tailwindcss()],
		build: {
			// Keep bundled Astro <script> modules external under /_astro/*.js so ClientRouter
			// never injects data:application/javascript shims or unhashed inline modules under CSP.
			assetsInlineLimit: 0,
		},
	},
});
