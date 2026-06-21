import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Sparkles, Clock, ExternalLink, Eye, EyeOff } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { usePlatformStore } from '../store/platformStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import type { PlatformId } from '../types/platform';

export default function PlatformsPage() {
  const location = useLocation();
  const focusPlatform: PlatformId | null = location.pathname.endsWith('/wechat')
    ? 'wechat'
    : location.pathname.endsWith('/weibo')
      ? 'weibo'
      : null;

  const wechatRef = useRef<HTMLDivElement>(null);
  const weiboRef = useRef<HTMLDivElement>(null);
  const {
    statuses,
    fetchAllStatuses,
    bindWechat,
    testWechat,
    unbindWechat,
    bindWeibo,
    testWeibo,
    openWeiboLogin,
    unbindWeibo,
    isBinding,
    isTesting,
  } = usePlatformStore();
  const { token } = useAuthStore();
  const { toast } = useToast();

  const [showWechatModal, setShowWechatModal] = useState(false);
  const [showWeiboModal, setShowWeiboModal] = useState(false);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [wechatAccountName, setWechatAccountName] = useState('');
  const [weiboAccountName, setWeiboAccountName] = useState('');
  const [weiboProfileDir, setWeiboProfileDir] = useState('');
  const [showWeiboAdvanced, setShowWeiboAdvanced] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (token) {
      fetchAllStatuses();
    }
  }, [token]);

  useEffect(() => {
    if (!focusPlatform) return;
    const timer = window.setTimeout(() => {
      const target = focusPlatform === 'wechat' ? wechatRef.current : weiboRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [focusPlatform, statuses.wechat?.bound, statuses.weibo?.bound]);

  const handleWechatBind = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bindWechat(appId, appSecret, wechatAccountName || undefined);
      toast('微信绑定成功！', 'success');
      setShowWechatModal(false);
      setAppId('');
      setAppSecret('');
      setWechatAccountName('');
    } catch (err: any) {
      toast(err.message || '绑定失败', 'error');
    }
  };

  const handleWeiboBind = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bindWeibo(weiboAccountName || undefined, weiboProfileDir || undefined);
      toast('微博绑定成功！请打开浏览器完成登录', 'success');
      setShowWeiboModal(false);
      setWeiboAccountName('');
      setWeiboProfileDir('');
    } catch (err: any) {
      toast(err.message || '绑定失败', 'error');
    }
  };

  const handleWechatTest = async () => {
    try {
      await testWechat();
      toast('微信连接测试通过！', 'success');
    } catch (err: any) {
      toast(err.message || '连接测试失败', 'error');
    }
  };

  const handleWeiboTest = async () => {
    try {
      const result = await testWeibo();
      toast(result.message, result.success ? 'success' : 'error');
    } catch (err: any) {
      toast(err.message || '连接测试失败', 'error');
    }
  };

  const handleWeiboLogin = async () => {
    try {
      const result = await openWeiboLogin();
      toast(result.message, result.success ? 'success' : 'error');
      if (result.success) {
        setTimeout(() => fetchAllStatuses(), 3000);
      }
    } catch (err: any) {
      toast(err.message || '打开浏览器失败', 'error');
    }
  };

  const handleWechatUnbind = async () => {
    try {
      await unbindWechat();
      toast('已解绑微信公众号', 'info');
    } catch (err: any) {
      toast(err.message || '解绑失败', 'error');
    }
  };

  const handleWeiboUnbind = async () => {
    try {
      await unbindWeibo();
      toast('已解绑微博', 'info');
    } catch (err: any) {
      toast(err.message || '解绑失败', 'error');
    }
  };

  const wechatStatus = statuses.wechat;
  const weiboStatus = statuses.weibo;

  const displayOrder = focusPlatform
    ? PLATFORM_ORDER.filter((pid) => pid === focusPlatform)
    : PLATFORM_ORDER;

  const pageTitle = focusPlatform === 'wechat'
    ? '绑定微信公众号'
    : focusPlatform === 'weibo'
      ? '绑定微博账号'
      : '绑定你的社交媒体账号';

  const pageDesc = focusPlatform === 'wechat'
    ? '填写 AppID 与 AppSecret，绑定后即可推送图文到公众号草稿箱。'
    : focusPlatform === 'weibo'
      ? '通过 Chrome 登录态绑定微博，绑定后即可自动填入微博编辑器。'
      : '微信与微博已支持完整绑定与推送，绑定后即可一键生成并推送内容。';

  const renderBindActions = (pid: 'wechat' | 'weibo') => {
    const platform = PLATFORMS[pid];
    const status = pid === 'wechat' ? wechatStatus : weiboStatus;

    if (status?.bound) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-sm text-secondary">
              {status.connected ? '已连接' : pid === 'weibo' ? '待登录' : '连接异常'}
            </span>
            {status.accountName && (
              <>
                <span className="text-muted">·</span>
                <span className="text-sm font-medium">{status.accountName}</span>
              </>
            )}
          </div>
          {pid === 'weibo' && status.appId && (
            <p className="text-xs text-muted">Profile: {status.appId}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => (pid === 'wechat' ? setShowWechatModal(true) : setShowWeiboModal(true))}
            >
              修改配置
            </Button>
            <Button size="sm" variant="ghost" onClick={pid === 'wechat' ? handleWechatTest : handleWeiboTest} isLoading={isTesting}>
              测试连接
            </Button>
            {pid === 'weibo' && (
              <Button size="sm" variant="ghost" onClick={handleWeiboLogin}>
                打开浏览器登录
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={pid === 'wechat' ? handleWechatUnbind : handleWeiboUnbind}>
              解绑
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Button
        size="sm"
        variant="platform"
        platformColor={platform.color}
        onClick={() => (pid === 'wechat' ? setShowWechatModal(true) : setShowWeiboModal(true))}
      >
        {pid === 'wechat' ? '绑定公众号' : '绑定微博'}
      </Button>
    );
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">多平台管理</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-primary mb-3">
            {pageTitle}
          </h1>
          <p className="text-sm text-secondary max-w-md mx-auto">
            {pageDesc}
          </p>
          {focusPlatform && (
            <Link
              to="/platforms"
              className="inline-block mt-4 text-xs text-emerald-600 hover:text-emerald-700 underline-offset-2 hover:underline"
            >
              查看全部平台
            </Link>
          )}
        </motion.div>

        <div className={`grid grid-cols-1 ${focusPlatform ? 'max-w-xl mx-auto' : 'md:grid-cols-2'} gap-6`}>
          {displayOrder.map((pid, index) => {
            const platform = PLATFORMS[pid];
            const isLive = platform.apiStatus === 'live';
            const isMock = platform.apiStatus === 'mock';
            const isPlanned = platform.apiStatus === 'planned';
            const isFocused = focusPlatform === pid;

            return (
              <motion.div
                key={pid}
                ref={pid === 'wechat' ? wechatRef : pid === 'weibo' ? weiboRef : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  hover={isLive}
                  className={`relative overflow-hidden ${!isLive ? 'opacity-80' : ''} ${
                    isFocused ? 'ring-2 ring-offset-2 shadow-md' : ''
                  }`}
                  style={isFocused ? { outline: `2px solid ${platform.color}`, outlineOffset: '2px' } : undefined}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-heading font-bold text-lg"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon === 'MessageCircle' && 'W'}
                      {platform.icon === 'Heart' && 'R'}
                      {platform.icon === 'Music' && 'D'}
                      {platform.icon === 'AtSign' && 'Wb'}
                    </div>
                    <div>
                      <h3 className="text-lg font-heading font-semibold text-primary">
                        {platform.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isLive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> 可用
                          </span>
                        )}
                        {isMock && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                            <Clock className="w-3 h-3" /> 即将上线
                          </span>
                        )}
                        {isPlanned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                            <Clock className="w-3 h-3" /> 规划中
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-secondary mb-4">{platform.description}</p>

                  {pid === 'wechat' && (
                    <div className="border-t border-border pt-4">{renderBindActions('wechat')}</div>
                  )}

                  {pid === 'weibo' && (
                    <div className="border-t border-border pt-4">{renderBindActions('weibo')}</div>
                  )}

                  {pid !== 'wechat' && pid !== 'weibo' && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs text-muted">
                        {isMock
                          ? 'API 集成开发中，当前支持 AI 内容生成，一键推送功能即将开放。'
                          : '该平台已纳入开发计划，敬请期待。'}
                      </p>
                    </div>
                  )}

                  <div
                    className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ backgroundColor: platform.color + '15' }}
                  />
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
          >
            <Sparkles className="w-4 h-4" />
            开始内容生成
            <ExternalLink className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>

      <Modal
        isOpen={showWechatModal}
        onClose={() => setShowWechatModal(false)}
        title="绑定微信公众号"
      >
        <form onSubmit={handleWechatBind} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">AppID</label>
            <input
              type="text"
              required
              minLength={10}
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              placeholder="wx..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">AppSecret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                required
                minLength={10}
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                placeholder="••••••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showSecret ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Account ID / 名称 <span className="text-muted font-normal">（选填）</span>
            </label>
            <input
              type="text"
              value={wechatAccountName}
              onChange={(e) => setWechatAccountName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              placeholder="用于标识此账号"
            />
          </div>
          <Button type="submit" isLoading={isBinding} className="w-full">
            绑定
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={showWeiboModal}
        onClose={() => setShowWeiboModal(false)}
        title="绑定微博"
      >
        <form onSubmit={handleWeiboBind} className="space-y-4">
          <div className="text-xs text-secondary bg-red-50 border border-red-100 rounded-lg px-3 py-2 space-y-1">
            <p><strong>绑定步骤：</strong></p>
            <p>1. 填写备注（选填）→ 点击「绑定」</p>
            <p>2. 绑定成功后点击「打开浏览器登录」</p>
            <p>3. 在弹出的 Chrome 窗口登录微博，登录一次即可长期使用</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              微博昵称 / 备注 <span className="text-muted font-normal">（选填）</span>
            </label>
            <input
              type="text"
              value={weiboAccountName}
              onChange={(e) => setWeiboAccountName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              placeholder="例如：官方账号"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowWeiboAdvanced(!showWeiboAdvanced)}
            className="text-xs text-muted hover:text-secondary underline-offset-2 hover:underline"
          >
            {showWeiboAdvanced ? '收起高级选项' : '展开高级选项（一般不需要填）'}
          </button>
          {showWeiboAdvanced && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Chrome Profile 路径
              </label>
              <input
                type="text"
                value={weiboProfileDir}
                onChange={(e) => setWeiboProfileDir(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                placeholder="留空即可，系统自动创建"
              />
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Chrome Profile 是浏览器保存登录 Cookie 的独立文件夹。普通用户<strong>留空即可</strong>，系统会在
                <code className="mx-1 px-1 bg-gray-100 rounded">backend/weibo_profiles/你的用户ID</code>
                自动创建。只有当你已用 baoyu 脚本登录过微博、想复用已有登录态时，才需要填写已有 Profile 目录。
              </p>
            </div>
          )}
          <Button type="submit" isLoading={isBinding} className="w-full">
            绑定
          </Button>
        </form>
      </Modal>
    </PageTransition>
  );
}
