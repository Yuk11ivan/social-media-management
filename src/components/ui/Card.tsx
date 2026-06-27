import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export default function Card({
  children, className = '', hover = false, shimmer = false, onClick, padding = true,
}: { children: ReactNode; className?: string; hover?: boolean; shimmer?: boolean; onClick?: () => void; padding?: boolean }) {
  return (
    <motion.div
      className={`rounded-2xl glass-card ${padding ? 'p-6' : ''} ${hover ? 'cursor-pointer' : ''} ${shimmer ? 'liquid-shimmer' : ''} ${className}`}
      variants={hover ? {
        rest: { y: 0 },
        hover: { y: -3, transition: { duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] } },
      } : undefined}
      initial="rest" whileHover={hover ? 'hover' : undefined} onClick={onClick}
    >{children}</motion.div>
  );
}
