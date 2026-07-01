import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const TAG_PALETTE = ['#E8DCC8', '#D4C4A8', '#C8B590', '#F0E6D6'];

export interface TagLine {
  words: string[];
  direction: 'left' | 'right';
  speed: number;
  size: 'lg' | 'xl' | '2xl';
}

function TagRow({ words, direction, speed, size }: TagLine) {
  const extended = [...words, ...words, ...words];
  const sizeClass = size === '2xl' ? 'text-3xl sm:text-4xl' : size === 'xl' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl';

  return (
    <div className="relative w-full overflow-hidden py-2">
      <motion.div
        className="flex gap-10 whitespace-nowrap items-center"
        animate={{ x: direction === 'left' ? ['0%', '-33.333%'] : ['-33.333%', '0%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {extended.map((word, i) => (
          <span
            key={i}
            className={`shrink-0 select-none font-heading font-extrabold ${sizeClass} tracking-tight`}
            style={{ color: TAG_PALETTE[i % TAG_PALETTE.length], letterSpacing: '-0.02em' }}
          >
            {word}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

interface Props {
  badge: string;
  title: ReactNode;
  subtitle: string;
  actions?: ReactNode;
  extra?: ReactNode;
  tags: TagLine[];
}

export default function HeroSlideLayout({ badge, title, subtitle, actions, extra, tags }: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-16 lg:gap-28 items-center w-full">
      <div className="flex flex-col gap-12 sm:gap-14 lg:gap-16 max-w-xl lg:max-w-2xl">
        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full border border-white/15 bg-white/10 backdrop-blur-md w-fit">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
            <Sparkles className="w-4 h-4 text-gilt-300" />
          </motion.div>
          <span className="text-xs sm:text-sm font-semibold text-gilt-200 tracking-wide uppercase">{badge}</span>
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-heading font-bold text-white leading-[1.35] -my-2">
          {title}
        </h2>

        <p className="text-base sm:text-lg text-white/75 leading-[2] -my-2">{subtitle}</p>

        {extra && <div className="-my-2">{extra}</div>}

        {actions && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-8 -my-2">
            {actions}
          </div>
        )}
      </div>

      <div className="hidden lg:flex items-center justify-center relative h-[400px] xl:h-[440px]">
        <div className="relative w-full h-full flex flex-col justify-center gap-5 overflow-hidden">
          {tags.map((t, i) => (
            <TagRow key={i} {...t} />
          ))}
        </div>
      </div>
    </div>
  );
}
