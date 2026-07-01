import type { PlatformId } from '../types/platform';
import type { ContentItem } from '../types/content';
import { sanitizeWechatContent } from './content';

export type PendingPushItem = {
  platform: PlatformId;
  platform_name: string;
  title: string;
  content: string;
  hashtags?: string;
  image?: string;
  images?: string[];
};

export function getDraftImages(item: ContentItem): string[] {
  if (item.original_images?.length) return item.original_images;
  if (item.original_image) return [item.original_image];
  return [];
}

export function contentItemToPendingItems(item: ContentItem): PendingPushItem[] {
  const draftImages = getDraftImages(item);
  return (item.adapted_contents || []).map((ac) => ({
    platform: ac.platform as PlatformId,
    platform_name: ac.platform_name,
    title: ac.title,
    content: ac.platform === 'wechat' ? sanitizeWechatContent(ac.content) : ac.content,
    hashtags: Array.isArray(ac.hashtags) ? ac.hashtags.join(' ') : ac.hashtags,
    image: ac.image || draftImages[0],
    images: ac.images?.length ? ac.images : draftImages,
  }));
}
