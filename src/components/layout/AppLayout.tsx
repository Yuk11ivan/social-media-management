import type { ReactNode } from 'react';
import NoiseOverlay from './NoiseOverlay';
import OrganicShapes from './OrganicShapes';
import Navbar from './Navbar';

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="relative min-h-screen">
      <NoiseOverlay />
      <OrganicShapes />
      <Navbar />
      <main className="relative z-10 pt-16">
        {children}
      </main>
    </div>
  );
}
