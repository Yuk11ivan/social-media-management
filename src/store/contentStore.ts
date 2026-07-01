import { create } from 'zustand';
import type { PlatformId } from '../types/platform';
import type { PlatformContent } from '../types/content';
import { contentApi } from '../config/api';
import { sanitizeWechatContent } from '../utils/content';

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
  updateResult: (platform: PlatformId, updates: Partial<Pick<PlatformContent, 'title' | 'content' | 'hashtags'>>) => void;
  generate: () => Promise<void>;
  saveContent: () => Promise<string | null>;
  loadDraft: (item: import('../types/content').ContentItem) => Promise<void>;
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

  updateResult: (platform, updates) =>
    set((s) => ({
      results: s.results.map((r) =>
        r.platform === platform ? { ...r, ...updates } : r
      ),
    })),

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
      const mapped = data.results.map((r) => ({
        platform: r.platform as PlatformId,
        platform_name: r.platform_name,
        title: r.title,
        content: r.platform === 'wechat' ? sanitizeWechatContent(r.content) : r.content,
        hashtags: r.hashtags,
        image: r.image || (inputImages.length > 0 ? inputImages[0] : undefined),
        images: r.images && r.images.length > 0 ? r.images : inputImages,
      }));
      set({ results: mapped, isGenerating: false });
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
        original_images: inputImages.length > 0 ? inputImages : undefined,
        adapted_contents: results,
      });
      return data.id;
    } catch {
      return null;
    }
  },

  loadDraft: async (item) => {
    const toDataUrl = async (src: string): Promise<string> => {
      if (src.startsWith('data:')) return src;
      const res = await fetch(src);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    const imageSources = item.original_images?.length
      ? item.original_images
      : item.original_image
        ? [item.original_image]
        : [];

    const inputImages: string[] = [];
    for (const src of imageSources) {
      try {
        inputImages.push(await toDataUrl(src));
      } catch {
        // skip broken image
      }
    }

    const platforms = (item.adapted_contents || []).map((ac) => ac.platform as PlatformId);

    set({
      inputText: item.original_text,
      inputImages,
      selectedPlatforms: platforms.length > 0 ? platforms : get().selectedPlatforms,
      results: (item.adapted_contents || []).map((ac) => ({
        platform: ac.platform,
        platform_name: ac.platform_name,
        title: ac.title,
        content: ac.platform === 'wechat' ? sanitizeWechatContent(ac.content) : ac.content,
        hashtags: ac.hashtags,
        image: ac.image,
        images: ac.images?.length ? ac.images : inputImages,
      })),
      error: null,
    });
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
