import { create } from 'zustand';
import type { PlatformId, PlatformBindStatus } from '../types/platform';
import { platformApi } from '../config/api';

interface PlatformState {
  statuses: Record<PlatformId, PlatformBindStatus>;
  isLoading: boolean;
  isBinding: boolean;
  isTesting: boolean;
  fetchWechatStatus: () => Promise<void>;
  bindWechat: (appId: string, appSecret: string, accountName?: string) => Promise<void>;
  testWechat: () => Promise<void>;
  unbindWechat: () => Promise<void>;
  setIsLoading: (v: boolean) => void;
}

function defaultStatus(platformId: PlatformId): PlatformBindStatus {
  return {
    platformId,
    bound: false,
    connected: false,
  };
}

export const usePlatformStore = create<PlatformState>()((set, get) => ({
  statuses: {
    wechat: defaultStatus('wechat'),
    xiaohongshu: { ...defaultStatus('xiaohongshu'), accountName: '即将上线' },
    douyin: { ...defaultStatus('douyin'), accountName: '即将上线' },
    weibo: { ...defaultStatus('weibo'), accountName: '即将上线' },
  },
  isLoading: false,
  isBinding: false,
  isTesting: false,

  fetchWechatStatus: async () => {
    set({ isLoading: true });
    try {
      const data = await platformApi.getWechatStatus();
      set((s) => ({
        statuses: {
          ...s.statuses,
          wechat: { ...data, platformId: 'wechat' as PlatformId },
        },
      }));
    } catch {
      // keep default
    } finally {
      set({ isLoading: false });
    }
  },

  bindWechat: async (appId, appSecret, accountName) => {
    set({ isBinding: true });
    try {
      await platformApi.bindWechat({ app_id: appId, app_secret: appSecret, account_name: accountName });
      await get().fetchWechatStatus();
    } finally {
      set({ isBinding: false });
    }
  },

  testWechat: async () => {
    set({ isTesting: true });
    try {
      await platformApi.testWechat();
    } finally {
      set({ isTesting: false });
    }
  },

  unbindWechat: async () => {
    set({ isLoading: true });
    try {
      await platformApi.unbindWechat();
      set((s) => ({
        statuses: { ...s.statuses, wechat: defaultStatus('wechat') },
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  setIsLoading: (v) => set({ isLoading: v }),
}));
