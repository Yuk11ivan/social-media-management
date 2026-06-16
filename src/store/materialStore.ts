import { create } from 'zustand';
import type { Material } from '../types/material';
import { materialApi } from '../config/api';

interface MaterialState {
  materials: Material[];
  searchQuery: string;
  fileTypeFilter: string;
  isLoading: boolean;
  isUploading: boolean;
  fetchMaterials: () => Promise<void>;
  uploadMaterial: (file: File) => Promise<void>;
  deleteMaterial: (id: number) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setFileTypeFilter: (t: string) => void;
}

export const useMaterialStore = create<MaterialState>()((set, get) => ({
  materials: [],
  searchQuery: '',
  fileTypeFilter: '',
  isLoading: false,
  isUploading: false,

  fetchMaterials: async () => {
    set({ isLoading: true });
    try {
      const data = await materialApi.list(50);
      set({ materials: (data.materials || []) as Material[] });
    } catch {
      // keep existing
    } finally {
      set({ isLoading: false });
    }
  },

  uploadMaterial: async (file: File) => {
    set({ isUploading: true });
    try {
      await materialApi.upload(file);
      await get().fetchMaterials();
    } finally {
      set({ isUploading: false });
    }
  },

  deleteMaterial: async (id: number) => {
    try {
      await materialApi.delete(id);
      set((s) => ({ materials: s.materials.filter((m) => m.id !== id) }));
    } catch {
      // ignore
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setFileTypeFilter: (t) => set({ fileTypeFilter: t }),
}));
