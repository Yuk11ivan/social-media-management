import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsHomePage } from '../../hooks/useIsHomePage';
import { useUIStore } from '../../stores/uiStore';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';
import DashboardBackground from './DashboardBackground';

interface Props { children: ReactNode; }

export default function AppLayout({ children }: Props) {
  const isHomePage = useIsHomePage();
  const location = useLocation();
  const { sidebarCollapsed, setIsScrolled } = useUIStore();

  useEffect(() => {
    const s = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', s, { passive: true });
    return () => window.removeEventListener('scroll', s);
  }, [setIsScrolled]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={`relative min-h-screen ${isHomePage ? 'bg-crystal-900' : 'dashboard-theme bg-crystal-900'}`}>
      {isHomePage ? (
        <>
          <Navbar />
          <main className="relative z-10 h-screen overflow-hidden">
            {children}
          </main>
        </>
      ) : (
        <>
          <DashboardBackground />
          <div className="relative z-10 flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0" style={{ paddingLeft: sidebarCollapsed ? 72 : 240 }}>
              <HeaderBar />
              <main
                className="flex-1 overflow-y-auto mt-14 px-4 sm:px-6 py-6"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
              >
                {children}
              </main>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
