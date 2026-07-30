import { useEffect, useState } from 'react';
import { cmsRequest } from '../../lib/admin/api';

interface MediaFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
}

interface Props {
  refreshToken: number;
}

export default function MediaGallery({ refreshToken }: Props) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    setLoading(true);
    cmsRequest<{ files: MediaFile[] }>('/admin/api/media')
      .then((response) => setFiles(response.files))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [refreshToken]);

  const copy = async (file: MediaFile) => {
    await navigator.clipboard.writeText(`![${file.name}](${file.url})`);
    setCopied(file.sha);
    window.setTimeout(() => setCopied(''), 1800);
  };

  if (loading) return <section className="admin-card admin-loading">正在读取媒体库…</section>;

  return (
    <section className="admin-card">
      <div className="admin-card__header">
        <div>
          <strong>媒体库</strong>
          <p className="admin-list__meta">{files.length} 个文件</p>
        </div>
      </div>
      <div className="admin-card__body">
        {error && <div className="admin-alert admin-alert--error">{error}</div>}
        {!files.length ? (
          <div className="admin-empty">还没有图片，先上传一张吧。</div>
        ) : (
          <div className="admin-gallery">
            {files.map((file) => (
              <article className="admin-card admin-media" key={file.sha}>
                <img src={file.url} alt={file.name} loading="lazy" />
                <div className="admin-media__footer">
                  <p className="admin-media__name" title={file.name}>
                    {file.name}
                  </p>
                  <p className="admin-list__meta">{(file.size / 1024).toFixed(1)} KB</p>
                  <button
                    className="admin-button admin-button--secondary"
                    type="button"
                    style={{ width: '100%', marginTop: '0.65rem' }}
                    onClick={() => void copy(file)}
                  >
                    {copied === file.sha ? '已复制' : '复制 Markdown'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
