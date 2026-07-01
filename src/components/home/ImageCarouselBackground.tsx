import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import hero1 from '../../assets/hero/hero-1.jpg';
import hero2 from '../../assets/hero/hero-2.jpg';
import hero3 from '../../assets/hero/hero-3.png';
import hero4 from '../../assets/hero/hero-4.png';
import hero5 from '../../assets/hero/hero-5.png';

const DEFAULT_IMAGES = [hero1, hero2, hero3, hero4, hero5];

interface Props {
  images?: string[];
  intervalMs?: number;
  showDots?: boolean;
  autoPlay?: boolean;
}

export default function ImageCarouselBackground({
  images = DEFAULT_IMAGES,
  intervalMs = 10000,
  showDots = true,
  autoPlay = true,
}: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => clearInterval(timer);
  }, [images, intervalMs, autoPlay]);

  const src = images[index] ?? images[0];

  return (
    <div className="absolute inset-0 overflow-hidden bg-crystal-900">
      <AnimatePresence initial={false}>
        <motion.div
          key={autoPlay ? index : 0}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: autoPlay ? 1.08 : 1.02 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.4, ease: 'easeInOut' },
            scale: autoPlay
              ? { duration: intervalMs / 1000, ease: 'linear' }
              : { duration: 0 },
          }}
        >
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/65" />
      <div className="absolute inset-0 bg-black/15" />

      {showDots && autoPlay && images.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1] flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`切换到第 ${i + 1} 张背景`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
