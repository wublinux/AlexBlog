import type { APIContext, GetStaticPaths } from 'astro';
import { type CollectionEntry, getCollection } from 'astro:content';
import { renderPostOgImage } from '../../utils/ogImage';
import { getPostLang } from '../../utils/postAnalytics';

export const getStaticPaths: GetStaticPaths = async () => {
	const posts = await getCollection('blog');
	return posts.map((post) => ({
		params: { slug: post.id },
		props: { post },
	}));
};

interface Props {
	post: CollectionEntry<'blog'>;
}

export async function GET(context: APIContext) {
	const { post } = context.props as Props;
	const png = await renderPostOgImage({
		title: post.data.title,
		description: post.data.description,
		pubDate: post.data.pubDate,
		tags: post.data.tags,
		lang: getPostLang(post),
	});

	return new Response(new Uint8Array(png), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=86400',
		},
	});
}
