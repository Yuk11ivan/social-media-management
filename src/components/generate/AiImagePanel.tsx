import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image, Sparkles, Loader2, RefreshCw, X, ChevronDown,
  ImagePlus, Check, Palette, Eye, Wand2,
} from 'lucide-react';
import Button from '../ui/Button';
import { imageApi } from '../../config/api';

interface Keywords {
  scene: string;
  style: string;
  color_tone: string;
  subject: string;
  mood: string;
  cn_prompt: string;
  negative_prompt: string;
}

interface AiImagePanelProps {
  content: string;
  title: string;
  onAddToImages?: (imageBase64: string) => void;
  existingImages?: string[];
}

export default function AiImagePanel({ content, title, onAddToImages, existingImages = [] }: AiImagePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [keywords, setKeywords] = useState<Keywords | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [editPrompt, setEditPrompt] = useState('');
  const [editNegative, setEditNegative] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [addedImages, setAddedImages] = useState<Set<string>>(new Set());

  const handleExtract = async () => {
    setIsExtracting(true);
    setExpanded(true);
    try {
      const { keywords: kw } = await imageApi.extractKeywords(content, title);
      setKeywords(kw);
      setEditPrompt(kw.cn_prompt);
      setEditNegative(kw.negative_prompt);
    } catch (err: any) {
      alert(err.message || '关键词提取失败');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!editPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const { images } = await imageApi.generate(editPrompt, editNegative);
      setGeneratedImages((prev) => [...images, ...prev]);
    } catch (err: any) {
      alert(err.message || '图片生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToImages = (img: string) => {
    if (addedImages.has(img)) return;
    onAddToImages?.(img);
    setAddedImages((prev) => new Set(prev).add(img));
  };

  const keywordTags = keywords
    ? [
        { label: '场景', value: keywords.scene, icon: '🎬', color: 'from-blue-500/10 to-blue-500/5 border-blue-200 text-blue-700' },
        { label: '风格', value: keywords.style, icon: '🎨', color: 'from-purple-500/10 to-purple-500/5 border-purple-200 text-purple-700' },
        { label: '色调', value: keywords.color_tone, icon: '🌈', color: 'from-pink-500/10 to-pink-500/5 border-pink-200 text-pink-700' },
        { label: '主体', value: keywords.subject, icon: '✨', color: 'from-amber-500/10 to-amber-500/5 border-amber-200 text-amber-700' },
        { label: '氛围', value: keywords.mood, icon: '💫', color: 'from-emerald-500/10 to-emerald-500/5 border-gilt-300 text-emerald-700' },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-fuchsia-50/30 overflow-hidden"
    >
      {/* 头部 — 始终可见 */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => keywords && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-200">
            <Wand2 className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">AI 智能配图</h3>
            <p className="text-xs text-gray-400">
              {keywords ? '已分析文案，可编辑提示词后生成' : '根据文案自动分析，一键生成配图'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!keywords && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleExtract(); }}
              isLoading={isExtracting}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {isExtracting ? '分析中...' : '开始分析'}
            </Button>
          )}
          {keywords && (
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </motion.div>
          )}
        </div>
      </div>

      {/* 展开内容 */}
      <AnimatePresence>
        {expanded && keywords && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-violet-100">
              {/* 关键词标签 */}
              <div className="flex flex-wrap gap-2 pt-4">
                {keywordTags.map((kw) => (
                  <div
                    key={kw.label}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-gradient-to-r border ${kw.color}`}
                  >
                    <span>{kw.icon}</span>
                    <span className="opacity-60">{kw.label}</span>
                    <span className="font-medium">{kw.value}</span>
                  </div>
                ))}
              </div>

              {/* 提示词编辑 */}
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Palette className="w-3.5 h-3.5" /> 生图提示词
                  </label>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-violet-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none placeholder:text-gray-300"
                    placeholder="描述你想要的画面内容..."
                  />
                  <p className="text-[10px] text-gray-400 mt-1">💡 越详细的描述，生成的图片越贴合需求</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Eye className="w-3.5 h-3.5" /> 反向提示词（选填）
                  </label>
                  <input
                    value={editNegative}
                    onChange={(e) => setEditNegative(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-violet-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder:text-gray-300"
                    placeholder="不想出现在图片中的内容..."
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 border-0 shadow-lg shadow-violet-200"
                  icon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                >
                  {isGenerating ? 'AI 创作中...' : '生成配图'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setKeywords(null);
                    setEditPrompt('');
                    setEditNegative('');
                    setExpanded(false);
                  }}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  重置
                </Button>
              </div>

              {/* 生成结果 */}
              <AnimatePresence>
                {generatedImages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        生成结果（{generatedImages.length} 张）
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {generatedImages.map((img, idx) => {
                        const isAdded = addedImages.has(img);
                        const isExisting = existingImages.includes(img);
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative group rounded-xl overflow-hidden border border-violet-100 bg-white shadow-sm"
                          >
                            <img
                              src={img}
                              alt={`生成图 ${idx + 1}`}
                              className="w-full aspect-square object-cover cursor-pointer"
                              onClick={() => setPreviewImage(img)}
                            />
                            {/* 悬浮操作 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <button
                                onClick={() => handleAddToImages(img)}
                                disabled={isAdded || isExisting}
                                className={`w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                                  isAdded || isExisting
                                    ? 'bg-gilt-1000 text-white'
                                    : 'bg-white/90 text-gray-700 hover:bg-white'
                                }`}
                              >
                                {isAdded || isExisting ? (
                                  <><Check className="w-3 h-3" /> 已添加</>
                                ) : (
                                  <><ImagePlus className="w-3 h-3" /> 添加到配图</>
                                )}
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 图片预览弹窗 */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={previewImage} alt="预览" className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => { handleAddToImages(previewImage); setPreviewImage(null); }}
                className="absolute bottom-3 right-3 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-fuchsia-600 shadow-lg"
              >
                <ImagePlus className="w-4 h-4 inline mr-1" />
                添加到配图
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
