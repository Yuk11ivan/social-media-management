export type PlatformId = 'wechat' | 'xiaohongshu' | 'douyin' | 'weibo';

export type ApiStatus = 'live' | 'mock' | 'planned';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hoverBgClass: string;
  apiStatus: ApiStatus;
  description: string;
  contentStyle: string;
  bindRequired: boolean;
}

export interface PlatformBindStatus {
  platformId: PlatformId;
  bound: boolean;
  connected: boolean;
  accountName?: string;
  accountId?: string;
  appId?: string;
}
