import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Menu, X, User, LogOut } from 'lucide-react';
import { PLATFORMS, PLATFORM_ORDER } from '../../config/platforms';

const NAV_LINKS = [
  { to: '/', label: '首页' },
  { to: '/generate', label: '内容生成' },
  { to: '/material', label: '素材管理' },
  { to: '/push', label: '推送' },
  { to: '/history', label: '历史' },
];

const BIND_LINKS = [
  { to: '/platforms/wechat', label: '微信绑定', color: '#07C160' },
  { to: '/platforms/weibo', label: '微博绑定', color: '#E6162D' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const token = (() => {
    try {
      const d = localStorage.getItem('auth-storage');
      return d ? JSON.parse(d)?.state?.token : null;
    } catch {
      return null;
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem('auth-storage');
    navigate('/account');
    window.location.reload();
  };

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </motion.div>
            <span className="font-heading font-bold text-lg text-primary">
              AI 运营工坊
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `relative px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-emerald-600'
                      : 'text-secondary hover:text-primary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}

            <div className="w-px h-5 bg-border mx-1" />

            {BIND_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `relative px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive ? '' : 'text-secondary hover:text-primary'
                  }`
                }
                style={({ isActive }) => (isActive ? { color: link.color } : undefined)}
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-bind-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                        style={{ backgroundColor: link.color }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Platform quick icons */}
            {PLATFORM_ORDER.filter((pid) => PLATFORMS[pid].apiStatus === 'live').map((pid) => {
              const p = PLATFORMS[pid];
              return (
                <Link
                  key={pid}
                  to={`/platforms/${pid}`}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                  style={{ backgroundColor: p.color + '18' }}
                  title={`${p.name}绑定`}
                >
                  <span
                    className="text-[11px] font-heading font-bold"
                    style={{ color: p.color }}
                  >
                    {p.name.charAt(0)}
                  </span>
                </Link>
              );
            })}

            <div className="w-px h-5 bg-border mx-1" />

            {token ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/account"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
                >
                  <User className="w-4 h-4" />
                  账户
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="退出登录"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/account"
                className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                登录
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-secondary hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-border bg-white/90 backdrop-blur-xl"
        >
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'text-secondary hover:bg-gray-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-2 mt-2 border-t border-border">
              <p className="px-3 py-1 text-xs text-muted font-medium">平台绑定</p>
              {BIND_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-gray-50' : 'text-secondary hover:bg-gray-50'
                    }`
                  }
                  style={({ isActive }) => (isActive ? { color: link.color } : undefined)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            <div className="pt-2 border-t border-border">
              {token ? (
                <>
                  <NavLink
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-secondary hover:bg-gray-50"
                  >
                    账户
                  </NavLink>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50"
                  >
                    退出登录
                  </button>
                </>
              ) : (
                <NavLink
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 text-white text-center"
                >
                  登录 / 注册
                </NavLink>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
