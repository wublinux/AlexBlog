import { useRef, useState } from 'react';
import { cmsRequest } from '../../lib/admin/api';

interface UploadedFile {
  name: string;
  url: string;
  markdown: string;
}

interface Props {
  onUploaded: (file: UploadedFile) => void;
}

export default function MediaUploader({ onUploaded }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('');

  const upload = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (!selected.length) return;
    setUploading(true);
    setMessage('');

    try {
      for (const file of selected) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await cmsRequest<{ file: UploadedFile }>('/admin/api/media/upload', {
          method: 'POST',
          body: formData,
        });
        onUploaded(response.file);
      }
      setMessage(`${selected.length} 张图片已上传并提交到 GitHub。`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : '上传失败。');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <section className="admin-card">
      <div className="admin-card__header">
        <strong>上传图片</strong>
        <span className="admin-help">JPG、PNG、GIF、WebP、AVIF · 最大 5 MB</span>
      </div>
      <div className="admin-card__body">
        <div
          className="admin-upload"
          data-dragging={dragging}
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') input.current?.click();
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void upload(event.dataTransfer.files);
          }}
        >
          <div>
            <div aria-hidden="true" style={{ fontSize: '2rem' }}>
              ↥
            </div>
            <strong>{uploading ? '正在上传…' : '拖放图片到这里'}</strong>
            <p className="admin-help">或点击选择一个或多个文件</p>
          </div>
          <input
            ref={input}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.avif,image/jpeg,image/png,image/gif,image/webp,image/avif"
            multiple
            hidden
            disabled={uploading}
            onChange={(event) => {
              if (event.target.files) void upload(event.target.files);
            }}
          />
        </div>
        {message && (
          <p className="admin-help" role="status" style={{ marginTop: '0.75rem' }}>
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
