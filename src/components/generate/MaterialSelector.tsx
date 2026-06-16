import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Image, Check, Plus, FolderOpen } from 'lucide-react';
import { materialApi } from '../../config/api';
import { useAuthStore } from '../../store/authStore';

interface MaterialItem {
  id: number;
  name: string;
  file_path: string;
}

interface Props {
  selected: string[];           // selected base64 images
  onSelect: (base64List: string[]) => void;
  onClose: () => void;
}

export default function MaterialSelector({ selected, onSelect, onClose }: Props) {
  const { token } = useAuthStore();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    materialApi
      .list(100)
      .then((data) => {
        setMaterials((data.materials || []) as MaterialItem[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const toggleSelect = async (m: MaterialItem) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(m.id)) {
      newSet.delete(m.id);
    } else {
      newSet.add(m.id);

      // Convert image URL to base64
      try {
        const res = await fetch(m.file_path);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
          // Already added via selectedIds
        };
        reader.readAsDataURL(blob);
      } catch {
        // Fallback: use URL directly
      }
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = async () => {
    const selectedMaterials = materials.filter((m) => selectedIds.has(m.id));
    const base64List: string[] = [...selected];

    for (const m of selectedMaterials) {
      try {
        // Convert image URL to base64
        const res = await fetch(m.file_path);
        const blob = await res.blob();
        const b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        base64List.push(b64);
      } catch {
        // skip failed conversions
      }
    }

    onSelect(base64List);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1400] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-heading font-semibold">从素材库选择</h3>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-muted hover:text-secondary transition-colors"
          >
            取消
          </button>
        </div>

        {/* Grid */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12">
              <Image className="w-10 h-10 text-muted mx-auto mb-2" />
              <p className="text-sm text-secondary">素材库为空</p>
              <p className="text-xs text-muted mt-1">请先在素材管理页面上传图片</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {materials.map((m) => {
                const isSelected = selectedIds.has(m.id);
                return (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleSelect(m)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-200'
                        : 'border-border hover:border-emerald-300'
                    }`}
                  >
                    <img
                      src={m.file_path}
                      alt={m.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/></svg>';
                      }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                    <p className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 text-white text-[10px] truncate">
                      {m.name}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted">
            {selectedIds.size > 0
              ? `已选择 ${selectedIds.size} 张`
              : '点击图片选择素材'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="w-4 h-4" />
              添加到配图
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
