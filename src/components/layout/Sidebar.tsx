import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Home, Wand2, Image, Send, Archive, Settings, User, LogOut } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: Home },
  { to: '/generate', label: '内容生成', icon: Wand2 },
  { to: '/material', label: '素材管理', icon: Image },
  { to: '/push', label: '推送发布', icon: Send },
  { to: '/history', label: '历史记录', icon: Archive },
  { to: '/platforms', label: '平台管理', icon: Settings },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(245,243,240,0.98) 0%, rgba(240,237,233,0.96) 100%)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(200,181,144,0.2)',
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gilt-300/20 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #C8B590, #B8A278)', boxShadow: '0 2px 8px rgba(160,138,96,0.25)' }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden whitespace-nowrap">
                <span className="font-heading font-bold text-base text-crystal-900">Altus</span>
                <span className="text-[10px] text-crystal-500 block leading-tight -mt-0.5">奥途智营</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
              sidebarCollapsed ? 'justify-center p-3' : 'px-4 py-2.5',
              isActive
                ? 'bg-gilt-400/15 text-gilt-700'
                : 'text-crystal-600 hover:text-crystal-900 hover:bg-crystal-100/70'
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gilt-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-gilt-600')} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gilt-300/20">
        {token ? (
          <div className="space-y-1">
            <Link to="/account" className={cn(
              'flex items-center gap-3 rounded-xl hover:bg-crystal-100/70 transition-all',
              sidebarCollapsed ? 'justify-center p-2' : 'px-3 py-2'
            )}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #C8B590, #B8A278)' }}>
                <User className="w-4 h-4 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-crystal-900 truncate">{user?.nickname || '用户'}</p>
                  <p className="text-xs text-crystal-500 truncate">{user?.email || ''}</p>
                </div>
              )}
            </Link>
            {!sidebarCollapsed && (
              <button onClick={() => { logout(); navigate('/'); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-crystal-500 hover:text-red-500 hover:bg-red-50/50 transition-all">
                <LogOut className="w-3.5 h-3.5" />退出登录
              </button>
            )}
          </div>
        ) : (
          <Link to="/account" className={cn(
            'flex items-center gap-2.5 w-full rounded-xl text-sm font-medium transition-all btn-gilt',
            sidebarCollapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'
          )}>
            <User className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span>登录账户</span>}
          </Link>
        )}
      </div>

      {/* Toggle */}
      <button onClick={toggleSidebar}
        className="absolute -right-3 top-[4.5rem] w-6 h-6 rounded-full bg-white border border-crystal-200 shadow-sm flex items-center justify-center hover:bg-crystal-50 transition-colors z-50">
        <motion.div animate={{ rotate: sidebarCollapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronRight className="w-3.5 h-3.5 text-crystal-500" />
        </motion.div>
      </button>
    </motion.aside>
  );
}
