import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Search, Trash2, ExternalLink, Cloud, RefreshCw } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useMaterialStore } from '../store/materialStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { staggerContainer, staggerItem } from '../animations/variants';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function MaterialPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const {
    materials, searchQuery,
    isLoading, isUploading, fetchMaterials, uploadMaterial,
    deleteMaterial, setSearchQuery,
  } = useMaterialStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchMaterials();
  }, [token]);

  const filteredMaterials = materials.filter((m) => {
    const matchSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    let success = 0;

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toast(`${file.name} 超过 10MB 限制`, 'error');
        continue;
      }
      try {
        await uploadMaterial(file);
        success++;
      } catch {
        toast(`${file.name} 上传失败`, 'error');
      }
    }

    if (success > 0) {
      toast(`成功上传 ${success} 个素材`, 'success');
      fetchMaterials();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleUpload(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteMaterial(id);
      toast('素材已删除', 'info');
    } catch {
      toast('删除失败', 'error');
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <PageTransition>
      <div className="px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-crystal-900 mb-2">
                素材管理
              </h1>
              <p className="text-sm text-crystal-500">
                上传并管理你的视觉素材
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchMaterials}
                isLoading={isLoading}
              >
                刷新
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-4 h-4" />}
                isLoading={isUploading}
              >
                上传素材
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索素材名称..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent transition-all"
            />
          </div>
        </motion.div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`mb-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
            dragging
              ? 'border-gilt-400 bg-gilt-100/50 scale-[1.01]'
              : 'border-crystal-200 hover:border-gilt-300'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center py-12">
            <motion.div
              animate={dragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
              className="w-16 h-16 rounded-2xl bg-gilt-100 flex items-center justify-center mb-3"
            >
              <Cloud className={`w-8 h-8 ${dragging ? 'text-gilt-500' : 'text-crystal-500'} transition-colors`} />
            </motion.div>
            <p className="text-sm text-crystal-600 font-medium">
              {dragging ? '释放文件以上传' : '拖拽图片到此处，或点击选择'}
            </p>
            <p className="text-xs text-crystal-500 mt-1">支持 JPG, PNG, GIF, WebP — 单文件最大 10MB</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6 pt-4 border-t border-crystal-200/60 text-xs text-crystal-500">
          <span>共 {materials.length} 个素材</span>
          {searchQuery && (
            <span className="text-gilt-600">
              筛选结果: {filteredMaterials.length} 个
            </span>
          )}
        </div>

        {/* Material Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-2 border-gilt-300 border-t-gilt-500"
            />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <EmptyState
            title={materials.length === 0 ? '素材库是空的' : '没有匹配的素材'}
            description={
              materials.length === 0
                ? '上传图片素材，在内容生成时可以直接选用'
                : '尝试修改搜索条件'
            }
            action={
              materials.length === 0 ? (
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4" /> 上传第一张素材
                </Button>
              ) : undefined
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
          >
            <AnimatePresence>
              {filteredMaterials.map((m) => (
                <motion.div
                  key={m.id}
                  variants={staggerItem}
                  layout
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                >
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl card-premium overflow-hidden group cursor-pointer"
                    onClick={() => setPreviewImg(m.file_path)}
                  >
                    {/* Image preview */}
                    <div className="relative aspect-square bg-crystal-100 overflow-hidden">
                      <img
                        src={m.file_path}
                        alt={m.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23d1d5db" font-size="12">图片</text></svg>';
                        }}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                        <a
                          href={m.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2.5 rounded-xl bg-white/90 hover:bg-white transition-colors"
                          title="查看原图"
                        >
                          <ExternalLink className="w-4 h-4 text-crystal-900" />
                        </a>
                        <button
                          onClick={(e) => handleDelete(m.id, e)}
                          className="p-2.5 rounded-xl bg-white/90 hover:bg-red-50 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium text-crystal-900 truncate" title={m.name}>
                        {m.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-crystal-500">
                          {formatSize(m.file_size)}
                        </span>
                        <span className="text-[10px] text-gilt-600 font-medium px-1.5 py-0.5 rounded bg-gilt-50">
                          {m.file_type?.split('/')[1]?.toUpperCase() || 'IMG'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Preview Modal */}
        <AnimatePresence>
          {previewImg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1500] bg-black/70 flex items-center justify-center p-4"
              onClick={() => setPreviewImg(null)}
            >
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={previewImg}
                alt="素材预览"
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
