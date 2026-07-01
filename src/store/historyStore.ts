import { create } from 'zustand';
import type { PlatformId } from '../types/platform';
import type { ContentItem } from '../types/content';
import type { PushLog } from '../types/push';
import { contentApi, pushApi } from '../config/api';
import { sanitizeWechatContent } from '../utils/content';

function sanitizeContentItems(items: ContentItem[]): ContentItem[] {
  return items.map((item) => ({
    ...item,
    adapted_contents: (item.adapted_contents || []).map((ac) => ({
      ...ac,
      content: ac.platform === 'wechat' ? sanitizeWechatContent(ac.content) : ac.content,
    })),
  }));
}

interface HistoryState {
  contentItems: ContentItem[];
  pushLogs: PushLog[];
  contentTotal: number;
  isLoading: boolean;
  error: string | null;
  platformTab: PlatformId | 'all';
  fetchHistory: (platform?: PlatformId | 'all') => Promise<void>;
  deleteContent: (id: string) => Promise<boolean>;
  setPlatformTab: (tab: PlatformId | 'all') => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  contentItems: [],
  pushLogs: [],
  contentTotal: 0,
  isLoading: false,
  error: null,
  platformTab: 'all',

  setPlatformTab: (tab) => {
    set({ platformTab: tab });
    get().fetchHistory(tab);
  },

  fetchHistory: async (platform) => {
    const tab = platform ?? get().platformTab;
    set({ isLoading: true, error: null, platformTab: tab });
    try {
      const platformParam = tab === 'all' ? undefined : tab;
      const [contentRes, pushRes] = await Promise.all([
        contentApi.list(100, 0, platformParam),
        pushApi.getLogs(platformParam, 100),
      ]);
      set({
        contentItems: sanitizeContentItems((contentRes.items || []) as ContentItem[]),        contentTotal: contentRes.total || 0,
        pushLogs: (pushRes.logs || []) as PushLog[],
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载历史记录失败';
      set({ isLoading: false, error: message });
    }
  },

  deleteContent: async (id) => {
    try {
      await contentApi.delete(id);
      set((s) => ({
        contentItems: s.contentItems.filter((i) => i.id !== id),
        contentTotal: Math.max(0, s.contentTotal - 1),
      }));
      return true;
    } catch {
      return false;
    }
  },
}));
