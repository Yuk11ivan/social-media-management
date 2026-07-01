import type { PlatformId } from './platform';

export interface PlatformContent {
  platform: PlatformId;
  platform_name: string;
  title: string;
  content: string;
  hashtags?: string[] | string;
  image?: string;
  images?: string[];
}

export interface ContentGenerateRequest {
  text: string;
  image?: string;
  platforms: PlatformId[];
}

export interface ContentGenerateResponse {
  results: PlatformContent[];
  timestamp: string;
}

export interface ContentSaveRequest {
  original_text: string;
  original_image?: string;
  adapted_contents: PlatformContent[];
}

export interface AdaptedContent {
  id: string;
  item_id: string;
  platform: PlatformId;
  platform_name: string;
  title: string;
  content: string;
  hashtags?: string[] | string;
  image?: string;
  images?: string[];
  created_at: string;
}

export interface ContentItem {
  id: string;
  original_text: string;
  original_image?: string;
  original_images?: string[];
  created_at: string;
  adapted_contents?: AdaptedContent[];
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
}
