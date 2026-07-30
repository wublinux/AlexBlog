import { parse, stringify } from 'yaml';

export interface Frontmatter {
  title: string;
  description: string;
  pubDate: string;
  updatedDate: string;
  tags: string[];
  important: boolean;
  importantOrder: number;
  heroImage: string;
  lang: 'cn' | 'en' | '';
  group: string;
  author: string;
  category: string;
  slug: string;
  draft: boolean;
  typoraRootUrl: string;
  extra: Record<string, unknown>;
}

const KNOWN_KEYS = new Set([
  'title',
  'description',
  'pubDate',
  'updatedDate',
  'tags',
  'important',
  'importantOrder',
  'heroImage',
  'lang',
  'group',
  'author',
  'category',
  'slug',
  'draft',
  'typora-root-url',
]);

function asString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function emptyFrontmatter(): Frontmatter {
  return {
    title: '',
    description: '',
    pubDate: new Date().toISOString().slice(0, 10),
    updatedDate: '',
    tags: [],
    important: false,
    importantOrder: 0,
    heroImage: '',
    lang: 'cn',
    group: '',
    author: '',
    category: '',
    slug: '',
    draft: false,
    typoraRootUrl: '',
    extra: {},
  };
}

export function parsePostSource(source: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match?.[1]) {
    return { frontmatter: emptyFrontmatter(), body: source };
  }

  const raw = parse(match[1]) as Record<string, unknown> | null;
  const data = raw && typeof raw === 'object' ? raw : {};
  const extra = Object.fromEntries(
    Object.entries(data).filter(([key]) => !KNOWN_KEYS.has(key)),
  );
  const lang = data.lang === 'cn' || data.lang === 'en' ? data.lang : '';

  return {
    frontmatter: {
      title: asString(data.title),
      description: asString(data.description),
      pubDate: asString(data.pubDate),
      updatedDate: asString(data.updatedDate),
      tags: Array.isArray(data.tags) ? data.tags.map(asString).filter(Boolean) : [],
      important: data.important === true,
      importantOrder:
        typeof data.importantOrder === 'number' ? Math.trunc(data.importantOrder) : 0,
      heroImage: asString(data.heroImage),
      lang,
      group: asString(data.group),
      author: asString(data.author),
      category: asString(data.category),
      slug: asString(data.slug),
      draft: data.draft === true,
      typoraRootUrl: asString(data['typora-root-url']),
      extra,
    },
    body: match[2] ?? '',
  };
}

export function buildPostSource(frontmatter: Frontmatter, body: string): string {
  const data: Record<string, unknown> = {
    ...frontmatter.extra,
    title: frontmatter.title.trim(),
    description: frontmatter.description.trim(),
    pubDate: frontmatter.pubDate,
  };

  if (frontmatter.updatedDate) data.updatedDate = frontmatter.updatedDate;
  if (frontmatter.tags.length) data.tags = frontmatter.tags;
  if (frontmatter.important) data.important = true;
  if (frontmatter.importantOrder) data.importantOrder = frontmatter.importantOrder;
  if (frontmatter.heroImage) data.heroImage = frontmatter.heroImage;
  if (frontmatter.lang) data.lang = frontmatter.lang;
  if (frontmatter.group) data.group = frontmatter.group;
  if (frontmatter.author) data.author = frontmatter.author;
  if (frontmatter.category) data.category = frontmatter.category;
  if (frontmatter.slug) data.slug = frontmatter.slug;
  if (frontmatter.draft) data.draft = true;
  if (frontmatter.typoraRootUrl) data['typora-root-url'] = frontmatter.typoraRootUrl;

  const yaml = stringify(data, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${body.replace(/^\s*\n/, '')}`;
}
