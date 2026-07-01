import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, Settings, LogOut, Home, ChevronRight } from 'lucide-react';
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
  const [searchFocused, setSearchFocused] = useState(false);
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
    <header className="fixed top-0 right-0 z-30"
      style={{ left: sidebarCollapsed ? 72 : 240, height: 56, background: 'rgba(252,250,247,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(200,181,144,0.2)' }}>
      <div className="h-full flex items-center justify-between px-6">
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((c, i) => (
            <span key={c.to} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-crystal-400" />}
              {i === breadcrumbs.length - 1 ? <span className="text-crystal-800 font-medium">{c.label}</span>
                : i === 0 ? <Link to={c.to} className="text-crystal-500 hover:text-gilt-500 transition-colors"><Home className="w-4 h-4" /></Link>
                : <Link to={c.to} className="text-crystal-500 hover:text-gilt-500 transition-colors">{c.label}</Link>}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <motion.div animate={{ width: searchFocused ? 220 : 160 }} transition={{ duration: 0.3 }} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crystal-400" />
            <input onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="搜索..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-crystal-100/60 border border-crystal-200 text-sm text-crystal-800 placeholder:text-crystal-400 focus:outline-none focus:ring-2 focus:ring-gilt-400/20 focus:border-gilt-400/40 transition-all" />
          </motion.div>
          <button className="relative p-2 rounded-lg hover:bg-crystal-100 transition-colors"><Bell className="w-5 h-5 text-crystal-600" /><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gilt-400" /></button>

          {token ? (
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-crystal-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gilt-400/30 flex items-center justify-center"><User className="w-4 h-4 text-gilt-700" /></div>
              </button>
              <AnimatePresence>{userMenuOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} className="absolute top-full mt-2 right-0 w-44 glass rounded-xl shadow-lg p-1.5" onMouseLeave={() => setUserMenuOpen(false)}>
                  <div className="px-3 py-2 border-b border-crystal-200 mb-1"><p className="text-sm font-medium text-crystal-800">{user?.nickname || '用户'}</p><p className="text-xs text-crystal-500">{user?.email || ''}</p></div>
                  <Link to="/account" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-crystal-700 hover:bg-crystal-100 transition-all"><Settings className="w-4 h-4" />账户设置</Link>
                  <button onClick={() => { logout(); setUserMenuOpen(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-all"><LogOut className="w-4 h-4" />退出登录</button>
                </motion.div>
              )}</AnimatePresence>
            </div>
          ) : <Link to="/account" className="px-4 py-2 rounded-lg btn-gilt text-sm font-medium">登录</Link>}
        </div>
      </div>
    </header>
  );
}
