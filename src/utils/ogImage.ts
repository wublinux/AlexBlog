import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const decompressWoff2 = require('wawoff2/decompress') as (buffer: Buffer) => Promise<Uint8Array>;

interface OgAssets {
	fontBuffer: Buffer;
	avatarDataUri: string;
}

let cachedAssetsPromise: Promise<OgAssets> | null = null;

async function loadOgAssets(): Promise<OgAssets> {
	if (!cachedAssetsPromise) {
		cachedAssetsPromise = (async () => {
			const root = process.cwd();
			const [semiBoldWoff2, avatarPng] = await Promise.all([
				readFile(path.join(root, 'public/fonts/AlibabaPuHuiTi-3-75-SemiBold.woff2')),
				sharp(path.join(root, 'public/image/favicon-512.png'))
					.resize(128, 128, { fit: 'cover' })
					.png()
					.toBuffer(),
			]);

			// wawoff2 uses a shared Emscripten heap; copy into a fresh Buffer immediately.
			const fontBuffer = Buffer.from(await decompressWoff2(semiBoldWoff2));

			return {
				fontBuffer,
				avatarDataUri: `data:image/png;base64,${avatarPng.toString('base64')}`,
			};
		})();
	}
	return cachedAssetsPromise;
}

function clampText(text: string, maxChars: number): string {
	const cleaned = text.replace(/\s+/g, ' ').trim();
	if (cleaned.length <= maxChars) return cleaned;
	return `${cleaned.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export interface PostOgImageInput {
	title: string;
	description: string;
	pubDate: Date;
	tags?: string[];
	lang?: 'cn' | 'en';
}

export async function renderPostOgImage(input: PostOgImageInput): Promise<Buffer> {
	const assets = await loadOgAssets();
	const title = clampText(input.title, 56);
	const description = clampText(input.description, 96);
	const tags = (input.tags ?? []).filter(Boolean).slice(0, 4);
	const formattedDate = input.pubDate.toISOString().slice(0, 10);
	const langLabel = input.lang === 'cn' ? '中文' : 'EN';
	const titleSize = title.length > 32 ? 44 : title.length > 18 ? 52 : 58;

	const tree = {
		type: 'div',
		props: {
			style: {
				width: '1200px',
				height: '630px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundImage: 'linear-gradient(135deg, #fdf7fb 0%, #e8f4ff 52%, #eadfff 100%)',
				fontFamily: 'Alibaba PuHuiTi',
				color: '#1f1b2e',
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'space-between',
							width: '1080px',
							height: '522px',
							padding: '44px 48px',
							borderRadius: '32px',
							backgroundColor: 'rgba(255, 255, 255, 0.84)',
							border: '2px solid rgba(255, 255, 255, 0.96)',
							boxShadow: '0 24px 60px rgba(109, 91, 141, 0.16)',
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										width: '984px',
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													alignItems: 'center',
													gap: '14px',
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																width: '10px',
																height: '10px',
																borderRadius: '999px',
																backgroundColor: '#e19ab8',
															},
														},
													},
													{
														type: 'div',
														props: {
															style: {
																fontSize: '20px',
																fontWeight: 600,
																letterSpacing: '0.16em',
																color: '#8c6d87',
															},
															children: "ALEX'S BLOG · ARTICLE",
														},
													},
												],
											},
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													alignItems: 'center',
													gap: '12px',
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																padding: '6px 16px',
																borderRadius: '999px',
																backgroundColor: 'rgba(232, 244, 255, 0.94)',
																border: '1px solid #c5dff5',
																color: '#47688a',
																fontSize: '18px',
																fontWeight: 600,
															},
															children: langLabel,
														},
													},
													{
														type: 'div',
														props: {
															style: {
																padding: '6px 16px',
																borderRadius: '999px',
																backgroundColor: 'rgba(253, 247, 251, 0.94)',
																border: '1px solid #e7c8d9',
																color: '#7a5c73',
																fontSize: '18px',
																fontWeight: 600,
															},
															children: formattedDate,
														},
													},
												],
											},
										},
									],
								},
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										flexDirection: 'column',
										gap: '18px',
										width: '984px',
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													fontSize: `${titleSize}px`,
													fontWeight: 600,
													lineHeight: 1.24,
													color: '#1f1b2e',
													letterSpacing: '-0.02em',
												},
												children: title,
											},
										},
										{
											type: 'div',
											props: {
												style: {
													fontSize: '24px',
													fontWeight: 400,
													lineHeight: 1.55,
													color: '#635c73',
												},
												children: description,
											},
										},
									],
								},
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										width: '984px',
										paddingTop: '20px',
										borderTop: '1px solid rgba(180, 165, 198, 0.35)',
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													alignItems: 'center',
													gap: '10px',
													flexWrap: 'wrap',
													maxWidth: '640px',
												},
												children:
													tags.length > 0
														? tags.map((tag) => ({
																type: 'div',
																props: {
																	style: {
																		padding: '6px 16px',
																		borderRadius: '999px',
																		backgroundColor: 'rgba(244, 241, 250, 0.96)',
																		border: '1px solid rgba(202, 188, 224, 0.75)',
																		color: '#5f5178',
																		fontSize: '18px',
																		fontWeight: 600,
																	},
																	children: `#${tag}`,
																},
															}))
														: [
																{
																	type: 'div',
																	props: {
																		style: {
																			fontSize: '19px',
																			color: '#7a6f8a',
																		},
																		children: 'Tech · Notes · Life',
																	},
																},
															],
											},
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													alignItems: 'center',
													gap: '14px',
												},
												children: [
													{
														type: 'div',
														props: {
															style: {
																display: 'flex',
																flexDirection: 'column',
																alignItems: 'flex-end',
															},
															children: [
																{
																	type: 'div',
																	props: {
																		style: {
																			fontSize: '20px',
																			fontWeight: 600,
																			color: '#2d2640',
																		},
																		children: 'Alex Huang',
																	},
																},
																{
																	type: 'div',
																	props: {
																		style: {
																			fontSize: '16px',
																			fontWeight: 400,
																			color: '#7b6884',
																		},
																		children: 'letsgogogogogo.pp.ua',
																	},
																},
															],
														},
													},
													{
														type: 'img',
														props: {
															src: assets.avatarDataUri,
															width: 58,
															height: 58,
															style: {
																borderRadius: '999px',
																border: '3px solid #ffffff',
																boxShadow: '0 6px 16px rgba(109, 91, 141, 0.22)',
															},
														},
													},
												],
											},
										},
									],
								},
							},
						],
					},
				},
			],
		},
	};

	const svg = await satori(tree as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: 'Alibaba PuHuiTi',
				data: assets.fontBuffer,
				weight: 400,
				style: 'normal',
			},
			{
				name: 'Alibaba PuHuiTi',
				data: assets.fontBuffer,
				weight: 600,
				style: 'normal',
			},
		],
	});

	return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
