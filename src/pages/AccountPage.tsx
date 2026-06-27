import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../config/api';
import { useToast } from '../components/ui/Toast';

type Tab = 'login' | 'register';

export default function AccountPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token, user, setToken, setUser, logout } = useAuthStore();
  const { toast } = useToast();

  const isLoggedIn = !!token && !!user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (tab === 'login') {
        const res = await authApi.login({ email, password });
        setToken(res.access_token);
        const me = await authApi.me();
        setUser({ id: me.id, email: me.email, nickname: me.nickname });
        toast('登录成功！', 'success');
        navigate('/generate');
      } else {
        const res = await authApi.register({ email, password, nickname: nickname || undefined });
        setToken(res.access_token);
        const me = await authApi.me();
        setUser({ id: me.id, email: me.email, nickname: me.nickname });
        toast('注册成功！欢迎加入 AI 运营工坊', 'success');
        navigate('/generate');
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast('已退出登录', 'info');
    navigate('/');
  };

  // Logged-in view
  if (isLoggedIn) {
    return (
      <PageTransition>
        <div className="max-w-lg mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gilt-400/25 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-gilt-600" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-crystal-900 mb-2">
              欢迎回来，{user.nickname || user.email}
            </h1>
            <p className="text-sm text-crystal-600 mb-8">
              Altus 奥途智营 · AI 运营助手已就绪
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/generate')} icon={<ArrowRight className="w-4 h-4" />}>
                开始创作
              </Button>
              <Button variant="secondary" onClick={() => navigate('/platforms/wechat')}>
                绑定微信
              </Button>
              <Button variant="secondary" onClick={() => navigate('/platforms/weibo')}>
                绑定微博
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-md mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gilt-400/20 mb-5">
            <Sparkles className="w-8 h-8 text-gilt-600" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-crystal-900 mb-1">
            Altus
          </h1>
          <p className="text-sm font-medium text-crystal-600 mb-1">
            奥途智营
          </p>
          <p className="text-xs text-crystal-500">
            多平台内容智能运营，让发布更简单
          </p>
        </motion.div>

        {/* Tab switch */}
        <div className="flex mb-8 bg-crystal-100 rounded-xl p-1">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                tab === t ? 'text-crystal-900' : 'text-crystal-500 hover:text-crystal-600'
              }`}
            >
              {tab === t && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-1 bg-white rounded-md shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {t === 'login' ? '登录' : '注册'}
              </span>
            </button>
          ))}
        </div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={tab}
            initial={{ opacity: 0, x: tab === 'login' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'login' ? 20 : -20 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Nickname (register only) */}
            {tab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-crystal-600 mb-1.5">
                  昵称 <span className="text-crystal-500 font-normal">（选填）</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-crystal-200 bg-white text-sm text-crystal-900 placeholder:text-crystal-500 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                    placeholder="你的名字"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1.5">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-crystal-200 bg-white text-sm text-crystal-900 placeholder:text-crystal-500 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-crystal-200 bg-white text-sm text-crystal-900 placeholder:text-crystal-500 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                  placeholder={tab === 'register' ? '至少6位密码' : '输入密码'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-crystal-100 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-crystal-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-crystal-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              {tab === 'login' ? '登录' : '创建账号'}
            </Button>

            {/* Switch text */}
            <p className="text-center text-sm text-crystal-500 pt-2">
              {tab === 'login' ? (
                <>
                  还没有账号？{' '}
                  <button
                    type="button"
                    onClick={() => setTab('register')}
                    className="text-gilt-600 font-medium hover:text-gilt-700 transition-colors"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？{' '}
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="text-gilt-600 font-medium hover:text-gilt-700 transition-colors"
                  >
                    去登录
                  </button>
                </>
              )}
            </p>
          </motion.form>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
