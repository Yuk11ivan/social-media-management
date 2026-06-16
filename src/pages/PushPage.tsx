import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { usePushStore } from '../store/pushStore';
import { useAuthStore } from '../store/authStore';
import { usePlatformStore } from '../store/platformStore';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import type { PlatformId } from '../types/platform';
import { staggerContainer, staggerItem } from '../animations/variants';

export default function PushPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const {
    pendingItems, logs, isPushing, isLoadingLogs,
    activePlatformTab, pushContent, fetchLogs,
    setActivePlatformTab, clearPending,
  } = usePushStore();
  const { statuses, fetchWechatStatus } = usePlatformStore();

  useEffect(() => {
    if (token) {
      fetchLogs();
      fetchWechatStatus();
    }
  }, [token]);

  const handlePush = async (platform: PlatformId, item: typeof pendingItems[0]) => {
    // Check binding for wechat
    if (platform === 'wechat' && !statuses.wechat?.bound) {
      toast('请先绑定微信公众号', 'error');
      navigate('/platforms');
      return;
    }
    const success = await pushContent(platform, item);
    if (success) {
      toast(`已推送到${item.platform_name}`, 'success');
    } else {
      toast(`推送失败`, 'error');
    }
  };

  const filteredLogs = activePlatformTab === 'all'
    ? logs
    : logs.filter(l => l.platform === activePlatformTab);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-emerald-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-amber-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-primary mb-2">
                推送管理
              </h1>
              <p className="text-sm text-secondary">
                管理待推送内容，查看各平台推送日志
              </p>
            </div>
            {pendingItems.length > 0 && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={clearPending}>
                  清空列表
                </Button>
                <Button
                  onClick={() => navigate('/generate')}
                  icon={<Send className="w-4 h-4" />}
                >
                  去生成内容
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pending Items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-lg font-heading font-semibold text-primary mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-500" />
            待推送
            {pendingItems.length > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {pendingItems.length}
              </span>
            )}
          </h2>

          {pendingItems.length === 0 ? (
            <Card>
              <EmptyState
                title="没有待推送的内容"
                description="前往内容生成页面，AI生成内容后可添加到这里"
                action={
                  <Button size="sm" onClick={() => navigate('/generate')}>
                    去生成
                  </Button>
                }
              />
            </Card>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
              {pendingItems.map((item, idx) => (
                <motion.div key={`${item.platform}-${idx}`} variants={staggerItem}>
                  <Card hover className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge platform={item.platform} />
                      </div>
                      <h4 className="font-medium text-primary truncate">{item.title}</h4>
                      <p className="text-xs text-muted truncate mt-0.5">
                        {item.content.slice(0, 80)}...
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="platform"
                      platformColor={PLATFORMS[item.platform].color}
                      onClick={() => handlePush(item.platform, item)}
                      isLoading={isPushing}
                      icon={<Send className="w-3.5 h-3.5" />}
                    >
                      推送
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Push Logs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-heading font-semibold text-primary flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
              推送日志
            </h2>
            <div className="flex gap-1.5">
              <button
                onClick={() => setActivePlatformTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activePlatformTab === 'all'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-muted hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              {PLATFORM_ORDER.map((pid) => {
                const p = PLATFORMS[pid];
                return (
                  <button
                    key={pid}
                    onClick={() => setActivePlatformTab(pid)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activePlatformTab === pid
                        ? 'text-white'
                        : 'bg-gray-100 text-muted hover:bg-gray-200'
                    }`}
                    style={activePlatformTab === pid ? { backgroundColor: p.color } : {}}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <Card>
              <EmptyState
                title="暂无推送日志"
                description="完成一次推送后，日志将显示在这里"
              />
            </Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-white border border-border hover:shadow-sm transition-shadow"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusColor(log.status)} animate-pulse`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge platform={log.platform} />
                        <span className="text-xs text-muted">
                          {new Date(log.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {log.message && (
                        <p className="text-xs text-secondary mt-1 truncate">{log.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(log.status)}
                      <span className="text-xs capitalize font-medium">
                        {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '处理中'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}
