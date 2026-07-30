import { useEffect, useMemo, useState } from 'react';
import { cmsRequest } from '../../lib/admin/api';
import {
  buildPostSource,
  emptyFrontmatter,
  parsePostSource,
  type Frontmatter,
} from '../../lib/admin/content';
import FrontmatterForm from './FrontmatterForm';
import MarkdownEditor from './MarkdownEditor';
import SEOPreview from './SEOPreview';

interface PostResponse {
  content: string;
  sha: string;
  path: string;
  extension: 'md' | 'mdx';
}

export default function EditorApp() {
  const initialSlug = useMemo(
    () => new URLSearchParams(window.location.search).get('slug') ?? '',
    [],
  );
  const [slug, setSlug] = useState(initialSlug);
  const [extension, setExtension] = useState<'md' | 'mdx'>('md');
  const [frontmatter, setFrontmatter] = useState<Frontmatter>(emptyFrontmatter);
  const [body, setBody] = useState('');
  const [sha, setSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(initialSlug));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!initialSlug) return;
    cmsRequest<PostResponse>(`/admin/api/posts/${encodeURIComponent(initialSlug)}`)
      .then((post) => {
        const parsed = parsePostSource(post.content);
        setFrontmatter(parsed.frontmatter);
        setBody(parsed.body);
        setSha(post.sha);
        setExtension(post.extension);
      })
      .catch((reason: Error) => setMessage({ kind: 'error', text: reason.message }))
      .finally(() => setLoading(false));
  }, [initialSlug]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const updateFrontmatter = (next: Frontmatter) => {
    setFrontmatter(next);
    setDirty(true);
  };

  const updateBody = (next: string) => {
    setBody(next);
    setDirty(true);
  };

  const save = async () => {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      setMessage({ kind: 'error', text: '请填写文章文件名。' });
      return;
    }
    if (!frontmatter.title.trim() || !frontmatter.description.trim() || !frontmatter.pubDate) {
      setMessage({ kind: 'error', text: '标题、描述和发布日期均为必填项。' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await cmsRequest<{ sha: string | null }>(
        `/admin/api/posts/${encodeURIComponent(normalizedSlug)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            content: buildPostSource(frontmatter, body),
            sha,
            extension,
          }),
        },
      );
      setSha(response.sha);
      setSlug(normalizedSlug);
      setDirty(false);
      window.history.replaceState(
        null,
        '',
        `/admin/edit/?slug=${encodeURIComponent(normalizedSlug)}`,
      );
      setMessage({
        kind: 'success',
        text: '文章已提交到 GitHub，部署流程会自动开始。',
      });
    } catch (reason) {
      setMessage({
        kind: 'error',
        text: reason instanceof Error ? reason.message : '保存失败，请稍后重试。',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-card admin-loading">正在载入文章…</div>;

  return (
    <div className="admin-stack">
      {message && (
        <div
          className={`admin-alert admin-alert--${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">{sha ? 'Edit post' : 'New post'}</p>
          <h1 className="admin-title">{sha ? frontmatter.title || slug : '新建文章'}</h1>
          <p className="admin-subtitle">
            {sha ? `正在编辑 ${slug}.${extension}` : '填写文章信息并用 Markdown 编写正文。'}
          </p>
        </div>
        <div className="admin-actions">
          <a className="admin-button admin-button--secondary" href="/admin/dashboard/">
            返回
          </a>
          <button
            className="admin-button admin-button--primary"
            type="button"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? '提交中…' : dirty || !sha ? '保存并部署' : '已保存'}
          </button>
        </div>
      </div>

      {!sha && (
        <section className="admin-card">
          <div className="admin-card__body admin-field-row">
            <div className="admin-field">
              <label htmlFor="file-slug">文章文件名 *</label>
              <input
                id="file-slug"
                className="admin-input"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setDirty(true);
                }}
                placeholder="my-first-post"
              />
              <p className="admin-help">允许文字、数字、连字符和下划线。</p>
            </div>
            <div className="admin-field">
              <label htmlFor="file-extension">文件格式</label>
              <select
                id="file-extension"
                className="admin-select"
                value={extension}
                onChange={(event) => setExtension(event.target.value as 'md' | 'mdx')}
              >
                <option value="md">Markdown (.md)</option>
                <option value="mdx">MDX (.mdx)</option>
              </select>
            </div>
          </div>
        </section>
      )}

      <div className="admin-grid admin-grid--editor">
        <div className="admin-stack">
          <FrontmatterForm value={frontmatter} onChange={updateFrontmatter} />
          <SEOPreview value={frontmatter} />
        </div>
        <MarkdownEditor value={body} onChange={updateBody} />
      </div>
    </div>
  );
}
