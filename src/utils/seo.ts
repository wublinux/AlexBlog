import { GITHUB_URL, SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export interface BlogPostingJsonLdInput {
	siteUrl: string;
	canonicalUrl: string;
	title: string;
	description: string;
	pubDate: Date;
	updatedDate?: Date;
	imageUrl: string;
	author?: string;
	tags?: string[];
	lang?: 'cn' | 'en';
	wordCount?: number;
}

export function serializeJsonLd(data: Record<string, unknown> | Array<Record<string, unknown>>): string {
	return JSON.stringify(data)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}

export function buildWebsiteJsonLd(siteUrl: string): Array<Record<string, unknown>> {
	const origin = siteUrl.replace(/\/+$/, '');
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			'@id': `${origin}/#website`,
			name: SITE_TITLE,
			description: SITE_DESCRIPTION,
			url: `${origin}/`,
			inLanguage: ['zh-CN', 'en'],
			publisher: {
				'@id': `${origin}/#person`,
			},
		},
		{
			'@context': 'https://schema.org',
			'@type': 'Person',
			'@id': `${origin}/#person`,
			name: 'Alex Huang',
			url: `${origin}/about/`,
			sameAs: [GITHUB_URL],
		},
	];
}

export function buildBlogPostingJsonLd(input: BlogPostingJsonLdInput): Array<Record<string, unknown>> {
	const origin = input.siteUrl.replace(/\/+$/, '');
	const inLanguage = input.lang === 'cn' ? 'zh-CN' : 'en';
	const tags = (input.tags ?? []).filter(Boolean);

	const posting: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: input.title,
		description: input.description,
		url: input.canonicalUrl,
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': input.canonicalUrl,
		},
		datePublished: input.pubDate.toISOString(),
		dateModified: (input.updatedDate ?? input.pubDate).toISOString(),
		inLanguage,
		image: [input.imageUrl],
		author: {
			'@type': 'Person',
			name: input.author || 'Alex Huang',
			url: `${origin}/about/`,
			sameAs: [GITHUB_URL],
		},
		publisher: {
			'@type': 'Person',
			name: 'Alex Huang',
			url: `${origin}/`,
		},
	};

	if (tags.length > 0) {
		posting.keywords = tags.join(', ');
	}
	if (typeof input.wordCount === 'number' && input.wordCount > 0) {
		posting.wordCount = input.wordCount;
	}

	const breadcrumb: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Home',
				item: `${origin}/`,
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'Blog',
				item: `${origin}/blog/`,
			},
			{
				'@type': 'ListItem',
				position: 3,
				name: input.title,
				item: input.canonicalUrl,
			},
		],
	};

	return [posting, breadcrumb];
}
