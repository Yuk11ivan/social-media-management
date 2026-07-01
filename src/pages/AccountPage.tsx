import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Sparkles, ArrowRight, Eye, EyeOff,
  Phone, Shield, LogOut, ChevronRight, Check, Camera, Calendar,
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../config/api';
import { useToast } from '../components/ui/Toast';

type Tab = 'login' | 'register';

/* ── helpers ── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #C8B590, #A08A60)',
  'linear-gradient(135deg, #D9C9A8, #B8A278)',
  'linear-gradient(135deg, #B8A278, #887248)',
  'linear-gradient(135deg, #E4DED2, #A09888)',
];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(d?: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return d;
  }
}

/* ══════════════════════════════════════════════ */
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

  /* ── login / register ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (tab === 'login') {
        const res = await authApi.login({ email, password });
        setToken(res.access_token);
        const me = await authApi.me();
        setUser({ id: me.id, email: me.email, nickname: me.nickname, phone: me.phone, createdAt: me.created_at });
        toast('登录成功！', 'success');
        navigate('/generate');
      } else {
        const res = await authApi.register({ email, password, nickname: nickname || undefined });
        setToken(res.access_token);
        const me = await authApi.me();
        setUser({ id: me.id, email: me.email, nickname: me.nickname, phone: me.phone, createdAt: me.created_at });
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

  /* ═══════ LOGGED-IN: Settings Page ═══════ */
  if (isLoggedIn) {
    return (
      <PageTransition>
        <SettingsView
          user={user!}
          setUser={setUser}
          onLogout={handleLogout}
          toast={toast}
        />
      </PageTransition>
    );
  }

  /* ═══════ LOGGED-OUT: Login / Register ═══════ */
  return (
    <PageTransition>
      <div className="max-w-md mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gilt-400/20 mb-5">
            <Sparkles className="w-8 h-8 text-gilt-600" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-crystal-900 mb-1">Altus</h1>
          <p className="text-sm font-medium text-crystal-600 mb-1">奥途智营</p>
          <p className="text-xs text-crystal-500">多平台内容智能运营，让发布更简单</p>
        </motion.div>

        <div className="flex mb-8 bg-crystal-100 rounded-xl p-1">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${tab === t ? 'text-crystal-900' : 'text-crystal-500 hover:text-crystal-600'}`}>
              {tab === t && <motion.div layoutId="tab-bg" className="absolute inset-1 bg-gilt-200/60 rounded-md shadow-sm" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span className="relative z-10">{t === 'login' ? '登录' : '注册'}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.form key={tab}
            initial={{ opacity: 0, x: tab === 'login' ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tab === 'login' ? 20 : -20 }}
            transition={{ duration: 0.2 }} onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-crystal-600 mb-1.5">昵称 <span className="text-crystal-500 font-normal">（选填）</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
                  <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-crystal-200 bg-white text-sm text-crystal-900 placeholder:text-crystal-500 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                    placeholder="你的名字" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1.5">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-crystal-200 bg-white text-sm text-crystal-900 placeholder:text-crystal-500 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                  placeholder="your@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-crystal-600 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-500" />
                <input type={showPassword ? 'text' : 'password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-crystal-200 bg-white text-sm text-crystal-900 placeholder:text-crystal-500 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                  placeholder={tab === 'register' ? '至少6位密码' : '输入密码'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-crystal-100 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4 text-crystal-500" /> : <Eye className="w-4 h-4 text-crystal-500" />}
                </button>
              </div>
            </div>
            {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</motion.p>}
            <Button type="submit" size="lg" isLoading={isLoading} className="w-full">{tab === 'login' ? '登录' : '创建账号'}</Button>
            <p className="text-center text-sm text-crystal-500 pt-2">
              {tab === 'login' ? (<>还没有账号？ <button type="button" onClick={() => setTab('register')} className="text-gilt-600 font-medium hover:text-gilt-700 transition-colors">立即注册</button></>)
                : (<>已有账号？ <button type="button" onClick={() => setTab('login')} className="text-gilt-600 font-medium hover:text-gilt-700 transition-colors">去登录</button></>)}
            </p>
          </motion.form>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

/* ══════════════════════════════════════════════════════════
   Settings View (logged-in)
   ══════════════════════════════════════════════════════════ */
interface SettingsProps {
  user: { id: string; email: string; nickname?: string; phone?: string; createdAt?: string };
  setUser: (u: any) => void;
  onLogout: () => void;
  toast: (msg: string, type?: string) => void;
}

function SettingsView({ user, setUser, onLogout, toast }: SettingsProps) {
  /* profile form */
  const [editNick, setEditNick] = useState(user.nickname || '');
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  /* password form */
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const displayName = user.nickname || user.email.split('@')[0];
  const initials = getInitials(displayName);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({
        nickname: editNick || undefined,
        phone: editPhone || undefined,
      });
      setUser({ id: updated.id, email: updated.email, nickname: updated.nickname, phone: updated.phone, createdAt: updated.created_at });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      toast('资料已更新', 'success');
    } catch (err: any) {
      toast(err.message || '更新失败', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (newPwd.length < 6) { setPwdError('新密码至少 6 位'); return; }
    if (newPwd !== confirmPwd) { setPwdError('两次密码不一致'); return; }
    setSavingPwd(true);
    try {
      await authApi.changePassword({ old_password: oldPwd, new_password: newPwd });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      setPwdSaved(true);
      setTimeout(() => setPwdSaved(false), 2000);
      toast('密码修改成功', 'success');
    } catch (err: any) {
      setPwdError(err.message || '修改失败');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-20">
      {/* ── Profile Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6 mb-10">
        <div className="relative group shrink-0">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-heading font-bold shadow-lg"
            style={{ background: AVATAR_GRADIENTS[user.email.charCodeAt(0) % AVATAR_GRADIENTS.length] }}>
            {initials}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-heading font-bold text-crystal-900 truncate">{displayName}</h1>
          <p className="text-sm text-crystal-500 truncate">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-crystal-400">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(user.createdAt)} 加入</span>
          </div>
        </div>
      </motion.div>

      {/* ── 个人资料 ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-2.5 mb-6">
          <User className="w-4 h-4 text-gilt-600" />
          <h2 className="text-sm font-semibold text-crystal-800 tracking-wide">个人资料</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-crystal-500 mb-1.5">昵称</label>
            <input type="text" value={editNick} onChange={(e) => setEditNick(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white/70 text-sm text-crystal-900 placeholder:text-crystal-400 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
              placeholder="设置昵称" />
          </div>
          <div>
            <label className="block text-xs font-medium text-crystal-500 mb-1.5">手机号</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-400" />
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-crystal-200 bg-white/70 text-sm text-crystal-900 placeholder:text-crystal-400 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                placeholder="绑定手机号" />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={handleSaveProfile} isLoading={savingProfile} size="sm" disabled={savingProfile}>
              {profileSaved ? <><Check className="w-3.5 h-3.5" />已保存</> : '保存修改'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── 账户安全 ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-2.5 mb-6">
          <Shield className="w-4 h-4 text-gilt-600" />
          <h2 className="text-sm font-semibold text-crystal-800 tracking-wide">账户安全</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-crystal-500 mb-1.5">当前密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-400" />
              <input type={showOld ? 'text' : 'password'} value={oldPwd} onChange={(e) => setOldPwd(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-crystal-200 bg-white/70 text-sm text-crystal-900 placeholder:text-crystal-400 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                placeholder="输入当前密码" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-crystal-400 hover:text-crystal-600 transition-colors">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-crystal-500 mb-1.5">新密码</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white/70 text-sm text-crystal-900 placeholder:text-crystal-400 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                  placeholder="至少 6 位" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-crystal-500 mb-1.5">确认新密码</label>
              <input type={showNew ? 'text' : 'password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                onFocus={() => setShowNew(true)} onBlur={() => setShowNew(false)}
                className="w-full px-4 py-2.5 rounded-xl border border-crystal-200 bg-white/70 text-sm text-crystal-900 placeholder:text-crystal-400 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all"
                placeholder="再输一次" />
            </div>
          </div>
          {pwdError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{pwdError}</p>}
          <div className="flex justify-end pt-1">
            <Button onClick={handleChangePassword} isLoading={savingPwd} size="sm" disabled={savingPwd || !oldPwd || !newPwd || !confirmPwd}>
              {pwdSaved ? <><Check className="w-3.5 h-3.5" />已修改</> : '修改密码'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── 账户信息 ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-2.5 mb-5">
          <Mail className="w-4 h-4 text-gilt-600" />
          <h2 className="text-sm font-semibold text-crystal-800 tracking-wide">账户信息</h2>
        </div>
        <div className="space-y-3">
          <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="邮箱" value={user.email} />
          <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="手机号" value={user.phone || '未绑定'} muted={!user.phone} />
          <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="注册时间" value={formatDate(user.createdAt)} />
        </div>
      </motion.div>

      {/* ── 退出登录 ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <button type="button" onClick={onLogout}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-red-200/60 text-sm font-medium text-red-500 hover:bg-red-50/60 hover:border-red-300/60 transition-all">
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </motion.div>
    </div>
  );
}

/* ── small helper component ── */
function InfoRow({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-crystal-400">{icon}</span>
      <span className="text-xs text-crystal-500 w-14 shrink-0">{label}</span>
      <span className={`text-sm flex-1 ${muted ? 'text-crystal-400 italic' : 'text-crystal-800'}`}>{value}</span>
    </div>
  );
}
