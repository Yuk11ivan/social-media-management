import type { PlatformId } from '../../types/platform';
import { PLATFORMS } from '../../config/platforms';
import { MessageCircle, Heart, Music, AtSign } from 'lucide-react';

interface Props {
  platform: PlatformId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ICON_MAP = {
  wechat: MessageCircle,
  xiaohongshu: Heart,
  douyin: Music,
  weibo: AtSign,
};

const SIZE_MAP = { sm: 14, md: 18, lg: 24 };

export default function PlatformIcon({ platform, size = 'md', className = '' }: Props) {
  const config = PLATFORMS[platform];
  const Icon = ICON_MAP[platform];
  const px = SIZE_MAP[size];

  return (
    <div
      className={`flex items-center justify-center rounded-lg ${className}`}
      style={{ backgroundColor: config.color + '18' }}
    >
      <Icon size={px} color={config.color} />
    </div>
  );
}
