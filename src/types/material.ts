import type { PlatformId } from './platform';

export interface Material {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
  platform?: PlatformId;
  file_size?: number;
  created_at: string;
}
