import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useHomeStore } from '../../store/homeStore';
import { useIsHomePage } from '../../hooks/useIsHomePage';
import AltusWordmark from '../brand/AltusWordmark';

const NAV_LINKS = [
  { to: '/', label: '首页' },
  { to: '/platforms', label: '平台管理' },
  { to: '/generate', label: '内容生成' },
  { to: '/push', label: '推送发布' },
  { to: '/history', label: '历史记录' },
];

const HOME_SECTIONS = [
  { label: '品牌',   en: 'Brand',     desc: '了解 Altus 奥途智营', slideIndex: 1 },
  { label: '核心能力', en: 'Features',  desc: 'AI 覆盖运营全流程',   slideIndex: 2 },
  { label: '数据亮点', en: 'Highlights', desc: '运营效率一目了然',   slideIndex: 3 },
  { label: '使用流程', en: 'Workflow',   desc: '三步完成发布',       slideIndex: 4 },
  { label: '适用场景', en: 'Use Cases',  desc: '找到你的运营方式',   slideIndex: 5 },
];

const MOBILE_SECTIONS = [
  { label: '品牌', slideIndex: 1 },
  { label: '核心能力', slideIndex: 2 },
  { label: '数据亮点', slideIndex: 3 },
  { label: '使用流程', slideIndex: 4 },
  { label: '适用场景', slideIndex: 5 },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  const navigate = useNavigate();
  const { token, user, logout } = useAuthStore();
  const { setTargetSlide } = useHomeStore();
  const isHomePage = useIsHomePage();
  const onHero = isHomePage && !scrolled;

  useEffect(() => {
    const s = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, []);

  const goSlide = (i: number) => {
    setTargetSlide(i);
    if (!isHomePage) navigate('/');
    setMegaOpen(false);
    setMobileOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass-nav shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center h-20">
          {/* Brand */}
          <Link to="/" className="group shrink-0 py-1">
            <AltusWordmark onHero={onHero} />
          </Link>

          <div className="hidden lg:block flex-1" />

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-4">
            {/* ══ 首页 + Mega Menu ══
                relative 让面板定位到按钮左边缘，self-stretch 消除 hover 缝隙 */}
            <div
              className="relative self-stretch flex items-center"
              onMouseEnter={() => setMegaOpen(true)}
              onMouseLeave={() => setMegaOpen(false)}
            >
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
                  onHero
                    ? 'text-white/80 hover:text-white hover:bg-white/10'
                    : 'text-crystal-700 hover:text-crystal-900 hover:bg-crystal-100/60'
                }`}
              >
                首页
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${megaOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {megaOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute top-full left-0 w-[680px] z-50 rounded-b-2xl shadow-2xl overflow-hidden ${
                      onHero
                        ? 'bg-crystal-900/95 backdrop-blur-2xl border-x border-b border-white/8'
                        : 'bg-white/95 backdrop-blur-2xl border-x border-b border-crystal-200/50'
                    }`}
                  >
                    {/* gold accent line */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gilt-400/40 to-transparent" />

                    <div className="px-6 py-6">
                      <div className="grid grid-cols-5 gap-1">
                        {HOME_SECTIONS.map((section) => (
                          <button
                            type="button"
                            key={section.label}
                            onClick={() => goSlide(section.slideIndex)}
                            className={`group text-center px-3 py-4 rounded-xl transition-all duration-300 ${
                              onHero
                                ? 'hover:bg-white/[0.07]'
                                : 'hover:bg-crystal-50'
                            }`}
                          >
                            <div className={`text-[10px] tracking-[0.2em] uppercase font-medium mb-1.5 transition-colors ${
                              onHero ? 'text-gilt-400/50' : 'text-gilt-500/60'
                            }`}>
                              {section.en}
                            </div>
                            <div className={`text-[15px] font-semibold mb-2.5 transition-colors ${
                              onHero
                                ? 'text-white group-hover:text-gilt-300'
                                : 'text-crystal-800 group-hover:text-gilt-700'
                            }`}>
                              {section.label}
                            </div>
                            <div className={`h-px mx-auto mb-2.5 w-5 transition-all duration-300 group-hover:w-10 ${
                              onHero ? 'bg-gilt-400/25 group-hover:bg-gilt-400/50' : 'bg-gilt-400/30 group-hover:bg-gilt-400/60'
                            }`} />
                            <p className={`text-xs leading-relaxed transition-colors ${
                              onHero ? 'text-white/40 group-hover:text-white/60' : 'text-crystal-500 group-hover:text-crystal-600'
                            }`}>
                              {section.desc}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Other links */}
            {NAV_LINKS.filter(l => l.to !== '/').map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    onHero
                      ? isActive ? 'text-gilt-300' : 'text-white/80 hover:text-white hover:bg-white/10'
                      : isActive ? 'text-gilt-700' : 'text-crystal-700 hover:text-crystal-900 hover:bg-crystal-100/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="topnav-indicator"
                        className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-gilt-400 rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* User area */}
          <div className="hidden lg:flex items-center flex-1 justify-end">
            {token ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, rgba(200,181,144,0.12), rgba(200,181,144,0.04))', border: '1px solid rgba(200,181,144,0.35)', color: '#5C4A38' }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8B590, #B8A278)' }}>
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="max-w-[120px] truncate">{user?.nickname || user?.email || '用户'}</span>
                </button>
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute top-full mt-2 right-0 w-44 glass rounded-xl shadow-lg p-1.5"
                      onMouseLeave={() => setUserDropdownOpen(false)}
                    >
                      <Link to="/account" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-crystal-700 hover:bg-crystal-100 transition-all">
                        <User className="w-4 h-4" />账户设置
                      </Link>
                      <button type="button" onClick={() => { logout(); setUserDropdownOpen(false); navigate('/'); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-all">
                        <LogOut className="w-4 h-4" />退出登录
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/account" className="px-4 py-2 rounded-lg btn-gilt text-sm font-medium">登录</Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ml-auto ${onHero ? 'text-white hover:bg-white/10' : 'text-crystal-700 hover:bg-crystal-100'}`}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ═══════ MOBILE MENU ═══════ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-crystal-200 glass overflow-y-auto max-h-[calc(100vh-5rem)]"
          >
            <div className="px-4 py-3 space-y-1">
              <NavLink
                to="/"
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-crystal-100 text-gilt-700' : 'text-crystal-700 hover:bg-crystal-100'}`
                }
              >
                首页
              </NavLink>

              {/* Home sections */}
              {MOBILE_SECTIONS.map((s) => (
                <button
                  type="button"
                  key={s.label}
                  onClick={() => goSlide(s.slideIndex)}
                  className="block w-full text-left pl-6 pr-3 py-2 rounded-lg text-sm text-crystal-600 hover:bg-crystal-100 hover:text-crystal-800 transition-colors"
                >
                  {s.label}
                </button>
              ))}

              {/* Other nav */}
              <div className="pt-3 border-t border-crystal-200">
                {NAV_LINKS.filter(l => l.to !== '/').map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-crystal-100 text-gilt-700' : 'text-crystal-700 hover:bg-crystal-100'}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>

              {/* Account */}
              <div className="pt-2 border-t border-crystal-200">
                {token ? (
                  <>
                    <NavLink to="/account" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-crystal-700 hover:bg-crystal-100">账户</NavLink>
                    <button type="button" onClick={() => { setMobileOpen(false); logout(); navigate('/'); }} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50">退出登录</button>
                  </>
                ) : (
                  <NavLink to="/account" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium btn-gilt text-center">登录 / 注册</NavLink>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
