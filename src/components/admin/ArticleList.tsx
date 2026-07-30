import { useEffect, useMemo, useState } from 'react';
import { cmsRequest } from '../../lib/admin/api';

interface PostSummary {
  name: string;
  path: string;
  sha: string;
  slug: string;
  extension: 'md' | 'mdx';
  size: number;
}

export default function ArticleList() {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');

  useEffect(() => {
    cmsRequest<{ posts: PostSummary[] }>('/admin/api/posts')
      .then((response) => setPosts(response.posts))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const visiblePosts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return posts;
    return posts.filter(
      (post) =>
        post.slug.toLocaleLowerCase().includes(needle) ||
        post.path.toLocaleLowerCase().includes(needle),
    );
  }, [posts, query]);

  const deletePost = async (post: PostSummary) => {
    if (!window.confirm(`确定删除“${post.slug}”吗？这会立即提交到 GitHub。`)) return;
    setDeleting(post.slug);
    setError('');
    try {
      await cmsRequest(`/admin/api/posts/${encodeURIComponent(post.slug)}`, {
        method: 'DELETE',
        body: JSON.stringify({ sha: post.sha, extension: post.extension }),
      });
      setPosts((current) => current.filter((candidate) => candidate.sha !== post.sha));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败。');
    } finally {
      setDeleting('');
    }
  };

  if (loading) return <div className="admin-card admin-loading">正在读取 GitHub 文章…</div>;

  return (
    <section className="admin-card" aria-labelledby="article-list-title">
      <div className="admin-card__header">
        <div>
          <h2 id="article-list-title" className="admin-list__title">
            全部文章
          </h2>
          <p className="admin-list__meta">{posts.length} 篇 · 保存后自动触发部署</p>
        </div>
        <input
          className="admin-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索文件名…"
          aria-label="搜索文章"
          style={{ maxWidth: '17rem' }}
        />
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      {visiblePosts.length === 0 ? (
        <div className="admin-empty">
          {posts.length ? '没有匹配的文章。' : '还没有文章，从右上角新建第一篇。'}
        </div>
      ) : (
        <ul className="admin-list">
          {visiblePosts.map((post) => (
            <li className="admin-list__item" key={post.sha}>
              <div>
                <h3 className="admin-list__title">{post.slug}</h3>
                <p className="admin-list__meta">
                  {post.extension.toUpperCase()} · {(post.size / 1024).toFixed(1)} KB · {post.path}
                </p>
              </div>
              <div className="admin-actions">
                <a
                  className="admin-button admin-button--secondary"
                  href={`/admin/edit/?slug=${encodeURIComponent(post.slug)}`}
                >
                  编辑
                </a>
                <button
                  className="admin-button admin-button--danger"
                  type="button"
                  disabled={deleting === post.slug}
                  onClick={() => void deletePost(post)}
                >
                  {deleting === post.slug ? '删除中…' : '删除'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
