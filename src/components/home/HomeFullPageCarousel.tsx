import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHomeStore } from '../../store/homeStore';
import ImageCarouselBackground from './ImageCarouselBackground';
import HeroSlideLayout, { type TagLine } from './HeroSlideLayout';

export interface HomeSlide {
  id: string;
  label: string;
  badge: string;
  title: ReactNode;
  subtitle: ReactNode;
  actions?: ReactNode;
  extra?: ReactNode;
  tags: TagLine[];
}

interface Props {
  slides: HomeSlide[];
}

export default function HomeFullPageCarousel({ slides }: Props) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const slide = slides[index];

  const targetSlide = useHomeStore((s) => s.targetSlide);
  const clearTargetSlide = useHomeStore((s) => s.clearTargetSlide);

  // Wheel: scroll down → next slide, scroll up → prev slide (debounced)
  const lastWheel = useRef(0);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 30) return; // ignore tiny scrolls
      const now = Date.now();
      if (now - lastWheel.current < 800) return; // 800ms cooldown
      lastWheel.current = now;
      if (e.deltaY > 0) {
        setIndex((i) => (i + 1) % count);
      } else {
        setIndex((i) => (i - 1 + count) % count);
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [count]);

  // Jump to slide when triggered from Navbar dropdown
  useEffect(() => {
    if (targetSlide !== null) {
      setIndex(targetSlide);
      clearTargetSlide();
    }
  }, [targetSlide, clearTargetSlide]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count]);

  return (
    <div className="relative h-screen overflow-hidden bg-crystal-900">
      <ImageCarouselBackground showDots={false} autoPlay />

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex-1 flex items-center px-6 sm:px-10 lg:px-12 pt-20 pb-10">
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
      </div>
    </div>
  );
}
