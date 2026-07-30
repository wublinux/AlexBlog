import type { Frontmatter } from '../../lib/admin/content';

interface Props {
  value: Frontmatter;
}

export default function SEOPreview({ value }: Props) {
  return (
    <section className="admin-card">
      <div className="admin-card__header">
        <strong>分享预览</strong>
      </div>
      <div className="admin-card__body">
        <div className="admin-seo-card">
          <div className="admin-seo-card__image">
            {value.heroImage ? <img src={value.heroImage} alt="" /> : <span>尚未设置头图</span>}
          </div>
          <div className="admin-seo-card__copy">
            <p className="admin-seo-card__host">letsgogogogogo.pp.ua</p>
            <p className="admin-seo-card__title">{value.title || '文章标题'}</p>
            <p className="admin-seo-card__description">
              {value.description || '文章描述会显示在搜索结果和社交分享卡片中。'}
            </p>
          </div>
        </div>
        <p className="admin-help" style={{ marginTop: '0.75rem' }}>
          建议标题不超过 60 字符，描述保持在 80–160 字符之间。
        </p>
      </div>
    </section>
  );
}
