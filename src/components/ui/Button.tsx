import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gilt' | 'platform';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode; isLoading?: boolean; platformColor?: string;
}

export default function Button({
  variant = 'primary', size = 'md', icon, isLoading, platformColor, children, className = '', disabled, ...props
}: Props) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes: Record<string, string> = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  const variants: Record<string, string> = {
    primary:  'btn-gilt',
    secondary:'btn-crystal',
    ghost:    'text-crystal-700 hover:text-crystal-900 hover:bg-crystal-100',
    danger:   'bg-red-500 text-white hover:bg-red-600',
    gilt:     'btn-gilt',
    platform: 'text-white hover:shadow-md',
  };
  return (
    <motion.button whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      style={variant === 'platform' && platformColor ? { backgroundColor: platformColor } : {}}
      {...(props as any)}>
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? <span className="w-4 h-4">{icon}</span> : null}
      {children}
    </motion.button>
  );
}
