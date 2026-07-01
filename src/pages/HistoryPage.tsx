import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Copy, ChevronDown, ChevronUp, Search,
  CheckCircle, XCircle, Clock, FileText, Send, RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/ui/PageTransition';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useHistoryStore } from '../store/historyStore';
import { useContentStore } from '../store/contentStore';
import { usePushStore } from '../store/pushStore';
import { usePlatformStore } from '../store/platformStore';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import type { PlatformId } from '../types/platform';
import type { ContentItem } from '../types/content';
import { contentItemToPendingItems, getDraftImages } from '../utils/push';
import { staggerContainer, staggerItem } from '../animations/variants';

function formatHashtags(hashtags?: string[] | string): string {
  if (!hashtags) return '';
  if (Array.isArray(hashtags)) return hashtags.join(' ');
  return hashtags;
}

function copyText(text: string, toast: (msg: string, type: 'success' | 'error' | 'info') => void) {
  navigator.clipboard.writeText(text).then(() => toast('已复制', 'success'));
}

function ImageGallery({ images, label }: { images: string[]; label?: string }) {
  if (!images.length) return null;
  return (
    <div>
      {label && <p className="text-xs font-medium text-crystal-700 mb-2">{label}</p>}
      <div className="flex gap-2 flex-wrap">
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative w-20 h-20 rounded-lg overflow-hidden border border-crystal-200 bg-crystal-50 shrink-0"
          >
            <img src={src} alt={`配图 ${i + 1}`} className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute top-1 left-1 px-1 py-0.5 text-[10px] bg-black/50 text-white rounded">
                封面
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const { loadDraft } = useContentStore();
  const { setPendingItems } = usePushStore();
  const { statuses, fetchAllStatuses } = usePlatformStore();

  const {
    contentItems, pushLogs, contentTotal, isLoading, error,
    platformTab, fetchHistory, deleteContent, setPlatformTab,
  } = useHistoryStore();

  const handleRestore = async (item: ContentItem) => {
    try {
      await loadDraft(item);
      toast('草稿已恢复，可继续编辑或推送', 'success');
      navigate('/generate');
    } catch {
      toast('恢复草稿失败', 'error');
    }
  };

  const handlePush = (item: ContentItem) => {
    if (!token) {
      toast('请先登录', 'error');
      return;
    }
    const pending = contentItemToPendingItems(item);
    if (pending.length === 0) {
      toast('该记录没有可推送的内容', 'error');
      return;
    }
    const hasWechat = pending.some((p) => p.platform === 'wechat');
    const hasWeibo = pending.some((p) => p.platform === 'weibo');
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
    setPendingItems(pending);
    toast('已加入待推送列表', 'success');
    navigate('/push');
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'content' | 'push'>('content');

  useEffect(() => {
    if (token) {
      fetchHistory(platformTab);
      fetchAllStatuses();
    }
  }, [token]);

  const LIVE_PLATFORMS = PLATFORM_ORDER.filter((pid) => PLATFORMS[pid].apiStatus === 'live');

  const filteredContent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contentItems.filter((item) => {
      if (!q) return true;
      const inOriginal = item.original_text.toLowerCase().includes(q);
      const inAdapted = item.adapted_contents?.some(
        (ac) => ac.title.toLowerCase().includes(q) || ac.content.toLowerCase().includes(q),
      );
      return inOriginal || inAdapted;
    });
  }, [contentItems, searchQuery]);

  const filteredPushLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pushLogs.filter((log) => {
      if (!q) return true;
      return (
        (log.message || '').toLowerCase().includes(q) ||
        log.platform_name.toLowerCase().includes(q)
      );
    });
  }, [pushLogs, searchQuery]);

  const handleDelete = async (id: string) => {
    const ok = await deleteContent(id);
    toast(ok ? '已删除' : '删除失败', ok ? 'info' : 'error');
  };

  const platformCount = (pid: PlatformId) =>
    contentItems.filter((i) => i.adapted_contents?.some((ac) => ac.platform === pid)).length;

  if (!token) {
    return (
      <PageTransition>
        <div className="px-6 py-16 text-center">
          <h1 className="text-2xl font-heading font-bold text-crystal-900 mb-3">历史记录</h1>
          <p className="text-sm text-crystal-500 mb-6">登录后可查看各平台的生成与推送记录</p>
          <Button onClick={() => navigate('/account')}>去登录</Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="px-6 py-8 max-w-[1100px]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-crystal-900 mb-2">历史记录</h1>
          <p className="text-sm text-crystal-500">
            草稿箱：自动保存每次生成的原文、配图与各平台文案，可随时恢复继续编辑
          </p>
        </motion.div>

        {/* Platform tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setPlatformTab('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              platformTab === 'all'
                ? 'bg-gilt-100 text-gilt-800 border border-gilt-400'
                : 'bg-white text-crystal-600 border border-crystal-200 hover:bg-crystal-50'
            }`}
          >
            全部平台
            <span className="ml-1.5 text-xs opacity-70">({contentTotal})</span>
          </button>
          {LIVE_PLATFORMS.map((pid) => {
            const p = PLATFORMS[pid];
            const active = platformTab === pid;
            return (
              <button
                key={pid}
                onClick={() => setPlatformTab(pid)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  active ? 'text-white border-transparent' : 'bg-white text-crystal-600 border-crystal-200 hover:bg-crystal-50'
                }`}
                style={active ? { backgroundColor: p.color } : {}}
              >
                {p.name}
                <span className="ml-1.5 text-xs opacity-80">
                  ({platformTab === pid || platformTab === 'all' ? platformCount(pid) : '…'})
                </span>
              </button>
            );
          })}
        </div>

        {/* Section tabs + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-1 p-1 bg-crystal-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveSection('content')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'content' ? 'bg-white text-crystal-900 shadow-sm' : 'text-crystal-500'
              }`}
            >
              <FileText className="w-4 h-4" />生成记录
            </button>
            <button
              onClick={() => setActiveSection('push')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'push' ? 'bg-white text-crystal-900 shadow-sm' : 'text-crystal-500'
              }`}
            >
              <Send className="w-4 h-4" />推送记录
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题、正文或推送消息..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchHistory(platformTab)}>
            刷新
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-gilt-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeSection === 'content' ? (
          filteredContent.length === 0 ? (
            <EmptyState
              title="暂无生成记录"
              description="在内容生成页生成后，点击「保存到历史」即可保存草稿"
            />
          ) : (
            <ContentList
              items={filteredContent}
              platformTab={platformTab}
              expandedId={expandedId}
              onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              onDelete={handleDelete}
              onCopy={(text) => copyText(text, toast)}
              onRestore={handleRestore}
              onPush={handlePush}
            />
          )
        ) : filteredPushLogs.length === 0 ? (
          <EmptyState
            title="暂无推送记录"
            description="在推送发布页执行推送后，成功/失败记录会保存在此"
          />
        ) : (
          <PushLogList logs={filteredPushLogs} platformTab={platformTab} />
        )}
      </div>
    </PageTransition>
  );
}

function ContentList({
  items, platformTab, expandedId, onToggleExpand, onDelete, onCopy, onRestore, onPush,
}: {
  items: ContentItem[];
  platformTab: PlatformId | 'all';
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
  onRestore: (item: ContentItem) => void;
  onPush: (item: ContentItem) => void;
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      {items.map((item) => {
        const adapted = platformTab === 'all'
          ? (item.adapted_contents || [])
          : (item.adapted_contents || []).filter((ac) => ac.platform === platformTab);
        if (adapted.length === 0) return null;
        const isExpanded = expandedId === item.id;
        const draftImages = getDraftImages(item);
        const thumb = draftImages[0];

        return (
          <motion.div key={item.id} variants={staggerItem} layout>
            <div className="card-premium rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                {thumb && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-crystal-200 shrink-0">
                    <img src={thumb} alt="封面" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleExpand(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleExpand(item.id);
                    }
                  }}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <div className="text-sm font-medium text-crystal-900 line-clamp-2 mb-2">
                    {adapted[0]?.title || item.original_text}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {adapted.map((ac) => (
                      <Badge key={ac.id} platform={ac.platform} size="sm" />
                    ))}
                    <span className="text-xs text-crystal-500">
                      {new Date(item.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPush(item)}
                    className="p-1.5 rounded-lg hover:bg-gilt-50"
                    aria-label="推送"
                    title="推送到平台"
                  >
                    <Send className="w-4 h-4 text-gilt-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRestore(item)}
                    className="p-1.5 rounded-lg hover:bg-gilt-50"
                    aria-label="恢复草稿"
                    title="恢复草稿"
                  >
                    <RotateCcw className="w-4 h-4 text-gilt-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                    aria-label="删除记录"
                  >
                    <Trash2 className="w-4 h-4 text-crystal-500 hover:text-red-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleExpand(item.id)}
                    className="p-1.5 rounded-lg hover:bg-crystal-100"
                    aria-label={isExpanded ? '收起' : '展开'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-crystal-500" /> : <ChevronDown className="w-4 h-4 text-crystal-500" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-gilt-500/15 space-y-4">
                      <ImageGallery images={draftImages} label={`原文配图（${draftImages.length} 张）`} />
                      <div className="text-xs text-crystal-600 whitespace-pre-wrap bg-crystal-50 rounded-xl p-3 border border-crystal-100">
                        <span className="font-medium text-crystal-700 block mb-1">原文</span>
                        {item.original_text}
                      </div>
                      {adapted.map((ac) => (
                        <div key={ac.id} className="p-4 rounded-xl bg-white/70 border border-crystal-200">
                          <div className="flex items-center justify-between mb-2">
                            <Badge platform={ac.platform} />
                            <button
                              type="button"
                              onClick={() => onCopy(`${ac.title}\n\n${ac.content}\n\n${formatHashtags(ac.hashtags)}`)}
                              className="p-1 rounded-md hover:bg-gilt-500/10"
                            >
                              <Copy className="w-3.5 h-3.5 text-crystal-500" />
                            </button>
                          </div>
                          {ac.images && ac.images.length > 0 && (
                            <ImageGallery images={ac.images} label="平台配图" />
                          )}
                          <h5 className="font-medium text-sm text-crystal-900 mb-1 mt-2">{ac.title}</h5>
                          <p className="text-xs text-crystal-600 whitespace-pre-wrap">{ac.content}</p>
                          {formatHashtags(ac.hashtags) && (
                            <p className="text-xs text-gilt-700 mt-1.5 font-medium">{formatHashtags(ac.hashtags)}</p>
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
    </motion.div>
  );
}

function PushLogList({ logs, platformTab }: { logs: import('../types/push').PushLog[]; platformTab: PlatformId | 'all' }) {
  const filtered = platformTab === 'all' ? logs : logs.filter((l) => l.platform === platformTab);

  return (
    <div className="space-y-2">
      {filtered.map((log) => (
        <div key={log.id} className="flex items-start gap-3 p-4 rounded-xl bg-white/70 border border-crystal-200">
          <div className="pt-0.5">
            {log.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {log.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
            {log.status === 'pending' && <Clock className="w-4 h-4 text-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge platform={log.platform} size="sm" />
              <span className={`text-xs font-medium ${
                log.status === 'success' ? 'text-green-600' : log.status === 'failed' ? 'text-red-600' : 'text-amber-600'
              }`}>
                {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '进行中'}
              </span>
              <span className="text-xs text-crystal-500">
                {new Date(log.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <p className="text-sm text-crystal-700">{log.message || '无详情'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
