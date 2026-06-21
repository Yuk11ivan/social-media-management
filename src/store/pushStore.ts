import { create } from 'zustand';
import type { PlatformId } from '../types/platform';
import type { PushLog } from '../types/push';
import { pushApi, platformApi } from '../config/api';

interface PushState {
  pendingItems: Array<{
    platform: PlatformId;
    platform_name: string;
    title: string;
    content: string;
    hashtags?: string;
    image?: string;
    images?: string[];
  }>;
  logs: PushLog[];
  isPushing: boolean;
  pushingKey: string | null;  // 当前正在推送的 item key
  pushProgress: number;       // 0-100 推送进度
  isLoadingLogs: boolean;
  activePlatformTab: PlatformId | 'all';
  setPendingItems: (items: PushState['pendingItems']) => void;
  pushContent: (platform: PlatformId, item: PushState['pendingItems'][0]) => Promise<boolean>;
  pushAll: () => Promise<void>;
  fetchLogs: (platform?: string) => Promise<void>;
  setActivePlatformTab: (tab: PlatformId | 'all') => void;
  clearPending: () => void;
}

export const usePushStore = create<PushState>()((set, get) => ({
  pendingItems: [],
  logs: [],
  isPushing: false,
  pushingKey: null,
  pushProgress: 0,
  isLoadingLogs: false,
  activePlatformTab: 'all',

  setPendingItems: (items) => set({ pendingItems: items }),

  pushContent: async (platform, item) => {
    const key = `${platform}-${item.title}`;
    set({ isPushing: true, pushingKey: key, pushProgress: 10 });

    // 模拟进度：准备中 → 推送中 → 完成
    const progressTimer = setTimeout(() => set({ pushProgress: 40 }), 500);
    const progressTimer2 = setTimeout(() => set({ pushProgress: 70 }), 2000);
    const progressTimer3 = setTimeout(() => set({ pushProgress: 90 }), 5000);

    try {
      set({ pushProgress: 20 });
      await platformApi.push(platform, undefined, {
        platform,
        platform_name: item.platform_name,
        title: item.title,
        content: item.content,
        hashtags: item.hashtags,
        image: item.image,
        images: item.images,
      });
      set({ pushProgress: 100 });
      set((s) => ({
        pendingItems: s.pendingItems.filter(
          (i) => !(i.platform === platform && i.title === item.title)
        ),
      }));
      await get().fetchLogs(platform);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '推送失败';
      throw new Error(message);
    } finally {
      clearTimeout(progressTimer);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      // 延迟重置，让 100% 动画播放完
      setTimeout(() => {
        set({ isPushing: false, pushingKey: null, pushProgress: 0 });
      }, 600);
    }
  },

  pushAll: async () => {
    const { pendingItems } = get();
    for (const item of pendingItems) {
      await get().pushContent(item.platform, item);
    }
  },

  fetchLogs: async (platform) => {
    set({ isLoadingLogs: true });
    try {
      const data = await pushApi.getLogs(platform, 30);
      set({ logs: (data.logs || []) as PushLog[] });
    } catch {
      // keep existing
    } finally {
      set({ isLoadingLogs: false });
    }
  },

  setActivePlatformTab: (tab) => set({ activePlatformTab: tab }),
  clearPending: () => set({ pendingItems: [] }),
}));
