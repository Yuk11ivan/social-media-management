import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ImageCarouselBackground from './ImageCarouselBackground';
import HeroSlideLayout, { type TagLine } from './HeroSlideLayout';

export interface HomeSlide {
  id: string;
  label: string;
  badge: string;
  title: ReactNode;
  subtitle: string;
  actions?: ReactNode;
  extra?: ReactNode;
  tags: TagLine[];
}

interface Props {
  slides: HomeSlide[];
  footer?: ReactNode;
  intervalMs?: number;
}

export default function HomeFullPageCarousel({ slides, footer, intervalMs = 8000 }: Props) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const slide = slides[index];

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs]);

  const prev = () => setIndex((i) => (i - 1 + count) % count);
  const next = () => setIndex((i) => (i + 1) % count);

  return (
    <div className="relative h-screen overflow-hidden bg-crystal-900">
      <ImageCarouselBackground showDots={false} />

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-1 flex items-center px-6 sm:px-8 pt-16 pb-28">
          <div className="w-full max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <HeroSlideLayout
                  badge={slide.badge}
                  title={slide.title}
                  subtitle={slide.subtitle}
                  actions={slide.actions}
                  extra={slide.extra}
                  tags={slide.tags}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20">
          {footer && (
            <div className="border-t border-white/10 bg-black/25 backdrop-blur-md px-4 py-3">
              {footer}
            </div>
          )}

          <div className={`flex items-center justify-between gap-3 px-4 sm:px-8 ${footer ? 'pb-3 pt-2' : 'pb-6 pt-2'}`}>
            <button
              type="button"
              onClick={prev}
              aria-label="上一屏"
              className="w-9 h-9 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors flex items-center justify-center shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-wrap justify-center gap-1.5 max-w-[70vw]">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  title={s.label}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              aria-label="下一屏"
              className="w-9 h-9 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors flex items-center justify-center shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
