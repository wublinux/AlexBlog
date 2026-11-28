import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PIDAN_CONFIG,
  type PidanConfig,
  type PidanDialogues,
  type PidanPhotoCard,
} from '../../data/pet/pidan';
import { cmsRequest } from '../../lib/admin/api';

interface AvailablePetImage {
  name: string;
  image: string;
  url: string;
  size: number;
}

interface PetApiGetResponse {
  config: PidanConfig | null;
  sha: string | null;
  availableImages: AvailablePetImage[];
}

interface PetApiSaveResponse {
  success: boolean;
  config: PidanConfig;
  sha: string | null;
  commit: { sha: string; url: string };
}

interface PetApiUploadResponse {
  success: boolean;
  file: {
    name: string;
    image: string;
    url: string;
    sha: string | null;
  };
}

const LIST_DIALOGUE_META: Array<{
  key: keyof Pick<
    PidanDialogues,
    'greet' | 'pet' | 'petCombo' | 'feed' | 'sleep' | 'wake' | 'drag' | 'drop' | 'fastScroll'
  >;
  label: string;
  hint: string;
}> = [
  { key: 'greet', label: '初次见面打招呼', hint: '访客首次打开页面或唤醒皮蛋时随机说一句' },
  { key: 'pet', label: '点击撸猫反馈', hint: '单击 Q 版皮蛋撸毛时随机触发' },
  { key: 'petCombo', label: '连环撸猫彩蛋', hint: '快速连续点击皮蛋 3 次及以上触发' },
  { key: 'feed', label: '投喂小鱼干', hint: '点击悬浮菜单「🐟 投喂」时随机触发' },
  { key: 'sleep', label: '安静打盹', hint: '页面超过 26 秒无操作、皮蛋揣手睡觉时触发' },
  { key: 'wake', label: '打盹被摸醒', hint: '皮蛋睡觉时点击唤醒触发' },
  { key: 'drag', label: '拎起拖动中', hint: '按住鼠标或手指拖拽皮蛋位置时触发' },
  { key: 'drop', label: '松手稳稳落地', hint: '拖拽结束松开皮蛋落地时触发' },
  { key: 'fastScroll', label: '页面滚动过快', hint: '快速滑动页面触发飞机耳惊讶状态时说的话' },
];

const SINGLE_DIALOGUE_META: Array<{
  key: keyof Pick<
    PidanDialogues,
    | 'collarOn'
    | 'collarOff'
    | 'milestone25'
    | 'milestone50'
    | 'milestone85'
    | 'milestone100'
    | 'toReal'
    | 'toChibi'
  >;
  label: string;
}> = [
  { key: 'collarOn', label: '戴上小鱼圈饰品时' },
  { key: 'collarOff', label: '摘下小鱼圈饰品时' },
  { key: 'milestone25', label: '文章阅读进度达 25%' },
  { key: 'milestone50', label: '文章阅读进度达 50%' },
  { key: 'milestone85', label: '文章阅读进度达 85%' },
  { key: 'milestone100', label: '文章阅读进度达 100%（读完庆祝）' },
  { key: 'toReal', label: '切换到真猫卡片提示' },
  { key: 'toChibi', label: '从真猫切回 Q 版动态时' },
];

function cloneConfig(cfg: PidanConfig): PidanConfig {
  return JSON.parse(JSON.stringify(cfg)) as PidanConfig;
}

function normalizeConfigWithFallback(raw: PidanConfig | null | undefined): PidanConfig {
  if (!raw || typeof raw !== 'object') return cloneConfig(DEFAULT_PIDAN_CONFIG);
  return {
    profile: {
      name: raw.profile?.name || DEFAULT_PIDAN_CONFIG.profile.name,
      subtitle: raw.profile?.subtitle || DEFAULT_PIDAN_CONFIG.profile.subtitle,
      collarLabel: raw.profile?.collarLabel || DEFAULT_PIDAN_CONFIG.profile.collarLabel,
    },
    cards: Array.isArray(raw.cards) && raw.cards.length > 0
      ? raw.cards.map((c) => ({ ...c, enabled: c.enabled !== false }))
      : cloneConfig(DEFAULT_PIDAN_CONFIG.cards),
    dialogues: {
      ...cloneConfig(DEFAULT_PIDAN_CONFIG.dialogues),
      ...(raw.dialogues || {}),
    },
  };
}

export default function PetManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'dialogues'>('cards');
  const [config, setConfig] = useState<PidanConfig>(() => cloneConfig(DEFAULT_PIDAN_CONFIG));
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
    JSON.stringify(DEFAULT_PIDAN_CONFIG),
  );
  const [sha, setSha] = useState<string | null>(null);
  const [availableImages, setAvailableImages] = useState<AvailablePetImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Interactive cropper state for uploading new Pidan photos (uses data: URLs to satisfy strict /admin/* CSP)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});
  const [cropFileName, setCropFileName] = useState<string>('pidan');
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(config) !== savedSnapshot,
    [config, savedSnapshot],
  );

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const loadRemote = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cmsRequest<PetApiGetResponse>('/admin/api/pet');
      const normalized = normalizeConfigWithFallback(data.config);
      setConfig(normalized);
      setSavedSnapshot(JSON.stringify(normalized));
      setSha(data.sha);
      setAvailableImages(data.availableImages ?? []);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取皮蛋配置失败。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRemote();
  }, []);

  // Redraw crop preview canvas whenever focus/zoom changes
  const drawCropCanvas = () => {
    const img = cropImgRef.current;
    const canvas = cropCanvasRef.current;
    if (!img || !canvas || !img.naturalWidth || !img.naturalHeight) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outSize = 720;
    canvas.width = outSize;
    canvas.height = outSize;

    const minSide = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
    const maxLeft = Math.max(0, img.naturalWidth - minSide);
    const maxTop = Math.max(0, img.naturalHeight - minSide);
    const sx = (maxLeft * focusX) / 100;
    const sy = (maxTop * focusY) / 100;

    ctx.clearRect(0, 0, outSize, outSize);
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, outSize, outSize);
  };

  useEffect(() => {
    drawCropCanvas();
  }, [cropSourceUrl, focusX, focusY, zoom]);

  const handleChooseFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件（JPG、PNG、WebP 等）。');
      return;
    }
    const stem = file.name.replace(/\.[^.]+$/, '') || 'pidan';
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setCropFileName(stem);
      setFocusX(50);
      setFocusY(45);
      setZoom(1);
      setCropSourceUrl(reader.result);
      setError(null);
    };
    reader.onerror = () => setError('读取本地图片失败，请重试。');
    reader.readAsDataURL(file);
  };

  const cancelCrop = () => {
    setCropSourceUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmCropAndUpload = async () => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const previewDataUrl = canvas.toDataURL('image/webp', 0.86);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.86),
      );
      if (!blob) throw new Error('浏览器图片编码失败，请重试。');

      const formData = new FormData();
      formData.append('file', new File([blob], `${cropFileName}.webp`, { type: 'image/webp' }));

      const res = await cmsRequest<PetApiUploadResponse>('/admin/api/pet/upload', {
        method: 'POST',
        body: formData,
      });

      const newCardId = `card-${Date.now().toString(36)}`;
      const newCard: PidanPhotoCard = {
        id: newCardId,
        enabled: true,
        title: '皮蛋新萌照',
        badge: '日常抓拍',
        image: res.file.image,
        quote: '快来给我写一句专属台词吧～',
        caption: '请在这里填写这张照片的真实场景描述。',
      };

      setLocalPreviews((prev) => ({ ...prev, [res.file.image]: previewDataUrl }));

      setAvailableImages((prev) => [
        { name: res.file.name, image: res.file.image, url: res.file.url, size: blob.size },
        ...prev,
      ]);
      setConfig((prev) => ({
        ...prev,
        cards: [newCard, ...prev.cards],
      }));
      setSelectedIndex(0);
      cancelCrop();
      setSuccessMsg('新照片已上传到图库并插入第 1 张卡片，请核对右侧文案后点击「保存并发布上线」！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传照片失败。');
    } finally {
      setUploading(false);
    }
  };

  const updateCard = (index: number, patch: Partial<PidanPhotoCard>) => {
    setConfig((prev) => ({
      ...prev,
      cards: prev.cards.map((card, i) => (i === index ? { ...card, ...patch } : card)),
    }));
  };

  const moveCard = (from: number, to: number) => {
    if (to < 0 || to >= config.cards.length) return;
    setConfig((prev) => {
      const next = [...prev.cards];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return { ...prev, cards: next };
    });
    setSelectedIndex(to);
  };

  const removeCard = (index: number) => {
    if (config.cards.length <= 1) {
      setError('至少需要保留 1 张萌照卡片。');
      return;
    }
    const target = config.cards[index];
    if (!window.confirm(`确定要从萌照卡列表移除「${target?.title || '未命名'}」吗？`)) return;
    setConfig((prev) => {
      const next = prev.cards.filter((_, i) => i !== index);
      return { ...prev, cards: next };
    });
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, config.cards.length - 2)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await cmsRequest<PetApiSaveResponse>('/admin/api/pet', {
        method: 'PUT',
        body: JSON.stringify({ config, sha }),
      });
      const normalized = normalizeConfigWithFallback(res.config);
      setConfig(normalized);
      setSavedSnapshot(JSON.stringify(normalized));
      setSha(res.sha);
      setSuccessMsg('已保存到 GitHub（V2.0.0），Cloudflare Pages 正在自动部署上线（约 45 秒生效）！');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="admin-card admin-loading">正在读取皮蛋相册与台词配置…</div>;
  }

  const currentCard = config.cards[selectedIndex] ?? config.cards[0];
  const enabledCount = config.cards.filter((c) => c.enabled !== false).length;

  return (
    <div className="admin-stack">
      {/* Sticky Top Action Bar */}
      <div className="admin-card admin-pet-actionbar">
        <div className="admin-pet-tabs" role="tablist" aria-label="皮蛋配置分类">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cards'}
            className={`admin-button ${activeTab === 'cards' ? 'admin-button--primary' : 'admin-button--secondary'}`}
            onClick={() => setActiveTab('cards')}
          >
            📸 萌照卡片审核 ({enabledCount}/{config.cards.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dialogues'}
            className={`admin-button ${activeTab === 'dialogues' ? 'admin-button--primary' : 'admin-button--secondary'}`}
            onClick={() => setActiveTab('dialogues')}
          >
            💬 互动台词与档案
          </button>
        </div>

        <div className="admin-actions">
          <span className={`admin-pet-dirty ${isDirty ? 'is-dirty' : ''}`}>
            {isDirty ? '● 有未保存修改' : '✓ 已与线上仓库同步'}
          </span>
          {isDirty && (
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={saving}
              onClick={() => {
                setConfig(JSON.parse(savedSnapshot) as PidanConfig);
                setError(null);
              }}
            >
              撤销未保存改动
            </button>
          )}
          <button
            type="button"
            className="admin-button admin-button--primary"
            disabled={saving || !isDirty}
            onClick={() => void handleSave()}
          >
            {saving ? '正在保存发布…' : '保存并发布上线'}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="admin-alert admin-alert--success" role="status">
          {successMsg}
        </div>
      )}

      {activeTab === 'cards' ? (
        <>
          {/* Upload + Live Square Cropper Card */}
          <div className="admin-card">
            <div className="admin-card__header">
              <div>
                <strong>新增皮蛋照片</strong>
                <p className="admin-help">
                  选择原图后可直接调整正方形取景框（自动避开边角水印并压缩为高画质 WebP）。
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  hidden
                  onChange={(e) => handleChooseFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + 选择新照片裁切上传
                </button>
              </div>
            </div>

            {cropSourceUrl && (
              <div className="admin-card__body admin-pet-cropper">
                <img
                  ref={cropImgRef}
                  src={cropSourceUrl}
                  alt=""
                  hidden
                  onLoad={drawCropCanvas}
                />
                <div className="admin-pet-cropper__preview">
                  <canvas ref={cropCanvasRef} className="admin-pet-cropper__canvas" />
                </div>
                <div className="admin-stack">
                  <div className="admin-field">
                    <label htmlFor="crop-focus-y">上下取景焦点（{focusY}%）</label>
                    <input
                      id="crop-focus-y"
                      type="range"
                      min={0}
                      max={100}
                      value={focusY}
                      onChange={(e) => setFocusY(Number(e.target.value))}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="crop-focus-x">左右取景焦点（{focusX}%）</label>
                    <input
                      id="crop-focus-x"
                      type="range"
                      min={0}
                      max={100}
                      value={focusX}
                      onChange={(e) => setFocusX(Number(e.target.value))}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="crop-zoom">画面缩放（{zoom.toFixed(2)}x）</label>
                    <input
                      id="crop-zoom"
                      type="range"
                      min={1}
                      max={2.2}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                    />
                  </div>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-button admin-button--primary"
                      disabled={uploading}
                      onClick={() => void confirmCropAndUpload()}
                    >
                      {uploading ? '正在上传…' : '确认裁切并加入第 1 张'}
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      disabled={uploading}
                      onClick={cancelCrop}
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cards Master-Detail Split Grid */}
          <div className="admin-pet-layout">
            {/* Left: All Cards List */}
            <div className="admin-card">
              <div className="admin-card__header">
                <strong>全部萌照卡片（点击任意一张审核修改）</strong>
              </div>
              <ul className="admin-pet-cardlist">
                {config.cards.map((card, idx) => {
                  const selected = idx === selectedIndex;
                  const enabled = card.enabled !== false;
                  return (
                    <li
                      key={card.id}
                      className={`admin-pet-carditem ${selected ? 'is-selected' : ''} ${!enabled ? 'is-muted' : ''}`}
                    >
                      <button
                        type="button"
                        className="admin-pet-carditem__main"
                        onClick={() => setSelectedIndex(idx)}
                      >
                        <img
                          src={localPreviews[card.image] ?? `/${card.image}`}
                          alt={card.title}
                          width={56}
                          height={56}
                          loading="lazy"
                        />
                        <div className="admin-pet-carditem__info">
                          <div className="admin-pet-carditem__top">
                            <span className="admin-pet-rank">#{idx + 1}</span>
                            <strong>{card.title || '未命名'}</strong>
                            {card.badge && <span className="admin-tag">{card.badge}</span>}
                            {!enabled && <span className="admin-pet-hidden-pill">已隐藏</span>}
                          </div>
                          <p className="admin-pet-carditem__desc">
                            {card.caption || '暂无描述'}
                          </p>
                        </div>
                      </button>
                      <div className="admin-pet-carditem__btns">
                        <button
                          type="button"
                          className="admin-button admin-button--ghost"
                          disabled={idx === 0}
                          title="上移"
                          onClick={() => moveCard(idx, idx - 1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button--ghost"
                          disabled={idx === config.cards.length - 1}
                          title="下移"
                          onClick={() => moveCard(idx, idx + 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Right: Selected Card Form + 1:1 Polaroid Preview */}
            {currentCard && (
              <div className="admin-card admin-pet-inspector">
                <div className="admin-card__header">
                  <strong>
                    正在编辑第 {selectedIndex + 1} 张：{currentCard.title}
                  </strong>
                  <label className="admin-pet-toggle">
                    <input
                      type="checkbox"
                      checked={currentCard.enabled !== false}
                      onChange={(e) =>
                        updateCard(selectedIndex, { enabled: e.target.checked })
                      }
                    />
                    <span>在前台展示</span>
                  </label>
                </div>

                <div className="admin-card__body admin-stack">
                  {/* Live Polaroid Card Preview */}
                  <div className="admin-pet-polaroid-preview">
                    <div className="admin-pet-polaroid-preview__img">
                      <img
                        src={localPreviews[currentCard.image] ?? `/${currentCard.image}`}
                        alt={currentCard.title}
                      />
                      {currentCard.badge && (
                        <span className="admin-pet-polaroid-preview__badge">
                          {currentCard.badge}
                        </span>
                      )}
                    </div>
                    <h4>{currentCard.title || '（未填标题）'}</h4>
                    {currentCard.quote && (
                      <p className="admin-pet-polaroid-preview__quote">
                        「{currentCard.quote}」
                      </p>
                    )}
                    <p className="admin-pet-polaroid-preview__caption">
                      {currentCard.caption || '（未填照片描述）'}
                    </p>
                  </div>

                  <div className="admin-field-row">
                    <div className="admin-field">
                      <label htmlFor="pet-card-title">卡片标题（必填，≤40 字）</label>
                      <input
                        id="pet-card-title"
                        className="admin-input"
                        maxLength={40}
                        value={currentCard.title}
                        onChange={(e) =>
                          updateCard(selectedIndex, { title: e.target.value })
                        }
                      />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="pet-card-badge">左上角标签（可选，≤24 字）</label>
                      <input
                        id="pet-card-badge"
                        className="admin-input"
                        maxLength={24}
                        value={currentCard.badge}
                        onChange={(e) =>
                          updateCard(selectedIndex, { badge: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="admin-field">
                    <label htmlFor="pet-card-quote">皮蛋内心独白台词（可选，≤140 字）</label>
                    <input
                      id="pet-card-quote"
                      className="admin-input"
                      maxLength={140}
                      value={currentCard.quote}
                      onChange={(e) =>
                        updateCard(selectedIndex, { quote: e.target.value })
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="pet-card-caption">照片底部描述（可选，≤220 字）</label>
                    <textarea
                      id="pet-card-caption"
                      className="admin-textarea"
                      rows={3}
                      maxLength={220}
                      value={currentCard.caption}
                      onChange={(e) =>
                        updateCard(selectedIndex, { caption: e.target.value })
                      }
                    />
                  </div>

                  {availableImages.length > 0 && (
                    <div className="admin-field">
                      <label htmlFor="pet-card-image">关联卡片图片文件</label>
                      <select
                        id="pet-card-image"
                        className="admin-select"
                        value={currentCard.image}
                        onChange={(e) =>
                          updateCard(selectedIndex, { image: e.target.value })
                        }
                      >
                        {!availableImages.some((img) => img.image === currentCard.image) && (
                          <option value={currentCard.image}>{currentCard.image}</option>
                        )}
                        {availableImages.map((img) => (
                          <option key={img.image} value={img.image}>
                            {img.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      disabled={selectedIndex === 0}
                      onClick={() => moveCard(selectedIndex, 0)}
                    >
                      置顶此卡片
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--danger"
                      onClick={() => removeCard(selectedIndex)}
                    >
                      移除此卡片
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="admin-stack">
          {/* Profile Settings */}
          <div className="admin-card">
            <div className="admin-card__header">
              <strong>基础档案与饰品名称</strong>
            </div>
            <div className="admin-card__body admin-field-row">
              <div className="admin-field">
                <label htmlFor="pet-profile-name">宠物名字</label>
                <input
                  id="pet-profile-name"
                  className="admin-input"
                  maxLength={24}
                  value={config.profile.name}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, name: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="admin-field">
                <label htmlFor="pet-profile-collar">悬浮栏饰品按钮文案</label>
                <input
                  id="pet-profile-collar"
                  className="admin-input"
                  maxLength={16}
                  value={config.profile.collarLabel}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, collarLabel: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="pet-profile-sub">档案简介</label>
                <input
                  id="pet-profile-sub"
                  className="admin-input"
                  maxLength={60}
                  value={config.profile.subtitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, subtitle: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Multi-line Random Dialogue Pools */}
          <div className="admin-card">
            <div className="admin-card__header">
              <div>
                <strong>随机互动气泡词库（每行一句，至少保留 1 句）</strong>
                <p className="admin-help">直接换行即可新增或删改随机台词。</p>
              </div>
            </div>
            <div className="admin-card__body admin-stack">
              {LIST_DIALOGUE_META.map(({ key, label, hint }) => (
                <div className="admin-field" key={key}>
                  <label htmlFor={`dlg-${key}`}>{label}</label>
                  <p className="admin-help">{hint}</p>
                  <textarea
                    id={`dlg-${key}`}
                    className="admin-textarea"
                    rows={Math.max(2, config.dialogues[key].length)}
                    value={config.dialogues[key].join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      setConfig((prev) => ({
                        ...prev,
                        dialogues: {
                          ...prev.dialogues,
                          [key]: lines.length > 0 ? lines : ['喵～'],
                        },
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Single-line Fixed Milestone Dialogues */}
          <div className="admin-card">
            <div className="admin-card__header">
              <strong>专属节点与状态切换台词</strong>
            </div>
            <div className="admin-card__body admin-field-row">
              {SINGLE_DIALOGUE_META.map(({ key, label }) => (
                <div className="admin-field" key={key}>
                  <label htmlFor={`dlg-single-${key}`}>{label}</label>
                  <input
                    id={`dlg-single-${key}`}
                    className="admin-input"
                    maxLength={140}
                    value={config.dialogues[key]}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        dialogues: {
                          ...prev.dialogues,
                          [key]: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
