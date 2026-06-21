import { motion, AnimatePresence } from 'framer-motion';
import { Send, Check, Loader2 } from 'lucide-react';

interface PushButtonProps {
  platform: string;
  platformColor: string;
  isPushing: boolean;
  isDisabled: boolean;
  progress: number; // 0-100
  onClick: () => void;
}

// 根据平台色生成渐变色系
function getGradientColors(baseColor: string, progress: number) {
  // 基于平台色生成 3 个阶段的渐变
  const p = progress / 100;

  // 起始：柔和的平台色
  const start = baseColor + '30';
  // 中间：平台色
  const mid = baseColor + '90';
  // 结尾：翡翠绿（成功色）
  const successColor = '#10b981';

  if (progress >= 100) {
    return {
      bg: successColor,
      glow: successColor + '40',
    };
  }

  return {
    bg: baseColor,
    glow: baseColor + '30',
  };
}

export default function PushButton({
  platformColor,
  isPushing,
  isDisabled,
  progress,
  onClick,
}: PushButtonProps) {
  const isDone = isPushing && progress >= 100;

  // 圆角矩形路径参数
  const w = 88;
  const h = 36;
  const r = 12;
  const pad = 4;
  const x = pad;
  const y = pad;

  // 圆角矩形周长
  const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;

  const rectPath = `M ${x + r} ${y}
    H ${x + w - r}
    Q ${x + w} ${y} ${x + w} ${y + r}
    V ${y + h - r}
    Q ${x + w} ${y + h} ${x + w - r} ${y + h}
    H ${x + r}
    Q ${x} ${y + h} ${x} ${y + h - r}
    V ${y + r}
    Q ${x} ${y} ${x + r} ${y} Z`;

  const dashOffset = perimeter - (perimeter * Math.min(progress, 100)) / 100;

  // 渐变色
  const gradientId = `push-grad-${platformColor.replace('#', '')}`;
  const colors = getGradientColors(platformColor, progress);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className="relative inline-flex items-center justify-center"
      style={{ width: w + pad * 2, height: h + pad * 2 }}
    >
      {/* SVG 圆环进度 */}
      {isPushing && (
        <motion.svg
          className="absolute inset-0 pointer-events-none"
          width={w + pad * 2}
          height={h + pad * 2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={platformColor} stopOpacity="0.3" />
              <stop offset="50%" stopColor={platformColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* 底层轨道 */}
          <path
            d={rectPath}
            fill="none"
            stroke={platformColor + '15'}
            strokeWidth={2.5}
          />
          {/* 进度填充 — 渐变色 */}
          <motion.path
            d={rectPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={perimeter}
            initial={{ strokeDashoffset: perimeter }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </motion.svg>
      )}

      {/* 按钮主体 */}
      <motion.div
        className="absolute rounded-xl flex items-center justify-center gap-1.5 text-white text-sm font-medium overflow-hidden"
        style={{
          left: pad,
          top: pad,
          width: w,
          height: h,
        }}
        animate={{
          scale: isDone ? [1, 1.05, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* 背景渐变填充 */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: isDone
              ? '#10b981'
              : isPushing
              ? `linear-gradient(90deg, ${platformColor}dd ${progress}%, ${platformColor}66 ${progress}%)`
              : platformColor,
          }}
          animate={{
            boxShadow: isPushing
              ? `0 4px 20px ${platformColor}50`
              : `0 2px 8px ${platformColor}30`,
          }}
        />

        {/* 光泽动画 */}
        {isPushing && !isDone && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          />
        )}

        {/* 文字内容 */}
        <div className="relative z-10 flex items-center gap-1.5">
          <AnimatePresence mode="wait">
            {isDone ? (
              <motion.div
                key="done"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span>完成</span>
              </motion.div>
            ) : isPushing ? (
              <motion.div
                key="pushing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Loader2 className="w-3.5 h-3.5" />
                </motion.div>
                <span className="tabular-nums">{Math.round(progress)}%</span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>推送</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </button>
  );
}
