import type { PlatformId, PlatformConfig } from '../types/platform';

export const PLATFORMS: Record<PlatformId, PlatformConfig> = {
  wechat: {
    id: 'wechat',
    name: '微信公众号',
    icon: 'MessageCircle',
    color: '#07C160',
    bgClass: 'bg-wechat/10',
    textClass: 'text-wechat',
    borderClass: 'border-wechat/30',
    hoverBgClass: 'hover:bg-wechat/5',
    apiStatus: 'live',
    description: '图文草稿推送，Markdown自动转微信HTML，支持多种发布主题',
    contentStyle: '专业、正式、无emoji、适合长文阅读',
    bindRequired: true,
  },
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    icon: 'Heart',
    color: '#FF2442',
    bgClass: 'bg-xiaohongshu/10',
    textClass: 'text-xiaohongshu',
    borderClass: 'border-xiaohongshu/30',
    hoverBgClass: 'hover:bg-xiaohongshu/5',
    apiStatus: 'live',
    description: '种草笔记发布，Chrome 自动填入编辑器，支持图文+话题标签',
    contentStyle: '活泼、emoji丰富、短句排版、话题标签',
    bindRequired: true,
  },
  douyin: {
    id: 'douyin',
    name: '抖音',
    icon: 'Music',
    color: '#000000',
    bgClass: 'bg-douyin/10',
    textClass: 'text-douyin',
    borderClass: 'border-douyin/30',
    hoverBgClass: 'hover:bg-douyin/5',
    apiStatus: 'live',
    description: '图文发布，Chrome 自动上传图片并填入标题+描述+话题',
    contentStyle: '标题简洁有力、正文结构清晰、热门精准话题标签',
    bindRequired: true,
  },
  weibo: {
    id: 'weibo',
    name: '微博',
    icon: 'AtSign',
    color: '#E6162D',
    bgClass: 'bg-weibo/10',
    textClass: 'text-weibo',
    borderClass: 'border-weibo/30',
    hoverBgClass: 'hover:bg-weibo/5',
    apiStatus: 'live',
    description: '普通微博与头条文章，Chrome 自动填入编辑器',
    contentStyle: '话题引导、短小精悍、热搜关键词、互动性强',
    bindRequired: true,
  },
};

export const PLATFORM_ORDER: PlatformId[] = ['wechat', 'xiaohongshu', 'douyin', 'weibo'];

export function getPlatform(id: PlatformId): PlatformConfig {
  return PLATFORMS[id];
}

export function getActivePlatforms(): PlatformConfig[] {
  return PLATFORM_ORDER.map((id) => PLATFORMS[id]).filter(
    (p) => p.apiStatus !== 'planned'
  );
}
