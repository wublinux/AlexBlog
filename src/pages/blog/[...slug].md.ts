import type { APIContext, GetStaticPaths } from 'astro';
import { type CollectionEntry, getCollection } from 'astro:content';
import { getPostLang } from '../../utils/rss';

export const getStaticPaths: GetStaticPaths = async () => {
	const posts = await getCollection('blog');
	return posts
		.filter((post) => post.data.draft !== true)
		.map((post) => ({
			params: { slug: post.id },
			props: { post },
		}));
};

interface Props {
	post: CollectionEntry<'blog'>;
}

function encodePathSegment(segment: string): string {
	return segment
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
}

export async function GET(context: APIContext) {
	const { post } = context.props as Props;
	const siteOrigin = (context.site?.toString() ?? 'https://letsgogogogogo.pp.ua').replace(/\/+$/, '');
	const encodedId = encodePathSegment(post.id);
	const canonicalUrl = `${siteOrigin}/blog/${encodedId}/`;
	const lang = getPostLang(post) === 'cn' ? 'zh-CN' : 'en';
	const tags = (post.data.tags ?? []).filter(Boolean);

	const headerLines = [
		`# ${post.data.title}`,
		'',
		`> ${post.data.description}`,
		'',
		`- Canonical URL: ${canonicalUrl}`,
		`- Published: ${post.data.pubDate.toISOString().slice(0, 10)}`,
		...(post.data.updatedDate ? [`- Updated: ${post.data.updatedDate.toISOString().slice(0, 10)}`] : []),
		`- Language: ${lang}`,
		...(post.data.author ? [`- Author: ${post.data.author}`] : ['- Author: Alex Huang']),
		...(tags.length > 0 ? [`- Tags: ${tags.join(', ')}`] : []),
		'',
		'---',
		'',
		(post.body ?? '').trim(),
		'',
	];

	return new Response(headerLines.join('\n'), {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
		},
	});
}
