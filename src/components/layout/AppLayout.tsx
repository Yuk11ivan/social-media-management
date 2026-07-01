import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsHomePage } from '../../hooks/useIsHomePage';
import { useUIStore } from '../../stores/uiStore';
import NoiseOverlay from './NoiseOverlay';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import HeaderBar from './HeaderBar';

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
    <div className="relative min-h-screen bg-crystal-50">
      <NoiseOverlay />

      {isHomePage ? (
        <>
          <Navbar />
          <main className="relative z-10 h-screen overflow-hidden">
            {children}
          </main>
        </>
      ) : (
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col" style={{ paddingLeft: sidebarCollapsed ? 72 : 240 }}>
            <HeaderBar />
            <main className="flex-1 overflow-y-auto mt-14" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent' }}>
              {children}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
