import { useEffect } from 'react';
import { Send, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import PushButton from '../components/ui/PushButton';
import { usePushStore } from '../store/pushStore';
import { useAuthStore } from '../store/authStore';
import { usePlatformStore } from '../store/platformStore';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import type { PlatformId } from '../types/platform';

export default function PushPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { toast } = useToast();
  const {
    pendingItems, logs, isPushing, pushingKey, pushProgress, isLoadingLogs,
    activePlatformTab, pushContent, fetchLogs,
    setActivePlatformTab, clearPending,
  } = usePushStore();
  const { statuses, fetchAllStatuses } = usePlatformStore();

  useEffect(() => {
    if (token) { fetchLogs(); fetchAllStatuses(); }
  }, [token]);

  const handlePush = async (platform: PlatformId, item: typeof pendingItems[0]) => {
    if (platform === 'wechat' && !statuses.wechat?.bound) { toast('请先绑定微信公众号', 'error'); navigate('/platforms/wechat'); return; }
    if (platform === 'weibo' && !statuses.weibo?.bound) { toast('请先绑定微博账号', 'error'); navigate('/platforms/weibo'); return; }
    try { await pushContent(platform, item); toast(`已推送到${item.platform_name}`, 'success'); }
    catch (err: any) { toast(err.message || '推送失败', 'error'); }
  };

  const filteredLogs = activePlatformTab === 'all' ? logs : logs.filter(l => l.platform === activePlatformTab);
  const LIVE_PLATFORMS = PLATFORM_ORDER.filter(pid => PLATFORMS[pid].apiStatus === 'live');

  const statusIcon = (s: string) => {
    if (s === 'success') return <CheckCircle className="w-4 h-4 text-gilt-500" />;
    if (s === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    if (s === 'pending') return <Clock className="w-4 h-4 text-amber-500" />;
    return <AlertCircle className="w-4 h-4 text-crystal-500" />;
  };

  return (
    <PageTransition>
      <div className="px-6 py-8 max-w-[1200px]">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-heading font-bold text-crystal-900">推送管理</h1>
            <p className="text-sm text-crystal-500 mt-0.5">待推送管理 &middot; 推送日志</p>
          </div>
          {pendingItems.length > 0 && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={clearPending}>清空列表</Button>
              <Button size="sm" onClick={() => navigate('/generate')} icon={<Send className="w-4 h-4" />}>生成内容</Button>
            </div>
          )}
        </div>

        {/* Pending Items */}
        <div className="mb-10">
          <h2 className="text-lg font-heading font-semibold text-crystal-900 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-gilt-500" />待推送
            {pendingItems.length > 0 && <span className="text-xs bg-gilt-100 text-gilt-700 px-2 py-0.5 rounded-full">{pendingItems.length}</span>}
          </h2>

          {pendingItems.length === 0 ? (
            <div className="rounded-2xl border border-crystal-200 glass-card p-12 text-center">
              <p className="text-sm text-crystal-500 mb-3">暂无待推送内容</p>
              <p className="text-xs text-crystal-400 mb-4">AI 生成内容后添加至此</p>
              <Button size="sm" onClick={() => navigate('/generate')}>生成内容</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div key={`${item.platform}-${item.title}`}
                  className="rounded-2xl border border-crystal-200 glass-card p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge platform={item.platform} />
                      {pushingKey === `${item.platform}-${item.title}` && <span className="text-xs text-gilt-600 font-medium animate-pulse">推送中...</span>}
                    </div>
                    <h4 className="font-medium text-crystal-900 text-sm truncate">{item.title}</h4>
                    <p className="text-xs text-crystal-500 truncate mt-0.5">{item.content?.slice(0, 80) || ''}{item.content?.length > 80 ? '...' : ''}</p>
                  </div>
                  <div className="shrink-0">
                    <PushButton
                      platformColor={PLATFORMS[item.platform].color}
                      isPushing={pushingKey === `${item.platform}-${item.title}`}
                      isDisabled={isPushing && pushingKey !== `${item.platform}-${item.title}`}
                      progress={pushingKey === `${item.platform}-${item.title}` ? pushProgress : 0}
                      onClick={() => handlePush(item.platform, item)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Push Logs */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-heading font-semibold text-crystal-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-gilt-500" />推送日志
            </h2>
            <div className="flex gap-1.5">
              <button onClick={() => setActivePlatformTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${activePlatformTab === 'all' ? 'bg-gilt-100 text-gilt-700 border-gilt-400' : 'bg-crystal-100 text-crystal-500 border-transparent hover:bg-crystal-200'}`}>全部</button>
              {LIVE_PLATFORMS.map(pid => {
                const p = PLATFORMS[pid];
                const active = activePlatformTab === pid;
                return <button key={pid} onClick={() => setActivePlatformTab(pid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${active ? 'text-white' : 'bg-crystal-100 text-crystal-500 hover:bg-crystal-200'}`}
                  style={active ? { backgroundColor: p.color } : {}}>{p.name}</button>;
              })}
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-gilt-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-2xl border border-crystal-200 glass-card p-12 text-center">
              <p className="text-sm text-crystal-500">暂无推送日志</p>
              <p className="text-xs text-crystal-400 mt-1">推送后记录显示在此</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map(log => (
                <div key={log.id} className="rounded-xl border border-crystal-200 glass-card px-5 py-3.5 flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-gilt-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge platform={log.platform} />
                      <span className="text-xs text-crystal-500">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                    {log.message && <p className="text-xs text-crystal-600 mt-1 truncate">{log.message}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {statusIcon(log.status)}
                    <span className="text-xs font-medium text-crystal-600">{log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '处理中'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageTransition>
  );
}
