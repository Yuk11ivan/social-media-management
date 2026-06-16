import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle, Sparkles, Clock, ExternalLink, Eye, EyeOff } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { usePlatformStore } from '../store/platformStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';

export default function PlatformsPage() {
  const { statuses, fetchWechatStatus, bindWechat, testWechat, unbindWechat, isBinding, isTesting } =
    usePlatformStore();
  const { token } = useAuthStore();
  const { toast } = useToast();

  const [showBindModal, setShowBindModal] = useState(false);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [accountName, setAccountName] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (token) {
      fetchWechatStatus();
    }
  }, [token]);

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bindWechat(appId, appSecret, accountName || undefined);
      toast('微信绑定成功！', 'success');
      setShowBindModal(false);
      setAppId('');
      setAppSecret('');
      setAccountName('');
    } catch (err: any) {
      toast(err.message || '绑定失败', 'error');
    }
  };

  const handleTest = async () => {
    try {
      await testWechat();
      toast('微信连接测试通过！', 'success');
    } catch (err: any) {
      toast(err.message || '连接测试失败', 'error');
    }
  };

  const handleUnbind = async () => {
    try {
      await unbindWechat();
      toast('已解绑微信公众号', 'info');
    } catch (err: any) {
      toast(err.message || '解绑失败', 'error');
    }
  };

  const wechatStatus = statuses.wechat;

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
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
            绑定你的社交媒体账号
          </h1>
          <p className="text-sm text-secondary max-w-md mx-auto">
            绑定后即可一键推送内容到各平台。当前微信已完整支持，更多平台即将上线。
          </p>
        </motion.div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLATFORM_ORDER.map((pid, index) => {
            const platform = PLATFORMS[pid];
            const isLive = platform.apiStatus === 'live';
            const isMock = platform.apiStatus === 'mock';
            const isPlanned = platform.apiStatus === 'planned';

            return (
              <motion.div
                key={pid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  hover={isLive}
                  className={`relative overflow-hidden ${!isLive ? 'opacity-80' : ''}`}
                >
                  {/* Platform header */}
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

                  {/* Description */}
                  <p className="text-sm text-secondary mb-4">{platform.description}</p>

                  {/* Status & Actions - WeChat */}
                  {pid === 'wechat' && (
                    <div className="border-t border-border pt-4">
                      {wechatStatus?.bound ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                wechatStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                              }`}
                            />
                            <span className="text-sm text-secondary">
                              {wechatStatus.connected ? '已连接' : '连接异常'}
                            </span>
                            {wechatStatus.accountName && (
                              <>
                                <span className="text-muted">·</span>
                                <span className="text-sm font-medium">
                                  {wechatStatus.accountName}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setShowBindModal(true)}>
                              修改配置
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleTest} isLoading={isTesting}>
                              测试连接
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleUnbind}>
                              解绑
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="platform"
                          platformColor={platform.color}
                          onClick={() => setShowBindModal(true)}
                        >
                          绑定公众号
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Status for non-WeChat platforms */}
                  {pid !== 'wechat' && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs text-muted">
                        {isMock
                          ? 'API 集成开发中，当前支持 AI 内容生成，一键推送功能即将开放。'
                          : '该平台已纳入开发计划，敬请期待。'}
                      </p>
                    </div>
                  )}

                  {/* Hover glow effect */}
                  <div
                    className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ backgroundColor: platform.color + '15' }}
                  />
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* CTA to Generate */}
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

      {/* WeChat Bind Modal */}
      <Modal
        isOpen={showBindModal}
        onClose={() => setShowBindModal(false)}
        title="绑定微信公众号"
      >
        <form onSubmit={handleBind} className="space-y-4">
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
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              placeholder="用于标识此账号"
            />
          </div>
          <Button type="submit" isLoading={isBinding} className="w-full">
            绑定
          </Button>
        </form>
      </Modal>
    </PageTransition>
  );
}
