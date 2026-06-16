import type { PlatformId } from './platform';

export interface PushLog {
  id: number;
  adapted_content_id: number;
  platform: PlatformId;
  platform_name: string;
  status: 'success' | 'failed' | 'pending';
  content_id?: string;
  message?: string;
  created_at: string;
  user_id: number;
}
