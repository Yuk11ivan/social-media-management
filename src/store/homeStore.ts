import { create } from 'zustand';

interface HomeState {
  targetSlide: number | null;
  setTargetSlide: (index: number) => void;
  clearTargetSlide: () => void;
}

export const useHomeStore = create<HomeState>()((set) => ({
  targetSlide: null,
  setTargetSlide: (index) => set({ targetSlide: index }),
  clearTargetSlide: () => set({ targetSlide: null }),
}));
