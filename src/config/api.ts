import type { PlatformId } from '../types/platform';
import { getPlatform } from '../config/platforms';

// 留空走 Vite 代理，避免跨域；部署时通过环境变量指定
const API_BASE = import.meta.env.VITE_API_BASE || '';

function getToken(): string | null {
  try {
    const data = localStorage.getItem('auth-storage');
    if (data) {
      const parsed = JSON.parse(data);
      return parsed?.state?.token || null;
    }
  } catch {
    // ignore
  }
  return null;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = authHeaders();

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('auth-storage');
    window.location.href = '/account';
    throw new ApiError(401, '未授权，请重新登录');
  }

  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const errData = await res.json();
      message = errData.detail || errData.message || message;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }

  return res.json();
}

// === Auth API ===
export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  nickname?: string;
}

export const authApi = {
  login: (data: LoginParams) =>
    apiFetch<{ access_token: string; token_type: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: RegisterParams) =>
    apiFetch<{ access_token: string; token_type: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => apiFetch<{ id: string; email: string; nickname?: string; phone?: string; created_at?: string }>('/api/auth/me'),

  updateProfile: (data: { nickname?: string; phone?: string }) =>
    apiFetch<{ id: string; email: string; nickname?: string; phone?: string; created_at?: string }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { old_password: string; new_password: string }) =>
    apiFetch<{ message: string }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// === Content API ===
export const contentApi = {
  generate: (text: string, image: string | null, images: string[] | null, platforms: PlatformId[]) =>
    apiFetch<{
      results: Array<{
        platform: string;
        platform_name: string;
        title: string;
        content: string;
        hashtags?: string;
        image?: string;
        images?: string[];
      }>;
      timestamp: string;
    }>('/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({ text, image, images, platforms }),
    }),

  save: (data: {
    original_text: string;
    original_image?: string;
    original_images?: string[];
    adapted_contents: unknown[];
  }) =>
    apiFetch<{ id: string }>('/api/content/save', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (limit = 20, offset = 0, platform?: string) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (platform) params.set('platform', platform);
    return apiFetch<{ items: unknown[]; total: number }>(
      `/api/content/list?${params.toString()}`
    );
  },

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/content/${id}`, {
      method: 'DELETE',
    }),
};

// === Platform API ===
export const platformApi = {
  getWechatStatus: () =>
    apiFetch<{
      bound: boolean;
      connected: boolean;
      account_name?: string;
      account_id?: string;
    }>('/api/platforms/wechat/status'),

  bindWechat: (data: { app_id: string; app_secret: string; account_name?: string }) =>
    apiFetch<{ message: string }>('/api/platforms/wechat/bind', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  testWechat: () =>
    apiFetch<{ message: string }>('/api/platforms/wechat/test', {
      method: 'POST',
    }),

  unbindWechat: () =>
    apiFetch<{ message: string }>('/api/platforms/wechat/unbind', {
      method: 'DELETE',
    }),

  getWeiboStatus: () =>
    apiFetch<{
      bound: boolean;
      connected: boolean;
      account_name?: string;
      profile_dir?: string;
      chrome_ready?: boolean;
      bun_ready?: boolean;
      message?: string;
    }>('/api/platforms/weibo/status'),

  bindWeibo: (data: { account_name?: string; profile_dir?: string }) =>
    apiFetch<{ message: string }>('/api/platforms/weibo/bind', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  testWeibo: () =>
    apiFetch<{ success: boolean; message: string }>('/api/platforms/weibo/test', {
      method: 'POST',
    }),

  openWeiboLogin: () =>
    apiFetch<{ success: boolean; message: string }>('/api/platforms/weibo/open-login', {
      method: 'POST',
    }),

  unbindWeibo: () =>
    apiFetch<{ message: string }>('/api/platforms/weibo/unbind', {
      method: 'DELETE',
    }),

  // 小红书
  getXiaohongshuStatus: () =>
    apiFetch<{
      bound: boolean;
      connected: boolean;
      account_name?: string;
      profile_dir?: string;
      chrome_ready?: boolean;
      bun_ready?: boolean;
      deps_ready?: boolean;
      message?: string;
    }>('/api/platforms/xiaohongshu/status'),

  bindXiaohongshu: (data: { account_name?: string; profile_dir?: string }) =>
    apiFetch<{ message: string }>('/api/platforms/xiaohongshu/bind', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  testXiaohongshu: () =>
    apiFetch<{ success: boolean; message: string }>('/api/platforms/xiaohongshu/test', {
      method: 'POST',
    }),

  openXiaohongshuLogin: () =>
    apiFetch<{ success: boolean; message: string }>('/api/platforms/xiaohongshu/open-login', {
      method: 'POST',
    }),

  unbindXiaohongshu: () =>
    apiFetch<{ message: string }>('/api/platforms/xiaohongshu/unbind', {
      method: 'DELETE',
    }),

  // 抖音
  getDouyinStatus: () =>
    apiFetch<{
      bound: boolean; connected: boolean; account_name?: string;
      profile_dir?: string; chrome_ready?: boolean; bun_ready?: boolean;
      deps_ready?: boolean; message?: string;
    }>('/api/platforms/douyin/status'),

  bindDouyin: (data: { account_name?: string; profile_dir?: string }) =>
    apiFetch<{ message: string }>('/api/platforms/douyin/bind', {
      method: 'POST', body: JSON.stringify(data),
    }),

  testDouyin: () =>
    apiFetch<{ success: boolean; message: string }>('/api/platforms/douyin/test', {
      method: 'POST',
    }),

  openDouyinLogin: () =>
    apiFetch<{ success: boolean; message: string }>('/api/platforms/douyin/open-login', {
      method: 'POST',
    }),

  unbindDouyin: () =>
    apiFetch<{ message: string }>('/api/platforms/douyin/unbind', {
      method: 'DELETE',
    }),

  push: (platformId: string, adaptedContentId?: number, content?: unknown) =>
    apiFetch<{ message: string; content_id?: string }>(
      `/api/platform/push?platform=${platformId}`,
      {
        method: 'POST',
        body: JSON.stringify(content || { adapted_content_id: adaptedContentId }),
      }
    ),
};

// === Push API ===
export const pushApi = {
  getLogs: (platform?: string, limit = 20) =>
    apiFetch<{ logs: unknown[] }>(
      `/api/push/logs?platform=${platform || ''}&limit=${limit}`
    ),
};

// === Image Generation API ===
export const imageApi = {
  extractKeywords: (content: string, title?: string) =>
    apiFetch<{
      keywords: {
        scene: string;
        style: string;
        color_tone: string;
        subject: string;
        mood: string;
        cn_prompt: string;
        negative_prompt: string;
      };
    }>('/api/image/extract-keywords', {
      method: 'POST',
      body: JSON.stringify({ content, title }),
    }),

  generate: (prompt: string, negative_prompt?: string, size?: string) =>
    apiFetch<{ images: string[]; count: number }>('/api/image/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, negative_prompt, size }),
    }),
};

export { getToken, API_BASE, getPlatform };

// === System API ===
export const systemApi = {
  getServerIp: () => apiFetch<{ ip: string }>('/api/system/server-ip'),
};
