import { describe, expect, it } from 'vitest';
import { decodeBase64, encodeBase64 } from '../src/lib/github';
import { constantTimeEqual } from '../src/lib/session';
import {
  isSupportedImage,
  normalizeExtension,
  normalizeSlug,
  safeImageName,
  validateMarkdown,
  validatePidanConfig,
} from '../src/lib/validation';

describe('CMS input validation', () => {
  it('accepts safe Latin and CJK slugs', () => {
    expect(normalizeSlug('hello-world')).toBe('hello-world');
    expect(normalizeSlug(encodeURIComponent('观众-序列9'))).toBe('观众-序列9');
  });

  it('rejects path traversal and unsupported extensions', () => {
    expect(() => normalizeSlug('../secret')).toThrow();
    expect(() => normalizeSlug('nested/post')).toThrow();
    expect(() => normalizeExtension('html')).toThrow();
  });

  it('requires frontmatter title and description', () => {
    const valid = `---
title: "Hello"
description: "Summary"
pubDate: 2026-07-30
---

Body`;
    expect(() => validateMarkdown(valid)).not.toThrow();
    expect(() => validateMarkdown('# Missing frontmatter')).toThrow();
  });

  it('sanitizes image names and checks magic bytes', () => {
    expect(safeImageName('我的 screenshot 01.PNG')).toEqual({
      stem: '我的-screenshot-01',
      extension: 'png',
    });
    expect(
      isSupportedImage(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'png',
      ),
    ).toBe(true);
    expect(isSupportedImage(new Uint8Array([0x3c, 0x73, 0x76, 0x67]), 'png')).toBe(false);
  });
});

describe('GitHub content encoding', () => {
  it('round-trips Unicode markdown', () => {
    const markdown = '# 你好，Cloudflare 👋';
    expect(decodeBase64(encodeBase64(markdown))).toBe(markdown);
  });
});

describe('OAuth state comparison', () => {
  it('compares equal and different values after fixed-length hashing', async () => {
    await expect(constantTimeEqual('same-state', 'same-state')).resolves.toBe(true);
    await expect(constantTimeEqual('short', 'a-different-length-state')).resolves.toBe(false);
  });
});

describe('Pidan pet config validation', () => {
  const validConfig = {
    profile: { name: '皮蛋', subtitle: '海豹重点色长毛陪读猫', collarLabel: '小鱼圈' },
    cards: [
      {
        id: 'armchair-sun',
        enabled: true,
        title: '太师椅晒太阳',
        badge: '午后大佬',
        image: 'image/pet/cards/pidan-13-armchair-sun.webp',
        quote: '这把椅子归皮蛋了。',
        caption: '坐在木椅上晒太阳。',
      },
    ],
    dialogues: {
      greet: ['你好喵～'],
      pet: ['呼噜呼噜～'],
      petCombo: ['连环撸猫！'],
      feed: ['好吃！'],
      sleep: ['Zzz'],
      wake: ['醒啦！'],
      drag: ['被拎起来啦！'],
      drop: ['稳稳落地！'],
      fastScroll: ['滑太快啦！'],
      collarOn: '戴上小鱼圈！',
      collarOff: '摘下小鱼圈！',
      milestone25: '读完 1/4',
      milestone50: '读完一半',
      milestone85: '快读完了',
      milestone100: '全部读完！',
      toReal: '切到真猫',
      toChibi: '切回 Q 版',
    },
  };

  it('accepts valid pet config within public/image/pet', () => {
    const out = validatePidanConfig(validConfig);
    expect(out.profile.name).toBe('皮蛋');
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0]?.enabled).toBe(true);
  });

  it('rejects external URLs, path traversal, SVG images, or all-disabled cards', () => {
    expect(() =>
      validatePidanConfig({
        ...validConfig,
        cards: [{ ...validConfig.cards[0], image: 'https://evil.example/cat.webp' }],
      }),
    ).toThrow();

    expect(() =>
      validatePidanConfig({
        ...validConfig,
        cards: [{ ...validConfig.cards[0], image: 'image/pet/../secret.webp' }],
      }),
    ).toThrow();

    expect(() =>
      validatePidanConfig({
        ...validConfig,
        cards: [{ ...validConfig.cards[0], image: 'image/pet/cards/evil.svg' }],
      }),
    ).toThrow();

    expect(() =>
      validatePidanConfig({
        ...validConfig,
        cards: [{ ...validConfig.cards[0], enabled: false }],
      }),
    ).toThrow();
  });
});
