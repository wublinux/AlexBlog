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

const PET_IMAGE_PATH_PATTERN =
  /^image\/pet\/(?:cards\/)?[\p{L}\p{N}._-]+\.(?:webp|jpe?g|png|gif|avif)$/iu;
const PET_CARD_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

const DIALOGUE_LIST_KEYS = [
  'greet',
  'pet',
  'petCombo',
  'feed',
  'sleep',
  'wake',
  'drag',
  'drop',
  'fastScroll',
] as const;

const DIALOGUE_SINGLE_KEYS = [
  'collarOn',
  'collarOff',
  'milestone25',
  'milestone50',
  'milestone85',
  'milestone100',
  'toReal',
  'toChibi',
] as const;

export interface ValidatedPidanCard {
  id: string;
  enabled: boolean;
  title: string;
  badge: string;
  image: string;
  quote: string;
  caption: string;
}

export interface ValidatedPidanConfig {
  profile: {
    name: string;
    subtitle: string;
    collarLabel: string;
  };
  cards: ValidatedPidanCard[];
  dialogues: Record<(typeof DIALOGUE_LIST_KEYS)[number], string[]> &
    Record<(typeof DIALOGUE_SINGLE_KEYS)[number], string>;
}

function boundedString(
  raw: unknown,
  field: string,
  minLength: number,
  maxLength: number,
): string {
  if (typeof raw !== 'string') {
    throw new HttpError(422, 'invalid_pet_config', `字段 ${field} 必须是文本。`);
  }
  const trimmed = raw.normalize('NFC').trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new HttpError(
      422,
      'invalid_pet_config',
      `字段 ${field} 长度需在 ${minLength}–${maxLength} 个字符之间。`,
    );
  }
  return trimmed;
}

export function validatePidanConfig(raw: unknown): ValidatedPidanConfig {
  if (!raw || typeof raw !== 'object') {
    throw new HttpError(422, 'invalid_pet_config', '皮蛋配置格式无效。');
  }
  const source = raw as Record<string, unknown>;
  const rawProfile =
    source.profile && typeof source.profile === 'object'
      ? (source.profile as Record<string, unknown>)
      : null;
  if (!rawProfile) {
    throw new HttpError(422, 'invalid_pet_config', '缺少宠物基础档案配置。');
  }

  const profile = {
    name: boundedString(rawProfile.name, 'profile.name', 1, 24),
    subtitle: boundedString(rawProfile.subtitle, 'profile.subtitle', 1, 60),
    collarLabel: boundedString(rawProfile.collarLabel ?? '小鱼圈', 'profile.collarLabel', 1, 16),
  };

  if (!Array.isArray(source.cards) || source.cards.length === 0 || source.cards.length > 60) {
    throw new HttpError(422, 'invalid_pet_config', '萌照卡片数量需在 1–60 张之间。');
  }

  const seenIds = new Set<string>();
  const cards: ValidatedPidanCard[] = source.cards.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new HttpError(422, 'invalid_pet_config', `第 ${idx + 1} 张卡片格式无效。`);
    }
    const card = item as Record<string, unknown>;
    const id = boundedString(card.id, `cards[${idx}].id`, 1, 64);
    if (!PET_CARD_ID_PATTERN.test(id)) {
      throw new HttpError(422, 'invalid_pet_config', `卡片 ID "${id}" 仅允许字母、数字、连字符或下划线。`);
    }
    if (seenIds.has(id)) {
      throw new HttpError(422, 'invalid_pet_config', `卡片 ID "${id}" 重复。`);
    }
    seenIds.add(id);

    const image = boundedString(card.image, `cards[${idx}].image`, 5, 180);
    if (image.includes('..') || !PET_IMAGE_PATH_PATTERN.test(image)) {
      throw new HttpError(
        422,
        'invalid_pet_image',
        `第 ${idx + 1} 张卡片图片路径必须位于 image/pet/ 目录且为安全图片格式。`,
      );
    }

    return {
      id,
      enabled: card.enabled !== false,
      title: boundedString(card.title, `cards[${idx}].title`, 1, 40),
      badge: boundedString(card.badge ?? '', `cards[${idx}].badge`, 0, 24),
      image,
      quote: boundedString(card.quote ?? '', `cards[${idx}].quote`, 0, 140),
      caption: boundedString(card.caption ?? '', `cards[${idx}].caption`, 0, 220),
    };
  });

  if (!cards.some((c) => c.enabled)) {
    throw new HttpError(422, 'invalid_pet_config', '至少需要启用 1 张展示中的萌照卡片。');
  }

  const rawDialogues =
    source.dialogues && typeof source.dialogues === 'object'
      ? (source.dialogues as Record<string, unknown>)
      : null;
  if (!rawDialogues) {
    throw new HttpError(422, 'invalid_pet_config', '缺少互动台词配置。');
  }

  const dialogues = {} as ValidatedPidanConfig['dialogues'];
  for (const key of DIALOGUE_LIST_KEYS) {
    const arr = rawDialogues[key];
    if (!Array.isArray(arr) || arr.length === 0 || arr.length > 20) {
      throw new HttpError(422, 'invalid_pet_config', `台词组 ${key} 需包含 1–20 条台词。`);
    }
    dialogues[key] = arr.map((line, idx) =>
      boundedString(line, `dialogues.${key}[${idx}]`, 1, 140),
    );
  }

  for (const key of DIALOGUE_SINGLE_KEYS) {
    dialogues[key] = boundedString(rawDialogues[key], `dialogues.${key}`, 1, 140);
  }

  return { profile, cards, dialogues };
}
