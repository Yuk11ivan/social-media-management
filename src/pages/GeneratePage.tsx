import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Copy, Save, X, Check, AlertCircle,
  Wand2, ImagePlus, Layers, FolderOpen
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import MaterialSelector from '../components/generate/MaterialSelector';
import AiImagePanel from '../components/generate/AiImagePanel';
import { useAuthStore } from '../store/authStore';
import { useContentStore } from '../store/contentStore';
import { usePlatformStore } from '../store/platformStore';
import { usePushStore } from '../store/pushStore';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import type { PlatformId } from '../types/platform';
import { staggerContainer, staggerItem } from '../animations/variants';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 9;

export default function GeneratePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const {
    inputText, inputImages, selectedPlatforms, results,
    isGenerating, error, setInputText,
    addImage, removeImage, clearImages,
    togglePlatform, generate, saveContent, reset, clearError,
  } = useContentStore();
  const { statuses, fetchAllStatuses } = usePlatformStore();
  const { setPendingItems } = usePushStore();

  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      fetchAllStatuses();
    }
  }, [token]);

  const checkAuth = () => {
    if (!token) {
      setShowAuthPrompt(true);
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!checkAuth()) return;
    clearError();
    await generate();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (inputImages.length >= MAX_IMAGES) {
        toast(`最多上传 ${MAX_IMAGES} 张图片`, 'error');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast(`${file.name} 超过 5MB 限制`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => addImage(reader.result as string);
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopy = (index: number) => {
    const r = results[index];
    const text = `${r.title}\n\n${r.content}${r.hashtags ? '\n\n' + r.hashtags : ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(index);
      toast('已复制到剪贴板', 'success');
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const handleSave = async () => {
    if (!checkAuth()) return;
    const id = await saveContent();
    if (id) {
      toast('已保存到历史记录', 'success');
    } else {
      toast('保存失败', 'error');
    }
  };

  const handlePush = () => {
    if (!checkAuth()) return;
    const hasWechat = results.some(r => r.platform === 'wechat');
    const hasWeibo = results.some(r => r.platform === 'weibo');
    if (hasWechat && !statuses.wechat?.bound) {
      toast('请先绑定微信公众号', 'error');
      navigate('/platforms/wechat');
      return;
    }
    if (hasWeibo && !statuses.weibo?.bound) {
      toast('请先绑定微博账号', 'error');
      navigate('/platforms/weibo');
      return;
    }
    setPendingItems(results.map(r => ({
      ...r,
      platform: r.platform as PlatformId,
    })));
    navigate('/push');
  };

  const handleReset = () => {
    reset();
    setShowAuthPrompt(false);
  };

  const charCount = inputText.length;
  const groupedResults = PLATFORM_ORDER
    .filter(pid => selectedPlatforms.includes(pid))
    .filter(pid => results.some(r => r.platform === pid));

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-4">
            <Wand2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">AI 智能生成</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-primary mb-3">
            内容创作
          </h1>
          <p className="text-sm text-secondary max-w-lg mx-auto">
            输入原始文案并上传配图，AI 自动为各平台生成风格适配的发布内容
          </p>
          {/* Model hint */}
          <p className="text-xs text-muted mt-2">
            🤖 双模型驱动：DeepSeek + 百炼千问，自动按任务复杂度选择最优模型
          </p>
        </motion.div>

        {/* Auth prompt */}
        <AnimatePresence>
          {showAuthPrompt && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-lg mx-auto mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800">请先登录后再使用 AI 生成功能</span>
              </div>
              <Link
                to="/account"
                className="text-sm font-medium text-amber-700 hover:text-amber-800 underline"
              >
                去登录
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Input Area */}
          <div className="lg:col-span-1 space-y-5">
            {/* Platform selector */}
            <Card>
              <h3 className="text-sm font-heading font-semibold text-primary mb-3">
                📱 选择发布平台
              </h3>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_ORDER.map((pid) => {
                  const p = PLATFORMS[pid];
                  const isSelected = selectedPlatforms.includes(pid);
                  return (
                    <motion.button
                      key={pid}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => togglePlatform(pid)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                        isSelected
                          ? 'text-white shadow-sm'
                          : 'bg-gray-50 text-muted hover:bg-gray-100 border border-border'
                      }`}
                      style={isSelected ? { backgroundColor: p.color } : {}}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                      {p.name}
                    </motion.button>
                  );
                })}
              </div>
            </Card>

            {/* Text input */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-heading font-semibold text-primary">✏️ 文案内容</h3>
                <motion.span
                  className={`text-xs font-mono ${
                    charCount > 0 ? 'text-emerald-500' : 'text-muted'
                  }`}
                  animate={{ scale: charCount > 0 ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  key={charCount > 0 ? 'active' : 'idle'}
                >
                  {charCount} 字
                </motion.span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="输入你想发布的内容...&#10;&#10;AI 会自动为每个平台生成适配的：&#10;• 吸引人的标题&#10;• 风格适配的正文&#10;• 热门话题标签&#10;• 配图位置建议"
                rows={10}
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm text-primary placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
              />
            </Card>

            {/* Multi-image upload */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-heading font-semibold text-primary">
                  🖼️ 配图 <span className="text-muted font-normal text-xs">({inputImages.length}/{MAX_IMAGES})</span>
                </h3>
                {inputImages.length > 0 && (
                  <button
                    onClick={clearImages}
                    className="text-xs text-muted hover:text-red-500 transition-colors"
                  >
                    清空全部
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Image preview gallery */}
              {inputImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <AnimatePresence>
                    {inputImages.map((img, idx) => (
                      <motion.div
                        key={`${idx}-${img.slice(0, 20)}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                      >
                        <img
                          src={img}
                          alt={`配图 ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Cover badge for first image */}
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-white">
                            封面
                          </span>
                        )}
                        {/* Delete button */}
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {inputImages.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-4 rounded-xl border-2 border-dashed border-border hover:border-emerald-400 transition-all flex flex-col items-center gap-1 text-muted hover:text-emerald-500 group"
                  >
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ImagePlus className="w-6 h-6" />
                    </motion.div>
                    <span className="text-xs">本地上传</span>
                  </button>
                )}
                {inputImages.length < MAX_IMAGES && (
                  <button
                    onClick={() => setShowMaterialSelector(true)}
                    className="flex-1 py-4 rounded-xl border-2 border-dashed border-border hover:border-emerald-400 transition-all flex flex-col items-center gap-1 text-muted hover:text-emerald-500 group"
                  >
                    <FolderOpen className="w-6 h-6" />
                    <span className="text-xs">素材库选择</span>
                  </button>
                )}
              </div>
              <p className="text-center text-[11px] text-muted">
                支持 JPG/PNG/GIF/WebP，最大 5MB/张
              </p>
            </Card>

            {/* Generate button */}
            <Button
              size="lg"
              onClick={handleGenerate}
              isLoading={isGenerating}
              className="w-full"
              icon={!isGenerating ? <Sparkles className="w-4 h-4" /> : undefined}
            >
              {isGenerating ? 'AI 正在生成...' : '✨ AI 智能生成'}
            </Button>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3"
              >
                {error}
              </motion.p>
            )}

            {(inputText || results.length > 0 || inputImages.length > 0) && (
              <button
                onClick={handleReset}
                className="w-full text-sm text-muted hover:text-secondary transition-colors py-2"
              >
                重置全部
              </button>
            )}
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            {results.length === 0 && !isGenerating ? (
              <EmptyState
                title="AI 生成结果将显示在这里"
                description="输入你的原始文案，选择目标平台，上传配图，点击「AI 智能生成」试试吧"
                action={
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {PLATFORM_ORDER.map((pid) => {
                      const p = PLATFORMS[pid];
                      return (
                        <span
                          key={pid}
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: p.color + '15', color: p.color }}
                        >
                          {p.name}: {p.contentStyle}
                        </span>
                      );
                    })}
                  </div>
                }
              />
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 rounded-full border-2 border-emerald-200 border-t-emerald-500 mb-6"
                />
                <p className="text-sm text-secondary">AI 正在为各平台生成适配内容...</p>
                <p className="text-xs text-muted mt-2">
                  {inputImages.length > 0 ? `包含 ${inputImages.length} 张配图分析，请稍候` : '这可能需要几秒钟'}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedResults.map((pid) => {
                  const platform = PLATFORMS[pid];
                  const platformResults = results.filter(r => r.platform === pid);
                  return (
                    <motion.div
                      key={pid}
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                    >
                      {/* Platform header */}
                      <div className="flex items-center gap-3 mb-4">
                        <Badge platform={pid} size="md" />
                        <span className="text-xs text-muted">
                          {platform.contentStyle}
                        </span>
                      </div>

                      {platformResults.map((result, idx) => {
                        const globalIdx = results.indexOf(result);
                        const hasMultiImg = result.images && result.images.length > 1;
                        return (
                          <motion.div key={`${pid}-${idx}`} variants={staggerItem}>
                            <Card className="overflow-hidden">
                              {/* Card header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h4 className="font-heading font-semibold text-primary mb-1">
                                    {result.title}
                                  </h4>
                                </div>
                                <Badge platform={pid} />
                              </div>

                              {/* Content with markdown-style renders */}
                              <div className="prose prose-sm max-w-none mb-4">
                                <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                                  {result.content}
                                </p>
                              </div>

                              {/* Image indicators */}
                              {result.images && result.images.length > 0 && (
                                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                                  <Layers className="w-4 h-4 text-muted" />
                                  <span className="text-xs text-secondary">
                                    含 {result.images.length} 张配图（封面 + {hasMultiImg ? `${result.images.length - 1} 张正文插图` : '正文'}）
                                  </span>
                                </div>
                              )}

                              {/* Hashtags */}
                              {result.hashtags && (
                                <div className="mb-4 p-3 rounded-xl bg-gray-50">
                                  <p className="text-sm text-accent-dark font-medium">
                                    {result.hashtags}
                                  </p>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-3 border-t border-border">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon={copiedIdx === globalIdx ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  onClick={() => handleCopy(globalIdx)}
                                >
                                  {copiedIdx === globalIdx ? '已复制' : '复制'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={<Save className="w-3.5 h-3.5" />}
                                  onClick={handleSave}
                                >
                                  保存
                                </Button>
                                <div className="flex-1" />
                                <Button
                                  size="sm"
                                  variant="platform"
                                  platformColor={platform.color}
                                  icon={<Send className="w-3.5 h-3.5" />}
                                  onClick={handlePush}
                                >
                                  推送到{platform.name}
                                </Button>
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  );
                })}

                {/* AI 配图 */}
                {results.length > 0 && (
                  <AiImagePanel
                    content={results[0]?.content || inputText}
                    title={results[0]?.title || ''}
                    existingImages={inputImages}
                    onAddToImages={(img) => {
                      addImage(img);
                      toast('已添加到配图', 'success');
                    }}
                  />
                )}

                {/* Batch actions */}
                {results.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex gap-3 justify-center pt-4"
                  >
                    <Button variant="secondary" onClick={handleSave}>
                      <Save className="w-4 h-4" /> 保存全部
                    </Button>
                    <Button onClick={handlePush}>
                      <Send className="w-4 h-4" /> 推送全部
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Material Selector Modal */}
      <AnimatePresence>
        {showMaterialSelector && (
          <MaterialSelector
            selected={inputImages}
            onSelect={(images) => {
              images.forEach((img) => addImage(img));
            }}
            onClose={() => setShowMaterialSelector(false)}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
