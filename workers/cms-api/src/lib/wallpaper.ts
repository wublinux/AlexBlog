import type { CmsEnv } from '../types';
import { apiError, json, methodNotAllowed } from './http';
import { getNextUpdateAt } from './github-daily';

const WALLHAVEN_API = 'https://wallhaven.cc/api/v1/search';
const WALLPAPER_KEY = 'wallpaper:latest:v1';
const WALLHAVEN_MAX_RESPONSE_BYTES = 1024 * 1024;
const WALLHAVEN_FETCH_TIMEOUT_MS = 8_000;

export const WALLPAPER_ROTATION_HOURS = 4;
export const WALLPAPER_ROTATION_MS = WALLPAPER_ROTATION_HOURS * 60 * 60 * 1_000;
export const WALLPAPER_POOL_MAX = 18;
export const WALLPAPER_POOL_MIN_TARGET = 12;
export const WALLPAPER_MIN_WIDTH = 1920;
export const WALLPAPER_MIN_HEIGHT = 1080;
export const WALLPAPER_MAX_DIMENSION = 8192;
export const WALLPAPER_MIN_ASPECT = 1.45;
export const WALLPAPER_MAX_ASPECT = 2.35;
export const WALLPAPER_PREFERRED_MAX_BYTES = 5 * 1024 * 1024;
export const WALLPAPER_ABSOLUTE_MAX_BYTES = 8 * 1024 * 1024;

const SNAPSHOT_STALE_MS = 24 * 60 * 60 * 1_000;
const WALLPAPER_ID_PATTERN = /^[a-z0-9]{4,12}$/i;
const WALLHAVEN_IMAGE_PATH_PATTERN = /^\/full\/[a-z0-9]{2}\/wallhaven-[a-z0-9]+\.(jpg|jpeg|png|webp)$/i;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface WallhavenSearchResponse {
  data?: unknown;
}

export interface WallpaperItem {
  rank: number;
  id: string;
  imageUrl: string;
  pageUrl: string;
  sourceUrl: string | null;
  width: number;
  height: number;
  resolution: string;
  fileSize: number;
  fileType: 'image/jpeg' | 'image/png' | 'image/webp';
  favorites: number;
  views: number;
  colors: string[];
}

export interface WallpaperSnapshot {
  schemaVersion: 1;
  source: 'wallhaven';
  category: 'anime';
  purity: 'sfw';
  rotationHours: typeof WALLPAPER_ROTATION_HOURS;
  generatedAt: string;
  nextRefreshAt: string;
  items: WallpaperItem[];
}

export interface WallpaperSlotState {
  slot: number;
  activeIndex: number;
  slotStartAt: string;
  nextChangeAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export function safeWallhavenImageUrl(value: unknown): string | null {
  const href = safeHttpsUrl(value);
  if (!href) return null;
  try {
    const parsed = new URL(href);
    if (parsed.hostname !== 'w.wallhaven.cc') return null;
    if (!WALLHAVEN_IMAGE_PATH_PATTERN.test(parsed.pathname)) return null;
    if (parsed.search || parsed.hash) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function safeWallhavenPageUrl(value: unknown, id: string): string | null {
  if (!WALLPAPER_ID_PATTERN.test(id)) return null;
  if (value !== undefined && value !== null) {
    const href = safeHttpsUrl(value);
    if (!href) return null;
    try {
      const parsed = new URL(href);
      if (parsed.hostname !== 'wallhaven.cc') return null;
      if (parsed.pathname !== `/w/${id}`) return null;
      return `https://wallhaven.cc/w/${encodeURIComponent(id)}`;
    } catch {
      return null;
    }
  }
  return `https://wallhaven.cc/w/${encodeURIComponent(id)}`;
}

function parseColors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const colors: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string' && HEX_COLOR_PATTERN.test(entry.trim())) {
      colors.push(entry.trim().toLowerCase());
      if (colors.length >= 5) break;
    }
  }
  return colors;
}

function parseWallhavenCandidate(
  value: unknown,
  maxBytes: number,
): Omit<WallpaperItem, 'rank'> | null {
  if (!isRecord(value)) return null;
  if (value.purity !== 'sfw' || value.category !== 'anime') return null;

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!WALLPAPER_ID_PATTERN.test(id)) return null;

  const width = nonNegativeInteger(value.dimension_x);
  const height = nonNegativeInteger(value.dimension_y);
  if (
    width === null ||
    height === null ||
    width < WALLPAPER_MIN_WIDTH ||
    height < WALLPAPER_MIN_HEIGHT ||
    width > WALLPAPER_MAX_DIMENSION ||
    height > WALLPAPER_MAX_DIMENSION
  ) {
    return null;
  }

  const aspect = width / height;
  if (aspect < WALLPAPER_MIN_ASPECT || aspect > WALLPAPER_MAX_ASPECT) {
    return null;
  }

  const fileSize = nonNegativeInteger(value.file_size);
  if (fileSize === null || fileSize <= 0 || fileSize > maxBytes) return null;

  const fileType = typeof value.file_type === 'string' ? value.file_type.toLowerCase() : '';
  if (!ALLOWED_MIME_TYPES.has(fileType)) return null;

  const imageUrl = safeWallhavenImageUrl(value.path);
  if (!imageUrl) return null;

  const pageUrl = safeWallhavenPageUrl(value.url, id);
  if (!pageUrl) return null;

  const favorites = nonNegativeInteger(value.favorites) ?? 0;
  const views = nonNegativeInteger(value.views) ?? 0;

  return {
    id,
    imageUrl,
    pageUrl,
    sourceUrl: safeHttpsUrl(value.source),
    width,
    height,
    resolution: `${width}x${height}`,
    fileSize,
    fileType: fileType as WallpaperItem['fileType'],
    favorites,
    views,
    colors: parseColors(value.colors),
  };
}

export function selectAnimeWallpapers(rawItems: unknown[]): WallpaperItem[] {
  const unique = new Map<string, Omit<WallpaperItem, 'rank'>>();

  for (const raw of rawItems) {
    const candidate = parseWallhavenCandidate(raw, WALLPAPER_PREFERRED_MAX_BYTES);
    if (candidate && !unique.has(candidate.id)) {
      unique.set(candidate.id, candidate);
      if (unique.size >= WALLPAPER_POOL_MAX) break;
    }
  }

  // Only relax file-size ceiling up to 8 MB when strict 5 MB filtering returns too few items.
  if (unique.size < 6) {
    for (const raw of rawItems) {
      const candidate = parseWallhavenCandidate(raw, WALLPAPER_ABSOLUTE_MAX_BYTES);
      if (candidate && !unique.has(candidate.id)) {
        unique.set(candidate.id, candidate);
        if (unique.size >= WALLPAPER_POOL_MAX) break;
      }
    }
  }

  return [...unique.values()].map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

async function readBoundedText(response: Response, maximumBytes: number): Promise<string> {
  if (!response.body || maximumBytes <= 0) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (total < maximumBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.byteLength) continue;

    const remaining = maximumBytes - total;
    const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
    chunks.push(chunk);
    total += chunk.byteLength;

    if (value.byteLength > remaining || total >= maximumBytes) {
      await reader.cancel();
      break;
    }
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

async function fetchWallhavenToplist(
  topRange: '1w' | '1M',
  fetcher: typeof fetch,
): Promise<unknown[]> {
  const url = new URL(WALLHAVEN_API);
  url.searchParams.set('sorting', 'toplist');
  url.searchParams.set('topRange', topRange);
  url.searchParams.set('categories', '010');
  url.searchParams.set('purity', '100');
  url.searchParams.set('atleast', `${WALLPAPER_MIN_WIDTH}x${WALLPAPER_MIN_HEIGHT}`);
  url.searchParams.set('ratios', '16x9,16x10');
  url.searchParams.set('page', '1');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WALLHAVEN_FETCH_TIMEOUT_MS);

  try {
    const response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AlexBlog-Wallpaper/1.0 (+https://letsgogogogogo.pp.ua)',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Wallhaven search (${topRange}) failed with status ${response.status}.`);
    }

    const text = await readBoundedText(response, WALLHAVEN_MAX_RESPONSE_BYTES);
    const payload = JSON.parse(text) as WallhavenSearchResponse;
    if (!Array.isArray(payload.data)) {
      throw new Error(`Wallhaven search (${topRange}) returned an invalid payload.`);
    }
    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}

export function getWallpaperSlot(now: Date, itemCount: number): WallpaperSlotState {
  const safeCount = Math.max(1, itemCount);
  const slot = Math.floor(now.getTime() / WALLPAPER_ROTATION_MS);
  const activeIndex = ((slot % safeCount) + safeCount) % safeCount;
  const slotStartMs = slot * WALLPAPER_ROTATION_MS;
  const nextChangeMs = (slot + 1) * WALLPAPER_ROTATION_MS;

  return {
    slot,
    activeIndex,
    slotStartAt: new Date(slotStartMs).toISOString(),
    nextChangeAt: new Date(nextChangeMs).toISOString(),
  };
}

function isWallpaperItem(value: unknown): value is WallpaperItem {
  if (!isRecord(value)) return false;
  const rank = nonNegativeInteger(value.rank);
  const width = nonNegativeInteger(value.width);
  const height = nonNegativeInteger(value.height);
  const fileSize = nonNegativeInteger(value.fileSize);
  const favorites = nonNegativeInteger(value.favorites);
  const views = nonNegativeInteger(value.views);

  if (
    rank === null ||
    rank < 1 ||
    rank > WALLPAPER_POOL_MAX ||
    typeof value.id !== 'string' ||
    !WALLPAPER_ID_PATTERN.test(value.id) ||
    typeof value.imageUrl !== 'string' ||
    safeWallhavenImageUrl(value.imageUrl) !== value.imageUrl ||
    typeof value.pageUrl !== 'string' ||
    safeWallhavenPageUrl(value.pageUrl, value.id) !== value.pageUrl ||
    (value.sourceUrl !== null &&
      (typeof value.sourceUrl !== 'string' || safeHttpsUrl(value.sourceUrl) === null)) ||
    width === null ||
    height === null ||
    width < WALLPAPER_MIN_WIDTH ||
    height < WALLPAPER_MIN_HEIGHT ||
    width > WALLPAPER_MAX_DIMENSION ||
    height > WALLPAPER_MAX_DIMENSION ||
    width / height < WALLPAPER_MIN_ASPECT ||
    width / height > WALLPAPER_MAX_ASPECT ||
    value.resolution !== `${width}x${height}` ||
    fileSize === null ||
    fileSize <= 0 ||
    fileSize > WALLPAPER_ABSOLUTE_MAX_BYTES ||
    typeof value.fileType !== 'string' ||
    !ALLOWED_MIME_TYPES.has(value.fileType) ||
    favorites === null ||
    views === null ||
    !Array.isArray(value.colors) ||
    value.colors.length > 5 ||
    !value.colors.every((color) => typeof color === 'string' && HEX_COLOR_PATTERN.test(color))
  ) {
    return false;
  }

  return true;
}

export function parseWallpaperSnapshot(value: string): WallpaperSnapshot | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== 1 ||
      parsed.source !== 'wallhaven' ||
      parsed.category !== 'anime' ||
      parsed.purity !== 'sfw' ||
      parsed.rotationHours !== WALLPAPER_ROTATION_HOURS ||
      typeof parsed.generatedAt !== 'string' ||
      typeof parsed.nextRefreshAt !== 'string' ||
      !isValidDate(parsed.generatedAt) ||
      !isValidDate(parsed.nextRefreshAt) ||
      !Array.isArray(parsed.items) ||
      parsed.items.length === 0 ||
      parsed.items.length > WALLPAPER_POOL_MAX
    ) {
      return null;
    }

    const items = parsed.items.filter(isWallpaperItem).map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
    if (items.length === 0) return null;

    return {
      schemaVersion: 1,
      source: 'wallhaven',
      category: 'anime',
      purity: 'sfw',
      rotationHours: WALLPAPER_ROTATION_HOURS,
      generatedAt: parsed.generatedAt,
      nextRefreshAt: parsed.nextRefreshAt,
      items,
    };
  } catch {
    return null;
  }
}

export async function refreshWallpaperPool(
  env: CmsEnv,
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<WallpaperSnapshot> {
  const weeklyRaw = await fetchWallhavenToplist('1w', fetcher);
  let items = selectAnimeWallpapers(weeklyRaw);

  if (items.length < WALLPAPER_POOL_MIN_TARGET) {
    try {
      const monthlyRaw = await fetchWallhavenToplist('1M', fetcher);
      items = selectAnimeWallpapers([...weeklyRaw, ...monthlyRaw]);
    } catch (error) {
      if (items.length === 0) throw error;
    }
  }

  if (items.length === 0) {
    throw new Error('Wallhaven returned zero eligible anime SFW wallpapers.');
  }

  const snapshot: WallpaperSnapshot = {
    schemaVersion: 1,
    source: 'wallhaven',
    category: 'anime',
    purity: 'sfw',
    rotationHours: WALLPAPER_ROTATION_HOURS,
    generatedAt: now.toISOString(),
    nextRefreshAt: getNextUpdateAt(now),
    items,
  };

  await env.GITHUB_DAILY.put(WALLPAPER_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export async function handleWallpaperRequest(
  request: Request,
  env: CmsEnv,
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed(['GET', 'HEAD']);
  }

  const stored = await env.GITHUB_DAILY.get(WALLPAPER_KEY);
  let snapshot = stored ? parseWallpaperSnapshot(stored) : null;

  // Cold-start bootstrap: populate once on first GET if KV has no snapshot yet.
  if (!snapshot && request.method === 'GET') {
    try {
      snapshot = await refreshWallpaperPool(env, now, fetcher);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'wallpaper_bootstrap_failed',
          error: error instanceof Error ? error.message : 'unknown_error',
        }),
      );
    }
  }

  if (!snapshot) {
    return apiError(
      503,
      'wallpaper_unavailable',
      '二次元热榜壁纸正在准备中，当前将展示默认封面。',
    );
  }

  const slotState = getWallpaperSlot(now, snapshot.items.length);
  const active = snapshot.items[slotState.activeIndex] ?? snapshot.items[0]!;
  const secondsUntilNextChange = Math.max(
    1,
    Math.ceil((Date.parse(slotState.nextChangeAt) - now.getTime()) / 1_000),
  );
  const browserMaxAge = Math.min(300, secondsUntilNextChange);
  const edgeMaxAge = Math.min(900, secondsUntilNextChange);
  const etag = `"${snapshot.generatedAt}:${slotState.slot}"`;

  const headers = new Headers({
    'Cache-Control': `public, max-age=${browserMaxAge}, s-maxage=${edgeMaxAge}, stale-while-revalidate=60`,
    'Content-Type': 'application/json; charset=utf-8',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
  });

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers });
  }

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  return json(
    {
      ...snapshot,
      nextRefreshAt: getNextUpdateAt(now),
      stale: now.getTime() - Date.parse(snapshot.generatedAt) > SNAPSHOT_STALE_MS,
      ...slotState,
      active,
    },
    { status: 200, headers },
  );
}
