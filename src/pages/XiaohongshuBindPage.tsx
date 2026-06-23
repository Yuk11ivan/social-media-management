import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Heart, CheckCircle, AlertTriangle, ArrowLeft,
  RefreshCw, Unlink, LogIn, Sparkles,
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { usePlatformStore } from '../store/platformStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS } from '../config/platforms';

const platform = PLATFORMS.xiaohongshu;

export default function XiaohongshuBindPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const {
    statuses,
    fetchXiaohongshuStatus,
    bindXiaohongshu,
    testXiaohongshu,
    openXiaohongshuLogin,
    unbindXiaohongshu,
  } = usePlatformStore();

  const [accountName, setAccountName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [profileDir, setProfileDir] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logging, setLogging] = useState(false);

  const status = statuses.xiaohongshu;
  const isBound = !!status?.bound;
  const isConnected = !!status?.connected;

  useEffect(() => {
    if (token) fetchXiaohongshuStatus();
  }, [token, fetchXiaohongshuStatus]);

  // 打开浏览器后轮询登录状态
  useEffect(() => {
    if (!isBound || isConnected) return;
    const t = setInterval(() => fetchXiaohongshuStatus(), 4000);
    return () => clearInterval(t);
  }, [isBound, isConnected, fetchXiaohongshuStatus]);

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bindXiaohongshu(accountName || undefined, profileDir || undefined);
      toast('绑定成功！下一步请打开浏览器登录', 'success');
      setAccountName('');
      setProfileDir('');
    } catch (err: any) {
      toast(err.message || '绑定失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLogin = async () => {
    setLogging(true);
    try {
      const r = await openXiaohongshuLogin();
      toast(r.message, r.success ? 'success' : 'error');
    } catch (err: any) {
      toast(err.message || '打开浏览器失败', 'error');
    } finally {
      setLogging(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await testXiaohongshu();
      toast(r.message, r.success ? 'success' : 'error');
      if (r.success) fetchXiaohongshuStatus();
    } catch (err: any) {
      toast(err.message || '测试失败', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleUnbind = async () => {
    try {
      await unbindXiaohongshu();
      toast('已解绑小红书', 'info');
    } catch (err: any) {
      toast(err.message || '解绑失败', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* 返回 */}
        <Link
          to="/platforms"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-secondary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> 返回平台管理
        </Link>

        {/* 头部 */}
        <div className="flex items-center gap-4 mb-10">
          <motion.div
            initial={{ rotate: -8, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
            style={{ backgroundColor: platform.color }}
          >
            <Heart className="w-7 h-7" fill="white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-primary">绑定小红书账号</h1>
            <p className="text-sm text-secondary mt-0.5">
              Chrome 浏览器自动填入笔记，人工审核后手动发布
            </p>
          </div>
        </div>

        {/* === 未绑定：三步向导 === */}
        {!isBound && (
          <div className="space-y-6">
            {/* 步骤条 */}
            <div className="flex items-center gap-3 mb-2">
              {['填写信息', '绑定账号', '打开浏览器登录'].map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium text-primary">{label}</span>
                  {i < 2 && <div className="w-6 h-px bg-border hidden sm:block" />}
                </div>
              ))}
            </div>

            {/* 表单 */}
            <Card>
              <form onSubmit={handleBind} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    账号备注 <span className="text-muted font-normal">（选填）</span>
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    maxLength={20}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm
                      focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                    placeholder="例如：美妆号"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-muted hover:text-secondary"
                >
                  {showAdvanced ? '收起高级选项' : '高级选项 ▸'}
                </button>

                {showAdvanced && (
                  <div className="p-4 rounded-xl bg-gray-50 border border-border">
                    <label className="block text-sm font-medium text-primary mb-1.5">
                      Chrome Profile 路径
                    </label>
                    <input
                      type="text"
                      value={profileDir}
                      onChange={(e) => setProfileDir(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm
                        focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                      placeholder="留空自动创建"
                    />
                    <p className="text-xs text-muted mt-2">
                      系统自动在 <code className="text-xs bg-gray-200 px-1 rounded">backend/xiaohongshu_profiles/</code> 创建
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={submitting}
                  className="w-full"
                  variant="platform"
                  platformColor={platform.color}
                >
                  确认绑定
                </Button>
              </form>
            </Card>

            {/* 风险提示 */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <p className="font-semibold mb-0.5">温馨提示</p>
                <p>基于浏览器自动化，系统不会自动点击发布按钮，所有笔记需你在浏览器中审核后手动发布。请合理控制发布频率，遵守平台规范。</p>
              </div>
            </div>
          </div>
        )}

        {/* === 已绑定：状态与操作 === */}
        {isBound && (
          <div className="space-y-5">
            {/* 状态卡片 */}
            <Card>
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isConnected ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  {isConnected ? (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-heading font-semibold text-primary">
                      {isConnected ? '登录态正常' : '待完成登录'}
                    </h3>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  </div>
                  <p className="text-sm text-secondary mt-0.5">
                    {isConnected
                      ? '一切就绪，可以开始推送笔记了'
                      : '请打开浏览器扫码登录小红书'}
                  </p>
                </div>
              </div>

              {status.accountName && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gray-50 text-sm">
                  <span className="text-muted">账号备注：</span>
                  <span className="font-medium">{status.accountName}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                {!isConnected ? (
                  <Button
                    variant="platform"
                    platformColor={platform.color}
                    onClick={handleOpenLogin}
                    isLoading={logging}
                  >
                    <LogIn className="w-4 h-4 mr-1.5" />
                    打开浏览器登录
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={handleTest} isLoading={testing}>
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                      测试连接
                    </Button>
                    <Button variant="ghost" onClick={handleOpenLogin} isLoading={logging}>
                      <LogIn className="w-4 h-4 mr-1.5" />
                      重新登录
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={handleUnbind}>
                  <Unlink className="w-4 h-4 mr-1.5" />
                  解绑
                </Button>
              </div>
            </Card>

            {/* 已连接的快捷入口 */}
            {isConnected && (
              <Card className="border-emerald-200 bg-emerald-50/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-primary">绑定完成！</p>
                    <p className="text-xs text-secondary mt-1">
                      前往内容生成页面，选择小红书平台，AI 将自动生成种草笔记。
                    </p>
                    <Link
                      to="/generate"
                      className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      开始内容生成 →
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            {/* 平台限制 */}
            <Card>
              <h3 className="text-sm font-heading font-semibold text-primary mb-3">小红书平台限制</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  ['标题字数', '≤ 20 字'],
                  ['正文字数', '≤ 1000 字'],
                  ['图片数量', '1–18 张'],
                  ['话题标签', '≤ 5 个'],
                  ['发布间隔', '≥ 5 分钟'],
                ].map(([label, value]) => (
                  <div key={label} className="px-3 py-2 rounded-lg bg-gray-50">
                    <span className="text-muted">{label}</span>
                    <span className="block font-mono font-medium text-primary mt-0.5">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
