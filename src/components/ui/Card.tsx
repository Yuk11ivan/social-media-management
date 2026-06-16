import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  shimmer?: boolean;
  onClick?: () => void;
  padding?: boolean;
}

export default function Card({
  children,
  className = '',
  hover = false,
  shimmer = false,
  onClick,
  padding = true,
}: Props) {
  const baseClasses = `bg-white rounded-2xl border border-border ${padding ? 'p-6' : ''}`;
  const hoverClasses = hover
    ? 'cursor-pointer transition-shadow duration-300 hover:shadow-lg'
    : '';
  const shimmerClasses = shimmer ? 'liquid-shimmer' : '';

  return (
    <motion.div
      className={`${baseClasses} ${hoverClasses} ${shimmerClasses} ${className}`}
      variants={hover ? {
        rest: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
        hover: {
          y: -6,
          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)',
          transition: { duration: 0.3, ease: [0.175, 0.885, 0.32, 1.275] },
        },
      } : undefined}
      initial="rest"
      whileHover={hover ? 'hover' : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
