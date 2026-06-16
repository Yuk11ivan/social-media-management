import type { PlatformId } from './platform';

export interface PlatformContent {
  platform: PlatformId;
  platform_name: string;
  title: string;
  content: string;
  hashtags?: string;
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

export interface ContentItem {
  id: number;
  original_text: string;
  original_image?: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  adapted_contents?: AdaptedContent[];
}

export interface AdaptedContent {
  id: number;
  item_id: number;
  platform: PlatformId;
  platform_name: string;
  title: string;
  content: string;
  hashtags?: string;
  image?: string;
  created_at: string;
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
}
