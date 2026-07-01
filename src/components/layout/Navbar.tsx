import { useState, useEffect } from 'react';

import { Link, NavLink, useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';

import { Sparkles, Menu, X, User, LogOut } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { useIsHomePage } from '../../hooks/useIsHomePage';



const NAV_LINKS = [

  { to: '/', label: '首页' }, { to: '/generate', label: '内容生成' },

  { to: '/push', label: '推送发布' },

  { to: '/history', label: '历史记录' }, { to: '/platforms', label: '平台管理' },

];



export default function Navbar() {

  const [mobileOpen, setMobileOpen] = useState(false);

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate();

  const { token, user, logout } = useAuthStore();
  const isHomePage = useIsHomePage();
  const onHero = isHomePage && !scrolled;



  useEffect(() => {

    const s = () => setScrolled(window.scrollY > 40);

    window.addEventListener('scroll', s, { passive: true });

    return () => window.removeEventListener('scroll', s);

  }, []);



  return (

    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'glass-nav shadow-sm' : 'bg-transparent'}`}>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        <div className="flex items-center h-16">

          <Link to="/" className="flex items-center gap-2.5 group shrink-0">

            <div className="w-9 h-9 rounded-xl btn-gilt flex items-center justify-center" style={{ boxShadow: '0 2px 8px rgba(160,130,80,0.2), inset 0 1px 0 rgba(255,255,255,0.2)' }}>

              <Sparkles className="w-5 h-5 text-white" />

            </div>

            <div className="flex-col hidden sm:flex">

              <span className={`font-heading font-bold text-lg leading-tight ${onHero ? 'text-white' : 'text-crystal-900'}`}>Altus</span>

              <span className={`text-[10px] font-medium leading-tight ${onHero ? 'text-white/70' : 'text-crystal-500'}`}>奥途智营</span>

            </div>

          </Link>



          <div className="hidden lg:block flex-1" />



          <div className="hidden lg:flex items-center gap-4">

            {NAV_LINKS.map((link) => (

              <NavLink key={link.to} to={link.to} end={link.to === '/'}

                className={({ isActive }) => `relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${onHero ? (isActive ? 'text-gilt-300' : 'text-white/80 hover:text-white hover:bg-white/10') : (isActive ? 'text-gilt-700' : 'text-crystal-700 hover:text-crystal-900 hover:bg-crystal-100/60')}`}>

                {({ isActive }) => (<>{link.label}{isActive && <motion.div layoutId="topnav-indicator" className="absolute bottom-0.5 left-3 right-3 h-0.5 bg-gilt-400 rounded-full" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}</>)}

              </NavLink>

            ))}

          </div>



          <div className="hidden lg:flex items-center flex-1 justify-end">

            {token ? (

              <div className="relative">

                <button onClick={() => setUserDropdownOpen(!userDropdownOpen)}

                  className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm"

                  style={{ background: 'linear-gradient(135deg, rgba(200,181,144,0.12), rgba(200,181,144,0.04))', border: '1px solid rgba(200,181,144,0.35)', color: '#5C4A38' }}>

                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8B590, #B8A278)' }}>

                    <User className="w-3.5 h-3.5 text-white" />

                  </div>

                  <span className="max-w-[120px] truncate">{user?.nickname || user?.email || '用户'}</span>

                </button>

                <AnimatePresence>{userDropdownOpen && (

                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} className="absolute top-full mt-2 right-0 w-44 glass rounded-xl shadow-lg p-1.5" onMouseLeave={() => setUserDropdownOpen(false)}>

                    <Link to="/account" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-crystal-700 hover:bg-crystal-100 transition-all"><User className="w-4 h-4" />账户设置</Link>

                    <button onClick={() => { logout(); setUserDropdownOpen(false); navigate('/'); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-all"><LogOut className="w-4 h-4" />退出登录</button>

                  </motion.div>

                )}</AnimatePresence>

              </div>

            ) : <Link to="/account" className="px-4 py-2 rounded-lg btn-gilt text-sm font-medium">登录</Link>}

          </div>



          <button onClick={() => setMobileOpen(!mobileOpen)} className={`lg:hidden p-2 rounded-lg transition-colors ml-auto ${onHero ? 'text-white hover:bg-white/10' : 'text-crystal-700 hover:bg-crystal-100'}`}>{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>

        </div>

      </div>



      <AnimatePresence>{mobileOpen && (

        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden border-t border-crystal-200 glass">

          <div className="px-4 py-3 space-y-1">

            {NAV_LINKS.map(link => (

              <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-crystal-100 text-gilt-700' : 'text-crystal-700 hover:bg-crystal-100'}`}>{link.label}</NavLink>

            ))}

            <div className="pt-2 border-t border-crystal-200">

              {token ? (<>

                <NavLink to="/account" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-crystal-700 hover:bg-crystal-100">账户</NavLink>

                <button onClick={() => { setMobileOpen(false); logout(); navigate('/'); }} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50">退出登录</button>

              </>) : <NavLink to="/account" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium btn-gilt text-center">登录 / 注册</NavLink>}

            </div>

          </div>

        </motion.div>

      )}</AnimatePresence>

    </nav>

  );

}


