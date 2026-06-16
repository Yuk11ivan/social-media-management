import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../animations/variants';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = '' }: Props) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
