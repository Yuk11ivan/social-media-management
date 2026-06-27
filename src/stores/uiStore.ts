import { create } from 'zustand';

interface UIState {
  /** Whether the sidebar is collapsed to icon-only mode */
  sidebarCollapsed: boolean;
  /** Whether the page has been scrolled past the threshold */
  isScrolled: boolean;
  /** Toggle sidebar collapse */
  toggleSidebar: () => void;
  /** Set sidebar collapse state */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Set scrolled state */
  setIsScrolled: (scrolled: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  isScrolled: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setIsScrolled: (scrolled) => set({ isScrolled: scrolled }),
}));
