import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  dark?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', dark = false }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${dark ? 'bg-black/50' : 'bg-black/20'} backdrop-blur-sm`}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.175, 0.885, 0.32, 1.275] }}
            className={`relative ${maxWidth} w-full rounded-2xl shadow-2xl overflow-hidden ${
              dark
                ? 'modal-dark border border-white/10'
                : 'bg-white border border-crystal-200'
            }`}
          >
            <div className={`modal-header flex items-center justify-between px-5 py-3 border-b ${
              dark ? 'border-white/8' : 'border-crystal-200'
            }`}>
              <h2 className={`modal-title text-base font-heading font-semibold ${
                dark ? 'text-white/95' : ''
              }`}>{title}</h2>
              <button
                onClick={onClose}
                className={`modal-close p-1.5 rounded-lg transition-colors ${
                  dark ? 'text-white/40 hover:bg-white/8 hover:text-white/70' : 'hover:bg-crystal-100 text-crystal-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
