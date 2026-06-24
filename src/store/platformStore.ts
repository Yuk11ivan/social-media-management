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
  fetchWeiboStatus: () => Promise<void>;
  bindWeibo: (accountName?: string, profileDir?: string) => Promise<void>;
  testWeibo: () => Promise<{ success: boolean; message: string }>;
  openWeiboLogin: () => Promise<{ success: boolean; message: string }>;
  unbindWeibo: () => Promise<void>;
  fetchXiaohongshuStatus: () => Promise<void>;
  bindXiaohongshu: (accountName?: string, profileDir?: string) => Promise<void>;
  testXiaohongshu: () => Promise<{ success: boolean; message: string }>;
  openXiaohongshuLogin: () => Promise<{ success: boolean; message: string }>;
  unbindXiaohongshu: () => Promise<void>;
  fetchAllStatuses: () => Promise<void>;
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
    xiaohongshu: defaultStatus('xiaohongshu'),
    douyin: { ...defaultStatus('douyin'), accountName: '即将上线' },
    weibo: defaultStatus('weibo'),
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
          wechat: {
            platformId: 'wechat',
            bound: data.bound,
            connected: data.connected,
            accountName: data.account_name,
            accountId: data.account_id,
          },
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

  fetchWeiboStatus: async () => {
    set({ isLoading: true });
    try {
      const data = await platformApi.getWeiboStatus();
      set((s) => ({
        statuses: {
          ...s.statuses,
          weibo: {
            platformId: 'weibo',
            bound: data.bound,
            connected: data.connected,
            accountName: data.account_name,
            appId: data.profile_dir,
          },
        },
      }));
    } catch {
      // keep default
    } finally {
      set({ isLoading: false });
    }
  },

  bindWeibo: async (accountName, profileDir) => {
    set({ isBinding: true });
    try {
      await platformApi.bindWeibo({
        account_name: accountName,
        profile_dir: profileDir,
      });
      await get().fetchWeiboStatus();
    } finally {
      set({ isBinding: false });
    }
  },

  testWeibo: async () => {
    set({ isTesting: true });
    try {
      return await platformApi.testWeibo();
    } finally {
      set({ isTesting: false });
    }
  },

  openWeiboLogin: async () => {
    return await platformApi.openWeiboLogin();
  },

  unbindWeibo: async () => {
    set({ isLoading: true });
    try {
      await platformApi.unbindWeibo();
      set((s) => ({
        statuses: { ...s.statuses, weibo: defaultStatus('weibo') },
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  fetchXiaohongshuStatus: async () => {
    set({ isLoading: true });
    try {
      const data = await platformApi.getXiaohongshuStatus();
      set((s) => ({
        statuses: {
          ...s.statuses,
          xiaohongshu: {
            platformId: 'xiaohongshu',
            bound: data.bound,
            connected: data.connected,
            accountName: data.account_name,
            appId: data.profile_dir,
          },
        },
      }));
    } catch {
      // keep default
    } finally {
      set({ isLoading: false });
    }
  },

  bindXiaohongshu: async (accountName, profileDir) => {
    set({ isBinding: true });
    try {
      await platformApi.bindXiaohongshu({
        account_name: accountName,
        profile_dir: profileDir,
      });
      await get().fetchXiaohongshuStatus();
    } finally {
      set({ isBinding: false });
    }
  },

  testXiaohongshu: async () => {
    set({ isTesting: true });
    try {
      return await platformApi.testXiaohongshu();
    } finally {
      set({ isTesting: false });
    }
  },

  openXiaohongshuLogin: async () => {
    return await platformApi.openXiaohongshuLogin();
  },

  unbindXiaohongshu: async () => {
    set({ isLoading: true });
    try {
      await platformApi.unbindXiaohongshu();
      set((s) => ({
        statuses: { ...s.statuses, xiaohongshu: defaultStatus('xiaohongshu') },
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllStatuses: async () => {
    await Promise.all([
      get().fetchWechatStatus(),
      get().fetchWeiboStatus(),
      get().fetchXiaohongshuStatus(),
    ]);
  },

  setIsLoading: (v) => set({ isLoading: v }),
}));
