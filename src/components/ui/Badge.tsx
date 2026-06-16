import type { ReactNode } from 'react';
import type { PlatformId } from '../../types/platform';
import { PLATFORMS } from '../../config/platforms';

interface Props {
  platform: PlatformId;
  children?: ReactNode;
  size?: 'sm' | 'md';
}

export default function Badge({ platform, children, size = 'sm' }: Props) {
  const config = PLATFORMS[platform];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: config.color + '16',
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <span className="font-heading font-bold text-[10px] uppercase tracking-wide">
        {platform === 'wechat' ? 'WX' : platform === 'xiaohongshu' ? 'XHS' : platform === 'douyin' ? 'DY' : 'WB'}
      </span>
      {children || config.name}
    </span>
  );
}
