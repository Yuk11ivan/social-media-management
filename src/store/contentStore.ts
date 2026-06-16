import { create } from 'zustand';
import type { PlatformId } from '../types/platform';
import type { PlatformContent } from '../types/content';
import { contentApi } from '../config/api';

interface ContentState {
  inputText: string;
  inputImages: string[];          // 多图支持
  selectedPlatforms: PlatformId[];
  results: PlatformContent[];
  isGenerating: boolean;
  error: string | null;
  setInputText: (text: string) => void;
  addImage: (image: string) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
  togglePlatform: (platform: PlatformId) => void;
  setSelectedPlatforms: (platforms: PlatformId[]) => void;
  generate: () => Promise<void>;
  saveContent: () => Promise<number | null>;
  reset: () => void;
  clearError: () => void;
}

const MAX_IMAGES = 9; // 微信图文最多9张图片

export const useContentStore = create<ContentState>()((set, get) => ({
  inputText: '',
  inputImages: [],
  selectedPlatforms: ['wechat'],
  results: [],
  isGenerating: false,
  error: null,

  setInputText: (text) => set({ inputText: text }),

  addImage: (image) =>
    set((s) => {
      if (s.inputImages.length >= MAX_IMAGES) return s;
      return { inputImages: [...s.inputImages, image] };
    }),

  removeImage: (index) =>
    set((s) => ({
      inputImages: s.inputImages.filter((_, i) => i !== index),
    })),

  clearImages: () => set({ inputImages: [] }),

  togglePlatform: (platform) =>
    set((s) => {
      const isSelected = s.selectedPlatforms.includes(platform);
      if (isSelected && s.selectedPlatforms.length <= 1) return s;
      return {
        selectedPlatforms: isSelected
          ? s.selectedPlatforms.filter((p) => p !== platform)
          : [...s.selectedPlatforms, platform],
      };
    }),

  setSelectedPlatforms: (platforms) => set({ selectedPlatforms: platforms }),

  generate: async () => {
    const { inputText, inputImages, selectedPlatforms } = get();
    if (!inputText.trim()) {
      set({ error: '请输入要发布的内容' });
      return;
    }
    set({ isGenerating: true, error: null, results: [] });
    try {
      // 只发送 images 数组，避免与 image 字段重复
      const data = await contentApi.generate(
        inputText,
        null,  // 不再单独发送 image，统一用 images
        inputImages.length > 0 ? inputImages : null,
        selectedPlatforms
      );
      set({
        results: data.results.map((r) => ({
          platform: r.platform as PlatformId,
          platform_name: r.platform_name,
          title: r.title,
          content: r.content,
          hashtags: r.hashtags,
          image: r.image || (inputImages.length > 0 ? inputImages[0] : undefined),
          images: r.images && r.images.length > 0 ? r.images : inputImages,
        })),
        isGenerating: false,
      });
    } catch (err: any) {
      set({ error: err.message || '生成失败，请重试', isGenerating: false });
    }
  },

  saveContent: async () => {
    const { inputText, inputImages, results } = get();
    try {
      const data = await contentApi.save({
        original_text: inputText,
        original_image: inputImages.length > 0 ? inputImages[0] : undefined,
        adapted_contents: results,
      });
      return data.id;
    } catch {
      return null;
    }
  },

  reset: () =>
    set({
      inputText: '',
      inputImages: [],
      results: [],
      error: null,
    }),

  clearError: () => set({ error: null }),
}));
