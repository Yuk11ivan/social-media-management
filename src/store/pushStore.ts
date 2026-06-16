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
  isLoadingLogs: false,
  activePlatformTab: 'all',

  setPendingItems: (items) => set({ pendingItems: items }),

  pushContent: async (platform, item) => {
    set({ isPushing: true });
    try {
      await platformApi.push(platform, undefined, {
        platform,
        platform_name: item.platform_name,
        title: item.title,
        content: item.content,
        hashtags: item.hashtags,
        image: item.image,
        images: item.images,
      });
      set((s) => ({
        pendingItems: s.pendingItems.filter(
          (i) => !(i.platform === platform && i.title === item.title)
        ),
      }));
      await get().fetchLogs(platform);
      return true;
    } catch {
      return false;
    } finally {
      set({ isPushing: false });
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
