import { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

interface Tool {
  label: string;
  title: string;
  before: string;
  after?: string;
}

const TOOLS: Tool[] = [
  { label: 'B', title: '粗体', before: '**', after: '**' },
  { label: 'I', title: '斜体', before: '*', after: '*' },
  { label: 'H2', title: '二级标题', before: '\n## ', after: '\n' },
  { label: '链接', title: '插入链接', before: '[', after: '](https://)' },
  { label: '图片', title: '插入图片', before: '![图片描述](', after: ')' },
  { label: '代码', title: '代码块', before: '\n```\n', after: '\n```\n' },
  { label: '引用', title: '引用', before: '\n> ', after: '\n' },
  { label: '列表', title: '列表', before: '\n- ', after: '\n' },
];

export default function MarkdownEditor({ value, onChange }: Props) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(true);

  const insert = useCallback(
    (before: string, after = '') => {
      const element = textarea.current;
      if (!element) return;
      const start = element.selectionStart;
      const end = element.selectionEnd;
      const selection = value.slice(start, end);
      onChange(`${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`);
      window.requestAnimationFrame(() => {
        element.focus();
        element.setSelectionRange(start + before.length, start + before.length + selection.length);
      });
    },
    [onChange, value],
  );

  return (
    <section className="admin-card">
      <div className="admin-toolbar" aria-label="Markdown 工具栏">
        {TOOLS.map((tool) => (
          <button
            className="admin-button admin-button--secondary"
            type="button"
            key={tool.title}
            title={tool.title}
            onClick={() => insert(tool.before, tool.after)}
          >
            {tool.label}
          </button>
        ))}
        <span className="admin-toolbar__spacer" />
        <a className="admin-button admin-button--secondary" href="/admin/media/" target="_blank">
          媒体库
        </a>
        <button
          className="admin-button admin-button--secondary"
          type="button"
          onClick={() => setPreview((current) => !current)}
        >
          {preview ? '仅编辑' : '并排预览'}
        </button>
      </div>

      <div className={`admin-editor${preview ? '' : ' admin-editor--writing'}`}>
        <textarea
          ref={textarea}
          className="admin-editor__textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="从这里开始写 Markdown…"
          spellCheck
          aria-label="Markdown 正文"
        />
        {preview && (
          <article className="admin-preview prose">
            {value.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" rel="noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="admin-help">预览会随着正文实时更新。</p>
            )}
          </article>
        )}
      </div>
    </section>
  );
}
