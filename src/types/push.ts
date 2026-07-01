import type { PlatformId } from './platform';

export interface PushLog {
  id: string;
  adapted_content_id?: string | null;
  platform: PlatformId;
  platform_name: string;
  status: 'success' | 'failed' | 'pending';
  content_id?: string;
  message?: string;
  created_at: string;
}
