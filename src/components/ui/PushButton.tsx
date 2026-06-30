import { motion } from 'framer-motion';
import { Send, Check, Loader2 } from 'lucide-react';

interface Props {
  platformColor: string;
  isPushing: boolean;
  isDisabled: boolean;
  progress: number;
  onClick: () => void;
}

export default function PushButton({ platformColor, isPushing, isDisabled, progress, onClick }: Props) {
  const isDone = isPushing && progress >= 100;

  return (
    <motion.button
      onClick={onClick}
      disabled={isDisabled}
      whileTap={{ scale: 0.95 }}
      className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50 shrink-0 overflow-hidden"
      style={{
        background: isDone ? '#10b981' : `linear-gradient(135deg, ${platformColor}dd, ${platformColor}cc)`,
        boxShadow: isPushing ? `0 4px 16px ${platformColor}60` : `0 2px 8px ${platformColor}40`,
        minWidth: 88,
      }}
    >
      {isPushing && !isDone && (
        <>
          <div className="absolute inset-0 bg-white/10" />
          <motion.div
            className="absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
            animate={{ x: ['-150%', '350%'] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          />
        </>
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {isDone ? <><Check className="w-4 h-4" />完成</>
         : isPushing ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 className="w-4 h-4" /></motion.div>{Math.round(progress)}%</>
         : <><Send className="w-4 h-4" />推送</>}
      </span>
    </motion.button>
  );
}
