import { useState } from 'react';
import type { Frontmatter } from '../../lib/admin/content';

interface Props {
  value: Frontmatter;
  onChange: (next: Frontmatter) => void;
}

export default function FrontmatterForm({ value, onChange }: Props) {
  const [tagInput, setTagInput] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const update = (patch: Partial<Frontmatter>) => onChange({ ...value, ...patch });

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || value.tags.includes(tag)) return;
    update({ tags: [...value.tags, tag] });
    setTagInput('');
  };

  return (
    <section className="admin-card">
      <div className="admin-card__header">
        <strong>文章信息</strong>
        <button
          className="admin-button admin-button--ghost"
          type="button"
          onClick={() => setAdvanced((current) => !current)}
        >
          {advanced ? '收起高级项' : '高级选项'}
        </button>
      </div>
      <div className="admin-card__body admin-stack">
        <div className="admin-field">
          <label htmlFor="post-title">标题 *</label>
          <input
            id="post-title"
            className="admin-input"
            value={value.title}
            maxLength={120}
            onChange={(event) => update({ title: event.target.value })}
            placeholder="清楚、具体的文章标题"
          />
        </div>

        <div className="admin-field">
          <label htmlFor="post-description">描述 *</label>
          <textarea
            id="post-description"
            className="admin-textarea"
            value={value.description}
            maxLength={240}
            rows={3}
            onChange={(event) => update({ description: event.target.value })}
            placeholder="用于列表页、搜索结果和社交分享"
          />
          <p className="admin-help">{value.description.length}/240 字符</p>
        </div>

        <div className="admin-field-row">
          <div className="admin-field">
            <label htmlFor="post-date">发布日期 *</label>
            <input
              id="post-date"
              className="admin-input"
              type="date"
              value={value.pubDate}
              onChange={(event) => update({ pubDate: event.target.value })}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="post-language">语言</label>
            <select
              id="post-language"
              className="admin-select"
              value={value.lang}
              onChange={(event) =>
                update({ lang: event.target.value as Frontmatter['lang'] })
              }
            >
              <option value="">未指定</option>
              <option value="cn">中文</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="post-tag">标签</label>
          <div className="admin-actions">
            <input
              id="post-tag"
              className="admin-input"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="输入后按回车"
            />
            <button className="admin-button admin-button--secondary" type="button" onClick={addTag}>
              添加
            </button>
          </div>
          {value.tags.length > 0 && (
            <div className="admin-tags">
              {value.tags.map((tag) => (
                <span className="admin-tag" key={tag}>
                  {tag}
                  <button
                    className="admin-button admin-button--ghost"
                    type="button"
                    aria-label={`删除标签 ${tag}`}
                    onClick={() => update({ tags: value.tags.filter((item) => item !== tag) })}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="admin-checkboxes">
          <label className="admin-label">
            <input
              type="checkbox"
              checked={value.draft}
              onChange={(event) => update({ draft: event.target.checked })}
            />{' '}
            保存为草稿
          </label>
          <label className="admin-label">
            <input
              type="checkbox"
              checked={value.important}
              onChange={(event) => update({ important: event.target.checked })}
            />{' '}
            标记为重要
          </label>
        </div>

        {advanced && (
          <>
            <div className="admin-field">
              <label htmlFor="post-hero">头图路径</label>
              <input
                id="post-hero"
                className="admin-input"
                value={value.heroImage}
                onChange={(event) => update({ heroImage: event.target.value })}
                placeholder="/image/cover.webp"
              />
            </div>
            <div className="admin-field-row">
              <div className="admin-field">
                <label htmlFor="post-group">双语分组</label>
                <input
                  id="post-group"
                  className="admin-input"
                  value={value.group}
                  onChange={(event) => update({ group: event.target.value })}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="post-category">分类</label>
                <input
                  id="post-category"
                  className="admin-input"
                  value={value.category}
                  onChange={(event) => update({ category: event.target.value })}
                />
              </div>
            </div>
            <div className="admin-field-row">
              <div className="admin-field">
                <label htmlFor="post-author">作者</label>
                <input
                  id="post-author"
                  className="admin-input"
                  value={value.author}
                  onChange={(event) => update({ author: event.target.value })}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="post-slug">公开 URL slug</label>
                <input
                  id="post-slug"
                  className="admin-input"
                  value={value.slug}
                  onChange={(event) => update({ slug: event.target.value })}
                />
              </div>
            </div>
            <div className="admin-field-row">
              <div className="admin-field">
                <label htmlFor="post-updated">更新日期</label>
                <input
                  id="post-updated"
                  className="admin-input"
                  type="date"
                  value={value.updatedDate}
                  onChange={(event) => update({ updatedDate: event.target.value })}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="post-order">重要排序</label>
                <input
                  id="post-order"
                  className="admin-input"
                  type="number"
                  value={value.importantOrder}
                  onChange={(event) =>
                    update({ importantOrder: Number.parseInt(event.target.value, 10) || 0 })
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
