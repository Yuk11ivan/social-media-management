import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Copy, ChevronDown, ChevronUp, Search } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { contentApi } from '../config/api';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import type { PlatformId } from '../types/platform';
import type { ContentItem } from '../types/content';
import { staggerContainer, staggerItem } from '../animations/variants';

export default function HistoryPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformId | 'all'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (token) fetchItems();
  }, [token]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const data = await contentApi.list(50);
      setItems(data.items as ContentItem[]);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await contentApi.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast('已删除', 'info');
    } catch {
      toast('删除失败', 'error');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast('已复制', 'success'));
  };

  const LIVE_PLATFORMS = PLATFORM_ORDER.filter(pid => PLATFORMS[pid].apiStatus === 'live');

  const filteredItems = items.filter((item) => {
    const matchSearch = !searchQuery ||
      item.original_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlatform = platformFilter === 'all' ||
      item.adapted_contents?.some((ac) => ac.platform === platformFilter);
    return matchSearch && matchPlatform;
  });

  return (
    <PageTransition>
      <div className="px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-crystal-900 mb-2">
                历史记录
              </h1>
              <p className="text-sm text-crystal-500/70">
                已保存的内容
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索内容..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setPlatformFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                platformFilter === 'all' ? 'bg-gilt-100 text-gilt-700 border border-gilt-400' : 'bg-crystal-100 text-crystal-500 hover:bg-crystal-200 border border-transparent'
              }`}
            >
              全部
            </button>
            {LIVE_PLATFORMS.map((pid) => {
              const p = PLATFORMS[pid];
              return (
                <button
                  key={pid}
                  onClick={() => setPlatformFilter(pid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    platformFilter === pid ? 'text-white' : 'bg-crystal-100 text-crystal-500 hover:bg-crystal-200'
                  }`}
                  style={platformFilter === pid ? { backgroundColor: p.color } : {}}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Items List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gilt-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? '暂无保存内容' : '无匹配记录'}
            description="生成后保存即可在此查看"
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence>
              {filteredItems.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    variants={staggerItem}
                    layout
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                  >
                    <div className="card-premium rounded-2xl p-6">
                      {/* Item header */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="w-full flex items-start justify-between gap-4 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-crystal-900 line-clamp-2 mb-2">
                            {item.original_text}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.adapted_contents?.map((ac) => (
                              <Badge key={ac.id} platform={ac.platform} size="sm" />
                            ))}
                            <span className="text-xs text-crystal-500">
                              {new Date(item.created_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-crystal-500 hover:text-red-500" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-crystal-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-crystal-500" />
                          )}
                        </div>
                      </button>

                      {/* Expanded: adapted content */}
                      <AnimatePresence>
                        {isExpanded && item.adapted_contents && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-5 pt-5 border-t border-gilt-500/15 space-y-4">
                              {item.adapted_contents.map((ac) => (
                                <div key={ac.id} className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gilt-500/10 shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge platform={ac.platform} />
                                    <button
                                      onClick={() => handleCopy(`${ac.title}\n\n${ac.content}${ac.hashtags ? '\n\n' + ac.hashtags : ''}`)}
                                      className="p-1 rounded-md hover:bg-gilt-500/10 transition-colors"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-crystal-500" />
                                    </button>
                                  </div>
                                  <h5 className="font-medium text-sm text-crystal-900 mb-1">{ac.title}</h5>
                                  <p className="text-xs text-crystal-600 line-clamp-3 whitespace-pre-wrap">
                                    {ac.content}
                                  </p>
                                  {ac.hashtags && (
                                    <p className="text-xs text-gilt-700 mt-1.5 font-medium">{ac.hashtags}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
