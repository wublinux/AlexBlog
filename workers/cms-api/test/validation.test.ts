import { describe, expect, it } from 'vitest';
import { decodeBase64, encodeBase64 } from '../src/lib/github';
import { constantTimeEqual } from '../src/lib/session';
import {
  isSupportedImage,
  normalizeExtension,
  normalizeSlug,
  safeImageName,
  validateMarkdown,
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
