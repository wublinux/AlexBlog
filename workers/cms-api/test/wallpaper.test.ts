import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import {
  WALLPAPER_POOL_MAX,
  WALLPAPER_PREFERRED_MAX_BYTES,
  WALLPAPER_ROTATION_HOURS,
  getWallpaperSlot,
  handleWallpaperRequest,
  parseWallpaperSnapshot,
  refreshWallpaperPool,
  selectAnimeWallpapers,
  type WallpaperSnapshot,
} from '../src/lib/wallpaper';
import type { CmsEnv } from '../src/types';

const NOW = new Date('2026-11-26T10:30:00.000Z'); // Slot inside 08:00–12:00 UTC

function wallhavenItem(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const prefix = id.slice(0, 2);
  return {
    id,
    url: `https://wallhaven.cc/w/${id}`,
    short_url: `https://whvn.cc/${id}`,
    views: 980,
    favorites: 42,
    source: 'https://www.pixiv.net/artworks/123456789',
    purity: 'sfw',
    category: 'anime',
    dimension_x: 2560,
    dimension_y: 1440,
    resolution: '2560x1440',
    ratio: '1.78',
    file_size: 1_850_000,
    file_type: 'image/jpeg',
    created_at: '2026-11-25 10:00:00',
    colors: ['#999999', '#e7d8b1', '#424153'],
    path: `https://w.wallhaven.cc/full/${prefix}/wallhaven-${id}.jpg`,
    ...overrides,
  };
}

function createEnv(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  const get = vi.fn(async (key: string) => store.get(key) ?? null);
  const put = vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  });
  const kv = { get, put } as unknown as KVNamespace;

  const env = {
    SESSIONS: kv,
    GITHUB_DAILY: kv,
    AI: { run: vi.fn() } as unknown as Ai,
    PUBLIC_APP_ORIGIN: 'https://letsgogogogogo.pp.ua',
    GITHUB_OWNER: 'wublinux',
    GITHUB_REPO: 'AlexBlog',
    GITHUB_BRANCH: 'V2.0.0',
    GITHUB_OAUTH_SCOPE: 'public_repo',
    BLOG_BASE_PATH: 'src/content/blog',
    IMAGE_BASE_PATH: 'public/image',
    GITHUB_CLIENT_ID: '',
    GITHUB_CLIENT_SECRET: '',
  } as CmsEnv;

  return { env, store, get, put };
}

function buildSnapshot(generatedAt = NOW.toISOString(), count = 6): WallpaperSnapshot {
  const raw = Array.from({ length: count }, (_, idx) =>
    wallhavenItem(`an${String(idx + 10).padStart(4, '0')}`),
  );
  return {
    schemaVersion: 1,
    source: 'wallhaven',
    category: 'anime',
    purity: 'sfw',
    rotationHours: WALLPAPER_ROTATION_HOURS,
    generatedAt,
    nextRefreshAt: '2026-11-27T01:00:00.000Z',
    items: selectAnimeWallpapers(raw),
  };
}

describe('Wallhaven pure-anime wallpaper selection', () => {
  it('filters to strict SFW anime landscape images on w.wallhaven.cc and deduplicates', () => {
    const raw = [
      wallhavenItem('ok0001'),
      wallhavenItem('ok0002', {
        dimension_x: 1920,
        dimension_y: 1200,
        file_type: 'image/png',
        path: 'https://w.wallhaven.cc/full/ok/wallhaven-ok0002.png',
      }),
      wallhavenItem('ok0001'), // duplicate
      wallhavenItem('nsfw01', { purity: 'nsfw' }),
      wallhavenItem('sket01', { purity: 'sketchy' }),
      wallhavenItem('gen001', { category: 'general' }),
      wallhavenItem('port01', { dimension_x: 1440, dimension_y: 2560 }),
      wallhavenItem('tiny01', { dimension_x: 1280, dimension_y: 720 }),
      wallhavenItem('huge01', { file_size: 18 * 1024 * 1024 }),
      wallhavenItem('evil01', {
        path: 'https://evil.example/full/ev/wallhaven-evil01.jpg',
      }),
      wallhavenItem('svg001', {
        file_type: 'image/svg+xml',
        path: 'https://w.wallhaven.cc/full/sv/wallhaven-svg001.svg',
      }),
    ];

    const selected = selectAnimeWallpapers(raw);
    expect(selected.map((item) => item.id)).toEqual(['ok0001', 'ok0002']);
    expect(selected[0]?.rank).toBe(1);
    expect(selected[1]?.rank).toBe(2);
    expect(selected[1]?.resolution).toBe('1920x1200');
  });

  it('prefers <= 5 MB files and relaxes up to 8 MB only when fewer than 6 pass', () => {
    const rawWithManyLight = [
      ...Array.from({ length: 8 }, (_, idx) =>
        wallhavenItem(`lt${String(idx).padStart(4, '0')}`, { file_size: 2_000_000 }),
      ),
      wallhavenItem('md0001', { file_size: WALLPAPER_PREFERRED_MAX_BYTES + 1_000_000 }),
    ];
    expect(selectAnimeWallpapers(rawWithManyLight).map((item) => item.id)).not.toContain('md0001');

    const rawSparse = [
      wallhavenItem('lt0001', { file_size: 2_000_000 }),
      wallhavenItem('md0001', { file_size: WALLPAPER_PREFERRED_MAX_BYTES + 1_000_000 }),
      wallhavenItem('hg0001', { file_size: 12 * 1024 * 1024 }),
    ];
    expect(selectAnimeWallpapers(rawSparse).map((item) => item.id)).toEqual(['lt0001', 'md0001']);
  });

  it('caps the pool at WALLPAPER_POOL_MAX items', () => {
    const raw = Array.from({ length: 30 }, (_, idx) =>
      wallhavenItem(`wp${String(idx).padStart(4, '0')}`),
    );
    expect(selectAnimeWallpapers(raw)).toHaveLength(WALLPAPER_POOL_MAX);
  });
});

describe('4-hour deterministic slot rotation', () => {
  it('advances activeIndex every 4 hours on exact UTC boundaries', () => {
    const slotA = getWallpaperSlot(new Date('2026-11-26T00:00:00.000Z'), 12);
    const slotASame = getWallpaperSlot(new Date('2026-11-26T03:59:59.000Z'), 12);
    const slotB = getWallpaperSlot(new Date('2026-11-26T04:00:00.000Z'), 12);
    const slotC = getWallpaperSlot(new Date('2026-11-26T08:00:00.000Z'), 12);

    expect(slotASame.slot).toBe(slotA.slot);
    expect(slotASame.activeIndex).toBe(slotA.activeIndex);
    expect(slotB.slot).toBe(slotA.slot + 1);
    expect(slotB.activeIndex).toBe((slotA.activeIndex + 1) % 12);
    expect(slotC.slot).toBe(slotA.slot + 2);
    expect(slotA.slotStartAt).toBe('2026-11-26T00:00:00.000Z');
    expect(slotA.nextChangeAt).toBe('2026-11-26T04:00:00.000Z');
  });
});

describe('Wallhaven refresh and KV isolation', () => {
  it('fetches 1w pure-anime SFW toplist, tops up from 1M, and preserves github-daily key', async () => {
    const { env, store } = createEnv({
      'github-daily:latest:v1': '{"kept":true}',
    });
    const requestedRanges: string[] = [];

    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      expect(url.searchParams.get('categories')).toBe('010');
      expect(url.searchParams.get('purity')).toBe('100');
      expect(url.searchParams.get('sorting')).toBe('toplist');
      const range = url.searchParams.get('topRange') ?? '';
      requestedRanges.push(range);

      if (range === '1w') {
        return Response.json({
          data: Array.from({ length: 4 }, (_, idx) =>
            wallhavenItem(`wk${String(idx).padStart(4, '0')}`),
          ),
        });
      }
      return Response.json({
        data: [
          wallhavenItem('wk0000'), // duplicate from 1w
          ...Array.from({ length: 12 }, (_, idx) =>
            wallhavenItem(`mo${String(idx).padStart(4, '0')}`),
          ),
        ],
      });
    });

    const snapshot = await refreshWallpaperPool(env, NOW, fetcher);
    expect(requestedRanges).toEqual(['1w', '1M']);
    expect(snapshot.items).toHaveLength(16);
    expect(snapshot.items[0]?.id).toBe('wk0000');
    expect(store.get('github-daily:latest:v1')).toBe('{"kept":true}');
    expect(parseWallpaperSnapshot(store.get('wallpaper:latest:v1') ?? '')?.items).toHaveLength(16);
  });

  it('preserves previous snapshot when Wallhaven fails', async () => {
    const previous = JSON.stringify(buildSnapshot('2026-11-25T08:00:00.000Z'));
    const { env, put, store } = createEnv({ 'wallpaper:latest:v1': previous });
    const fetcher = vi.fn(async () => new Response(null, { status: 503 }));

    await expect(refreshWallpaperPool(env, NOW, fetcher)).rejects.toThrow(
      'Wallhaven search (1w) failed',
    );
    expect(put).not.toHaveBeenCalled();
    expect(store.get('wallpaper:latest:v1')).toBe(previous);
  });
});

describe('Public /api/wallpaper endpoint', () => {
  it('returns active wallpaper, ETag 304, HEAD, and shrinks Cache-Control near 4h boundary', async () => {
    const storedSnapshot = buildSnapshot('2026-11-26T08:00:00.000Z', 6);
    const { env } = createEnv({
      'wallpaper:latest:v1': JSON.stringify(storedSnapshot),
    });

    const nearBoundary = new Date('2026-11-26T11:59:15.000Z'); // 45s before 12:00 UTC
    const response = await handleWallpaperRequest(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper'),
      env,
      nearBoundary,
    );
    expect(response.status).toBe(200);
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Cache-Control')).toContain('max-age=45');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=45');

    const payload = await response.json<{
      rotationHours: number;
      activeIndex: number;
      active: { id: string; imageUrl: string };
      items: unknown[];
      nextChangeAt: string;
    }>();
    expect(payload.rotationHours).toBe(4);
    expect(payload.items).toHaveLength(6);
    expect(payload.active.imageUrl).toMatch(/^https:\/\/w\.wallhaven\.cc\/full\//);
    expect(payload.nextChangeAt).toBe('2026-11-26T12:00:00.000Z');

    const etag = response.headers.get('ETag');
    const notModified = await handleWallpaperRequest(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper', {
        headers: { 'If-None-Match': etag ?? '' },
      }),
      env,
      nearBoundary,
    );
    expect(notModified.status).toBe(304);

    // 1 second after boundary: slot changes -> ETag no longer matches
    const afterBoundary = new Date('2026-11-26T12:00:01.000Z');
    const rotated = await handleWallpaperRequest(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper', {
        headers: { 'If-None-Match': etag ?? '' },
      }),
      env,
      afterBoundary,
    );
    expect(rotated.status).toBe(200);
    const rotatedPayload = await rotated.json<{ activeIndex: number }>();
    expect(rotatedPayload.activeIndex).toBe((payload.activeIndex + 1) % 6);

    const head = await handleWallpaperRequest(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper', { method: 'HEAD' }),
      env,
      nearBoundary,
    );
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  it('rejects non-GET/HEAD methods and lazily bootstraps empty KV on GET only', async () => {
    const { env, put } = createEnv();

    const post = await handleWallpaperRequest(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper', { method: 'POST' }),
      env,
      NOW,
    );
    expect(post.status).toBe(405);
    expect(post.headers.get('Allow')).toBe('GET, HEAD');

    const headEmpty = await handleWallpaperRequest(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper', { method: 'HEAD' }),
      env,
      NOW,
    );
    expect(headEmpty.status).toBe(503);
    expect(put).not.toHaveBeenCalled();

    const fetcher = vi.fn(async () =>
      Response.json({
        data: Array.from({ length: 12 }, (_, idx) =>
          wallhavenItem(`bt${String(idx).padStart(4, '0')}`),
        ),
      }),
    );

    const getBootstrap = await handleWallpaperRequest(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper'),
      env,
      NOW,
      fetcher,
    );
    expect(getBootstrap.status).toBe(200);
    expect(put).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('drops an invalid stored item instead of failing the entire snapshot', async () => {
    const valid = buildSnapshot();
    const toxic = {
      ...valid.items[0]!,
      id: 'evil99',
      imageUrl: 'https://attacker.example/evil.jpg',
    };
    const { env } = createEnv({
      'wallpaper:latest:v1': JSON.stringify({
        ...valid,
        items: [valid.items[0]!, toxic],
      }),
    });

    const response = await handleWallpaperRequest(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper'),
      env,
      NOW,
    );
    expect(response.status).toBe(200);
    const payload = await response.json<{ items: Array<{ id: string }> }>();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]?.id).toBe(valid.items[0]?.id);
  });

  it('routes /api/wallpaper cleanly via worker.fetch', async () => {
    const { env } = createEnv({
      'wallpaper:latest:v1': JSON.stringify(buildSnapshot()),
    });
    const response = await worker.fetch(
      new Request('https://letsgogogogogo.pp.ua/api/wallpaper'),
      env,
    );
    expect(response.status).toBe(200);
    const payload = await response.json<{ source: string; category: string }>();
    expect(payload.source).toBe('wallhaven');
    expect(payload.category).toBe('anime');
  });

  it('isolates scheduled failures so wallpaper refresh succeeds even if GitHub fails', async () => {
    const { env, store } = createEnv();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      if (url.hostname === 'api.github.com') {
        return new Response(null, { status: 503 });
      }
      if (url.hostname === 'wallhaven.cc') {
        return Response.json({
          data: Array.from({ length: 12 }, (_, idx) =>
            wallhavenItem(`sc${String(idx).padStart(4, '0')}`),
          ),
        });
      }
      return new Response(null, { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(
        worker.scheduled(
          { scheduledTime: NOW.getTime(), cron: '0 1,8 * * *' } as ScheduledController,
          env,
        ),
      ).rejects.toThrow('github_daily');
    } finally {
      vi.unstubAllGlobals();
    }

    const storedWallpaper = parseWallpaperSnapshot(store.get('wallpaper:latest:v1') ?? '');
    expect(storedWallpaper?.items).toHaveLength(12);
  });
});
