import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut, Home, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../stores/uiStore';

const PATH_LABELS: Record<string, string> = {
  generate: '内容生成', push: '推送发布', history: '历史记录',
  platforms: '平台管理', account: '账户设置', wechat: '微信公众号', weibo: '微博', xiaohongshu: '小红书',
};

export default function HeaderBar() {
  const location = useLocation();
  const { token, user, logout } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const breadcrumbs = useMemo(() => {
    const segs = location.pathname.split('/').filter(Boolean);
    if (!segs.length) return [{ label: '首页', to: '/' }];
    const crumbs = [{ label: '首页', to: '/' }];
    let path = '';
    for (const s of segs) { path += '/' + s; crumbs.push({ label: PATH_LABELS[s] || s, to: path }); }
    return crumbs;
  }, [location.pathname]);

  return (
    <header
      className="fixed top-0 right-0 z-30 border-b border-white/10 bg-black/25 backdrop-blur-xl"
      style={{ left: sidebarCollapsed ? 72 : 240, height: 56 }}
    >
      <div className="h-full flex items-center justify-between px-6">
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((c, i) => (
            <span key={c.to} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-white/35" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-white/90 font-medium">{c.label}</span>
              ) : i === 0 ? (
                <Link to={c.to} className="text-white/50 hover:text-gilt-300 transition-colors"><Home className="w-4 h-4" /></Link>
              ) : (
                <Link to={c.to} className="text-white/50 hover:text-gilt-300 transition-colors">{c.label}</Link>
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {token ? (
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gilt-400/30 flex items-center justify-center border border-white/15">
                  <User className="w-4 h-4 text-gilt-200" />
                </div>
              </button>
              <AnimatePresence>{userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="absolute top-full mt-2 right-0 w-44 rounded-xl border border-white/15 bg-black/60 backdrop-blur-xl shadow-lg p-1.5"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-sm font-medium text-white/90">{user?.nickname || '用户'}</p>
                    <p className="text-xs text-white/45">{user?.email || ''}</p>
                  </div>
                  <Link to="/account" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/75 hover:bg-white/10 transition-all">
                    <Settings className="w-4 h-4" />账户设置
                  </Link>
                  <button onClick={() => { logout(); setUserMenuOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10 transition-all">
                    <LogOut className="w-4 h-4" />退出登录
                  </button>
                </motion.div>
              )}</AnimatePresence>
            </div>
          ) : (
            <Link to="/account" className="px-4 py-2 rounded-lg btn-gilt text-sm font-medium">登录</Link>
          )}
        </div>
      </div>
    </header>
  );
}
