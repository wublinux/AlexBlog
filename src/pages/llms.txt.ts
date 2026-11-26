import type { APIContext } from 'astro';
import { GITHUB_URL, SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getAllPosts, getPostLang } from '../utils/rss';

function encodePathSegment(segment: string): string {
	return segment
		.split('/')
		.map((part) => encodeURIComponent(part))
		.join('/');
}

function formatIsoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export async function GET(context: APIContext) {
	const siteOrigin = (context.site?.toString() ?? 'https://letsgogogogogo.pp.ua').replace(/\/+$/, '');
	const posts = await getAllPosts();

	const lines: string[] = [
		`# ${SITE_TITLE}`,
		'',
		`> ${SITE_DESCRIPTION} — A personal engineering blog by Alex Huang featuring Chinese and English technical notes, essays, and twice-daily GitHub open-source radar.`,
		'',
		`- Canonical site: ${siteOrigin}/`,
		`- Author GitHub: ${GITHUB_URL}`,
		`- RSS (All): ${siteOrigin}/rss.xml`,
		`- RSS (Chinese): ${siteOrigin}/rss-zh.xml`,
		`- RSS (English): ${siteOrigin}/rss-en.xml`,
		`- Sitemap: ${siteOrigin}/sitemap.xml`,
		'',
		'## Sections',
		'',
		`- [Home](${siteOrigin}/): Latest writing and site overview.`,
		`- [Blog](${siteOrigin}/blog/): Full list of published articles.`,
		`- [Blog Archive](${siteOrigin}/blog/archive/): Chronological archive by year and month.`,
		`- [Important Articles](${siteOrigin}/blog/important/): Curated evergreen posts.`,
		`- [Tags](${siteOrigin}/tags/): Browse posts grouped by topic.`,
		`- [GitHub Daily](${siteOrigin}/github-daily/): Twice-daily Top 9 newly created GitHub repositories (past 24h) with concise Chinese summaries.`,
		`- [Projects & Friends](${siteOrigin}/links/): Selected tools, GitHub projects, and recommended developers.`,
		`- [About](${siteOrigin}/about/): Background and focus areas.`,
		'',
		'## Published Articles (Markdown)',
		'',
		'Each article is available as clean UTF-8 Markdown at `/blog/<slug>.md` as well as rendered HTML at `/blog/<slug>/`.',
		'',
	];

	for (const post of posts) {
		const encodedId = encodePathSegment(post.id);
		const mdUrl = `${siteOrigin}/blog/${encodedId}.md`;
		const htmlUrl = `${siteOrigin}/blog/${encodedId}/`;
		const lang = getPostLang(post) === 'cn' ? 'zh-CN' : 'en';
		const pubDate = formatIsoDate(post.data.pubDate);
		const tags = (post.data.tags ?? []).filter(Boolean);
		const tagSuffix = tags.length > 0 ? ` | tags: ${tags.join(', ')}` : '';
		const summary = post.data.description.replace(/\s+/g, ' ').trim();

		lines.push(`- [${post.data.title}](${mdUrl}): ${summary} (${pubDate}, ${lang}${tagSuffix}; HTML: ${htmlUrl})`);
	}

	lines.push('');

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
		},
	});
}
