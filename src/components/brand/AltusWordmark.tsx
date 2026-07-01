import { motion } from 'framer-motion';

interface Props {
  onHero?: boolean;
}

export default function AltusWordmark({ onHero = false }: Props) {
  return (
    <div className="flex flex-col items-start select-none">
      <motion.span
        className={`altus-wordmark ${onHero ? 'altus-wordmark-hero' : 'altus-wordmark-light'}`}
        animate={{ filter: ['drop-shadow(0 0 8px rgba(255,255,255,0.25))', 'drop-shadow(0 0 18px rgba(220,230,255,0.45))', 'drop-shadow(0 0 8px rgba(255,255,255,0.25))'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        Altus
      </motion.span>
      <span className={`text-[11px] tracking-[0.4em] mt-1 pl-0.5 ${onHero ? 'text-white/45' : 'text-crystal-500'}`}>
        奥途智营
      </span>
    </div>
  );
}
