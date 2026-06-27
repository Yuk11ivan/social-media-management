import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Sparkles, Clock, Eye, EyeOff } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { usePlatformStore } from '../store/platformStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import type { PlatformId } from '../types/platform';

export default function PlatformsPage() {
  const location = useLocation();
  const focusPlatform: PlatformId | null =
    location.pathname.endsWith('/wechat') ? 'wechat'
    : location.pathname.endsWith('/weibo') ? 'weibo'
    : location.pathname.endsWith('/xiaohongshu') ? 'xiaohongshu'
    : null;

  const wechatRef = useRef<HTMLDivElement>(null);
  const weiboRef = useRef<HTMLDivElement>(null);
  const xhsRef = useRef<HTMLDivElement>(null);

  const {
    statuses, fetchAllStatuses,
    bindWechat, testWechat, unbindWechat,
    bindWeibo, testWeibo, openWeiboLogin, unbindWeibo,
    bindXiaohongshu, testXiaohongshu, openXiaohongshuLogin, unbindXiaohongshu,
    isBinding, isTesting,
  } = usePlatformStore();
  const { token } = useAuthStore();
  const { toast } = useToast();

  // ---- modal state ----
  const [modal, setModal] = useState<'wechat' | 'weibo' | 'xiaohongshu' | null>(null);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  // shared fields for weibo/xhs
  const [accountName, setAccountName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [profileDir, setProfileDir] = useState('');

  useEffect(() => { if (token) fetchAllStatuses(); }, [token]);

  // scroll to focused platform
  useEffect(() => {
    if (!focusPlatform) return;
    const t = window.setTimeout(() => {
      const el = focusPlatform === 'wechat' ? wechatRef.current
        : focusPlatform === 'weibo' ? weiboRef.current : xhsRef.current;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(t);
  }, [focusPlatform, statuses.wechat?.bound, statuses.weibo?.bound, statuses.xiaohongshu?.bound]);

  // ---- handlers ----
  const openModal = (p: 'wechat' | 'weibo' | 'xiaohongshu') => {
    setAccountName('');
    setProfileDir('');
    setShowAdvanced(false);
    if (p === 'wechat') { setAppId(''); setAppSecret(''); }
    setModal(p);
  };

  const handleWechatBind = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bindWechat(appId, appSecret, accountName || undefined);
      toast('微信绑定成功！', 'success');
      setModal(null);
    } catch (err: any) { toast(err.message || '绑定失败', 'error'); }
  };

  const handleWeiboBind = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bindWeibo(accountName || undefined, profileDir || undefined);
      toast('微博绑定成功！请打开浏览器完成登录', 'success');
      setModal(null);
    } catch (err: any) { toast(err.message || '绑定失败', 'error'); }
  };

  const handleXhsBind = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bindXiaohongshu(accountName || undefined, profileDir || undefined);
      toast('小红书绑定成功！请打开浏览器完成登录', 'success');
      setModal(null);
    } catch (err: any) { toast(err.message || '绑定失败', 'error'); }
  };

  const handleTest = async (p: 'wechat' | 'weibo' | 'xiaohongshu') => {
    try {
      if (p === 'wechat') {
        await testWechat();
        toast('微信连接测试通过！', 'success');
      } else {
        const fn = p === 'weibo' ? testWeibo : testXiaohongshu;
        const result = await fn();
        toast(result.message, result.success ? 'success' : 'error');
      }
    } catch (err: any) { toast(err.message || '测试失败', 'error'); }
  };

  const handleOpenLogin = async (p: 'weibo' | 'xiaohongshu') => {
    try {
      const fn = p === 'weibo' ? openWeiboLogin : openXiaohongshuLogin;
      const result = await fn();
      toast(result.message, result.success ? 'success' : 'error');
      if (result.success) setTimeout(() => fetchAllStatuses(), 3000);
    } catch (err: any) { toast(err.message || '打开浏览器失败', 'error'); }
  };

  const handleUnbind = async (p: 'wechat' | 'weibo' | 'xiaohongshu') => {
    try {
      const fn = p === 'wechat' ? unbindWechat : p === 'weibo' ? unbindWeibo : unbindXiaohongshu;
      await fn();
      toast(`已解绑${PLATFORMS[p].name}`, 'info');
    } catch (err: any) { toast(err.message || '解绑失败', 'error'); }
  };

  // ---- render helpers ----
  const status = (pid: PlatformId) => statuses[pid];

  const renderBindSection = (pid: 'wechat' | 'weibo' | 'xiaohongshu') => {
    const st = status(pid);
    const p = PLATFORMS[pid];
    const isBrowser = pid === 'weibo' || pid === 'xiaohongshu';

    if (st?.bound) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${st.connected ? 'bg-gilt-1000 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-sm text-crystal-600">
              {st.connected ? '已连接' : isBrowser ? '待登录' : '连接异常'}
            </span>
            {st.accountName && <><span className="text-crystal-500">·</span><span className="text-sm font-medium">{st.accountName}</span></>}
          </div>
          {isBrowser && st.appId && <p className="text-xs text-crystal-500 truncate">Profile: {st.appId}</p>}
          <div className="flex flex-wrap gap-2">
            {isBrowser && !st.connected && (
              <Button size="sm" variant="platform" platformColor={p.color} onClick={() => handleOpenLogin(pid)}>
                打开浏览器登录
              </Button>
            )}
            {(!isBrowser || st.connected) && (
              <Button size="sm" variant="secondary" onClick={() => openModal(pid)}>修改配置</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => handleTest(pid)} isLoading={isTesting}>测试连接</Button>
            {isBrowser && st.connected && (
              <Button size="sm" variant="ghost" onClick={() => handleOpenLogin(pid)}>重新登录</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => handleUnbind(pid)}>解绑</Button>
          </div>
        </div>
      );
    }

    return (
      <Button size="sm" variant="platform" platformColor={p.color} onClick={() => openModal(pid)}>
        {pid === 'wechat' ? '绑定公众号' : `绑定${p.name}`}
      </Button>
    );
  };

  const displayOrder = focusPlatform ? PLATFORM_ORDER.filter(p => p === focusPlatform) : PLATFORM_ORDER;
  const pageTitle = focusPlatform ? `绑定${PLATFORMS[focusPlatform].name}账号` : '绑定你的社交媒体账号';
  const pageDesc = focusPlatform
    ? (focusPlatform === 'wechat' ? '填写 AppID 与 AppSecret，推送图文至公众号草稿箱。'
      : '通过浏览器登录态绑定，自动填入内容编辑器。')
    : '绑定平台账号，一键生成并推送内容。';

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gilt-100 border border-gilt-300 mb-4">
            <Sparkles className="w-4 h-4 text-gilt-500" />
            <span className="text-xs font-medium text-gilt-700">多平台管理</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-crystal-900 mb-3">{pageTitle}</h1>
          <p className="text-sm text-crystal-600 max-w-md mx-auto">{pageDesc}</p>
          {focusPlatform && (
            <Link to="/platforms" className="inline-block mt-4 text-xs text-gilt-600 hover:text-gilt-700 underline-offset-2 hover:underline">
              查看全部平台
            </Link>
          )}
        </motion.div>

        <div className={`grid grid-cols-1 ${focusPlatform ? 'max-w-xl mx-auto' : 'md:grid-cols-2'} gap-8`}>
          {displayOrder.map((pid, index) => {
            const p = PLATFORMS[pid];
            const isLive = p.apiStatus === 'live';
            const isMock = p.apiStatus === 'mock';
            const isBindable = pid === 'wechat' || pid === 'weibo' || pid === 'xiaohongshu';

            return (
              <motion.div
                key={pid}
                ref={pid === 'wechat' ? wechatRef : pid === 'weibo' ? weiboRef : pid === 'xiaohongshu' ? xhsRef : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <motion.div
                  whileHover={isLive ? { y: -3, transition: { duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] } } : undefined}
                  className={`card-premium p-6 rounded-2xl group relative overflow-hidden ${!isLive ? 'opacity-80' : ''} ${focusPlatform === pid ? 'ring-2 ring-gilt-400/60 ring-offset-2 shadow-lg' : ''}`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-heading font-bold text-lg" style={{ backgroundColor: p.color }}>
                      {p.icon === 'MessageCircle' ? '微' : p.icon === 'Heart' ? '红' : p.icon === 'Music' ? '抖' : '博'}
                    </div>
                    <div>
                      <h3 className="text-lg font-heading font-semibold text-crystal-900">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isLive && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gilt-100 text-gilt-700 text-xs font-medium"><CheckCircle className="w-3 h-3" /> 可用</span>}
                        {isMock && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium"><Clock className="w-3 h-3" /> 即将上线</span>}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-crystal-600 mb-4">{p.description}</p>
                  <div className="border-t border-crystal-200 pt-4">
                    {isBindable ? renderBindSection(pid as 'wechat' | 'weibo' | 'xiaohongshu')
                      : <p className="text-xs text-crystal-500">{isMock ? 'API 集成中，AI 内容生成可用，推送即将开放。' : '该平台已纳入开发计划。'}</p>}
                  </div>
                  {/* Corner gleam on hover */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ backgroundColor: p.color + '15' }} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* ---- 微信 Modal ---- */}
        <Modal isOpen={modal === 'wechat'} onClose={() => setModal(null)} title="绑定微信公众号">
          <form onSubmit={handleWechatBind} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1">AppID</label>
              <input type="text" required minLength={10} value={appId} onChange={e => setAppId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent" placeholder="wx..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1">AppSecret</label>
              <div className="relative">
                <input type={showSecret ? 'text' : 'password'} required minLength={10} value={appSecret} onChange={e => setAppSecret(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent" placeholder="••••••••••••••••" />
                <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showSecret ? <EyeOff className="w-4 h-4 text-crystal-500" /> : <Eye className="w-4 h-4 text-crystal-500" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1">名称 <span className="text-crystal-500 font-normal">（选填）</span></label>
              <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent" placeholder="用于标识此账号" />
            </div>
            <Button type="submit" isLoading={isBinding} className="w-full">绑定</Button>
          </form>
        </Modal>

        {/* ---- 微博 Modal ---- */}
        <Modal isOpen={modal === 'weibo'} onClose={() => setModal(null)} title="绑定微博">
          <form onSubmit={handleWeiboBind} className="space-y-4">
            <div className="text-xs text-crystal-600 bg-crystal-50 border border-crystal-200 rounded-lg px-3 py-2 space-y-1">
              <p><strong>绑定步骤：</strong></p>
              <p>1. 填写备注（选填）→ 点击「绑定」</p>
              <p>2. 点击「打开浏览器登录」</p>
              <p>3. 在弹出的 Chrome 窗口登录微博，一次登录长期有效</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1">微博昵称 / 备注 <span className="text-crystal-500 font-normal">（选填）</span></label>
              <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent" placeholder="例如：官方账号" />
            </div>
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-crystal-500 hover:text-crystal-600">
              {showAdvanced ? '收起高级选项' : '展开高级选项（一般不需要填）'}
            </button>
            {showAdvanced && (
              <div className="p-4 rounded-xl bg-crystal-50 border border-crystal-200">
                <label className="block text-sm font-medium text-crystal-900 mb-1.5">Chrome Profile 路径</label>
                <input type="text" value={profileDir} onChange={e => setProfileDir(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent" placeholder="留空即可，系统自动创建" />
                <p className="text-xs text-crystal-500 mt-2">系统自动在 <code className="text-xs bg-gray-200 px-1 rounded">backend/weibo_profiles/your_user_id</code> 创建</p>
              </div>
            )}
            <Button type="submit" isLoading={isBinding} className="w-full">绑定</Button>
          </form>
        </Modal>

        {/* ---- 小红书 Modal ---- */}
        <Modal isOpen={modal === 'xiaohongshu'} onClose={() => setModal(null)} title="绑定小红书">
          <form onSubmit={handleXhsBind} className="space-y-4">
            <div className="text-xs text-crystal-600 bg-crystal-50 border border-crystal-200 rounded-lg px-3 py-2 space-y-1">
              <p><strong>绑定步骤：</strong></p>
              <p>1. 填写备注（选填）→ 点击「绑定」</p>
              <p>2. 点击「打开浏览器登录」</p>
              <p>3. 在 Chrome 窗口扫码或手机验证登录</p>
              <p>4. 一次登录长期有效</p>
              <p className="text-amber-600 mt-1">基于浏览器自动化，请遵守平台规范，合理控制发布频率</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1">小红书昵称 / 备注 <span className="text-crystal-500 font-normal">（选填）</span></label>
              <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent" placeholder="例如：美妆号" />
            </div>
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-crystal-500 hover:text-crystal-600">
              {showAdvanced ? '收起高级选项' : '展开高级选项（一般不需要填）'}
            </button>
            {showAdvanced && (
              <div className="p-4 rounded-xl bg-crystal-50 border border-crystal-200">
                <label className="block text-sm font-medium text-crystal-900 mb-1.5">Chrome Profile 路径</label>
                <input type="text" value={profileDir} onChange={e => setProfileDir(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gilt-400 focus:border-transparent" placeholder="留空即可，系统自动创建" />
                <p className="text-xs text-crystal-500 mt-2">系统自动在 <code className="text-xs bg-gray-200 px-1 rounded">backend/xiaohongshu_profiles/your_user_id</code> 创建</p>
              </div>
            )}
            <Button type="submit" isLoading={isBinding} className="w-full">绑定</Button>
          </form>
        </Modal>
      </div>
    </PageTransition>
  );
}
