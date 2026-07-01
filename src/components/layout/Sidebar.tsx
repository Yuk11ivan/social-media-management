import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Home, Wand2, Send, Archive, Settings, User, LogOut } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import AltusWordmark from '../brand/AltusWordmark';

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: Home },
  { to: '/platforms', label: '平台管理', icon: Settings },
  { to: '/generate', label: '内容生成', icon: Wand2 },
  { to: '/push', label: '推送发布', icon: Send },
  { to: '/history', label: '历史记录', icon: Archive },
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
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-white/10 bg-black/30 backdrop-blur-xl"
      style={{
        width: sidebarCollapsed ? 72 : 240,
        minWidth: sidebarCollapsed ? 72 : 240,
      }}
    >
      <div className="h-20 flex items-center px-4 border-b border-white/10 shrink-0">
        <Link to="/" className="flex items-center min-w-0">
          {sidebarCollapsed ? (
            <span className="altus-wordmark altus-wordmark-hero text-3xl mx-auto">A</span>
          ) : (
            <AltusWordmark onHero />
          )}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
              sidebarCollapsed ? 'justify-center p-3' : 'px-4 py-3',
              isActive
                ? 'bg-white/12 text-gilt-300 border border-white/10'
                : 'text-white/65 hover:text-white hover:bg-white/8 border border-transparent'
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-gilt-300')} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        {token ? (
          <div className="space-y-1">
            <Link to="/account" className={cn(
              'flex items-center gap-3 rounded-xl hover:bg-white/8 transition-all',
              sidebarCollapsed ? 'justify-center p-2' : 'px-3 py-2.5'
            )}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${['#C8B590','#B8A278','#D9C9A8','#A08A60'][(user?.nickname||'?').charCodeAt(0)%4]}, ${['#B8A278','#A08A60','#C8B590','#887248'][(user?.nickname||'?').charCodeAt(0)%4]})` }}>
                {(user?.nickname || '?').charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">{user?.nickname || '用户'}</p>
                  <p className="text-xs text-white/45 truncate">{user?.email || ''}</p>
                </div>
              )}
            </Link>
            {!sidebarCollapsed && (
              <button onClick={() => { logout(); navigate('/'); }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-all">
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

      <button onClick={toggleSidebar}
        className="absolute -right-3 top-[5.5rem] w-6 h-6 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-sm flex items-center justify-center hover:bg-white/20 transition-colors z-50">
        <motion.div animate={{ rotate: sidebarCollapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronRight className="w-3.5 h-3.5 text-white/70" />
        </motion.div>
      </button>
    </motion.aside>
  );
}
