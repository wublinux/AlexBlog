import { HttpError } from './http';

const SLUG_PATTERN = /^[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*$/u;
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);

export function normalizeSlug(raw: string): string {
  let slug: string;
  try {
    slug = decodeURIComponent(raw).normalize('NFC').trim();
  } catch {
    throw new HttpError(400, 'invalid_slug', '文章文件名编码无效。');
  }
  if (!SLUG_PATTERN.test(slug) || slug.length > 120) {
    throw new HttpError(
      400,
      'invalid_slug',
      '文件名只能包含文字、数字、连字符或下划线，且不能超过 120 个字符。',
    );
  }
  return slug;
}

export function normalizeExtension(raw: unknown): 'md' | 'mdx' {
  if (raw === undefined || raw === 'md') return 'md';
  if (raw === 'mdx') return 'mdx';
  throw new HttpError(400, 'invalid_extension', '文章扩展名必须是 md 或 mdx。');
}

export function validateMarkdown(content: unknown): asserts content is string {
  if (typeof content !== 'string' || content.length === 0) {
    throw new HttpError(422, 'invalid_content', '文章内容不能为空。');
  }
  if (new TextEncoder().encode(content).byteLength > 1_000_000) {
    throw new HttpError(413, 'content_too_large', '单篇文章不能超过 1 MB。');
  }
  if (!/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content)) {
    throw new HttpError(422, 'invalid_frontmatter', '文章必须包含有效的 YAML frontmatter。');
  }
  if (!/^title:\s*.+$/m.test(content) || !/^description:\s*.+$/m.test(content)) {
    throw new HttpError(422, 'missing_metadata', '文章标题和描述为必填项。');
  }
}

export function safeImageName(originalName: string): {
  stem: string;
  extension: string;
} {
  const normalized = originalName.normalize('NFKC').trim();
  const extension = normalized.split('.').pop()?.toLowerCase() ?? '';
  if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new HttpError(
      415,
      'unsupported_image',
      '仅支持 JPG、PNG、GIF、WebP 或 AVIF 图片。',
    );
  }

  const withoutExtension = normalized.slice(0, -(extension.length + 1));
  const stem =
    withoutExtension
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 80) || 'image';

  return { stem, extension };
}

export function isSupportedImage(bytes: Uint8Array, extension: string): boolean {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (extension === 'jpg' || extension === 'jpeg') return startsWith(0xff, 0xd8, 0xff);
  if (extension === 'png') return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (extension === 'gif') {
    return new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF87a' ||
      new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF89a';
  }
  if (extension === 'webp') {
    return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  }
  if (extension === 'avif') {
    return new TextDecoder().decode(bytes.slice(4, 12)).includes('ftypavif');
  }
  return false;
}
