import { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const PARTICLE_COLORS = ['#688B7E', '#8BAFA3', '#B8A06A', '#D4C69A', '#E8F0EC', '#FFFFFF'];

export default function AnimatedMascot() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number }[]>([]);
  const [clicked, setClicked] = useState(false);
  const [particleId, setParticleId] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 55, damping: 15 });
  const springY = useSpring(mouseY, { stiffness: 55, damping: 15 });
  const x = useTransform(springX, [-120, 120], [-40, 40]);
  const y = useTransform(springY, [-120, 120], [-15, 25]);

  const handleMouseMove = (e: MouseEvent) => {
    mouseX.set((e.clientX / window.innerWidth - 0.72) * 240);
    mouseY.set((e.clientY / window.innerHeight - 0.4) * 240);
  };

  useEffect(() => { window.addEventListener('mousemove', handleMouseMove); return () => window.removeEventListener('mousemove', handleMouseMove); });

  const spawnParticles = useCallback(() => {
    const count = 10;
    const newP = Array.from({ length: count }, (_, i) => ({
      id: particleId + i, x: (Math.random() - 0.5) * 120, y: (Math.random() - 0.5) * 120,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)], size: Math.random() * 3 + 2,
    }));
    setParticles((prev) => [...prev, ...newP]);
    setParticleId((id) => id + count);
    setTimeout(() => setParticles((prev) => prev.filter((p) => !newP.includes(p))), 900);
  }, [particleId]);

  return (
    <motion.div className="absolute right-[6%] top-[25%] z-10 pointer-events-auto"
      style={{ x, y }} drag dragConstraints={{ left: -250, right: 250, top: -120, bottom: 250 }} dragElastic={0.08}
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      animate={{ y: [0, -5, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      onHoverStart={() => setIsHovered(true)} onHoverEnd={() => setIsHovered(false)}>

      {/* Outer glow */}
      <motion.div className="absolute -inset-4 rounded-full"
        animate={{ scale: [1, 1.05, 1], opacity: [0.25, 0.4, 0.25] }} transition={{ duration: 3, repeat: Infinity }}
        style={{ background: 'radial-gradient(circle, rgba(104,139,126,0.12) 0%, rgba(184,160,106,0.05) 50%, transparent 70%)', filter: 'blur(8px)' }} />

      {/* Orbiting sparkle */}
      <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}>
        <motion.div className="absolute -top-1 -right-1" animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          <Sparkles className="w-5 h-5 text-gilt drop-shadow-[0_0_6px_rgba(184,160,106,0.4)]" />
        </motion.div>
      </motion.div>

      {/* Click ripple */}
      <AnimatePresence>{clicked && <motion.div className="absolute inset-0 rounded-full" initial={{ scale: 0.6, opacity: 0.6 }} animate={{ scale: 3, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ background: 'radial-gradient(circle, rgba(104,139,126,0.3), transparent)' }} />}</AnimatePresence>

      {/* Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div key={p.id} className="absolute left-1/2 top-1/2 rounded-full"
            style={{ width: p.size, height: p.size, backgroundColor: p.color, boxShadow: `0 0 ${p.size * 3}px ${p.color}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        ))}
      </AnimatePresence>

      {/* Body */}
      <motion.button onClick={() => { setClicked(true); setTimeout(() => setClicked(false), 500); spawnParticles(); }}
        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full cursor-pointer select-none outline-none"
        style={{ background: 'linear-gradient(145deg, #688B7E 0%, #7DA895 25%, #5A7D70 60%, #4A6D60 100%)',
          boxShadow: isHovered ? '0 8px 36px rgba(104,139,126,0.35), 0 0 60px rgba(104,139,126,0.12), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 4px 20px rgba(104,139,126,0.25), 0 0 30px rgba(104,139,126,0.06), inset 0 1px 0 rgba(255,255,255,0.15)',
          transition: 'box-shadow 0.4s ease' }}>
        {/* Glass highlight */}
        <div className="absolute top-2 left-3 right-3 h-[30%] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.04) 100%)', filter: 'blur(2px)' }} />
        <div className="absolute bottom-3 left-4 right-4 h-[15%] rounded-full" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.06) 100%)' }} />

        {/* Face */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <div className="flex gap-3 mb-2">
            <motion.div className="relative w-3.5 h-5 rounded-full bg-white"
              animate={{ scaleY: isHovered ? 0.15 : [1, 0.25, 1], scaleX: isHovered ? 1.5 : 1 }}
              transition={{ scaleY: isHovered ? { duration: 0.15 } : { duration: 4, repeat: Infinity }, scaleX: isHovered ? { duration: 0.15 } : { duration: 0.01 } }}>
              <motion.div className="absolute top-[3px] right-[3px] w-1 h-1 rounded-full bg-jade-dark" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
            </motion.div>
            <motion.div className="relative w-3.5 h-5 rounded-full bg-white"
              animate={{ scaleY: isHovered ? 0.15 : [1, 0.25, 1], scaleX: isHovered ? 1.5 : 1 }}
              transition={{ scaleY: isHovered ? { duration: 0.15 } : { duration: 4, repeat: Infinity, delay: 0.2 }, scaleX: isHovered ? { duration: 0.15 } : { duration: 0.01 } }}>
              <motion.div className="absolute top-[3px] right-[3px] w-1 h-1 rounded-full bg-jade-dark" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.3, repeat: Infinity }} />
            </motion.div>
          </div>
          <motion.div className="w-[18px] h-2 border-b-[2.5px] border-white rounded-b-full"
            animate={{ width: isHovered ? 20 : 18, borderWidth: isHovered ? 3 : 2.5 }} transition={{ duration: 0.2 }} />
          <div className="absolute bottom-[22px] left-[18px] w-2 h-1.5 rounded-full bg-gilt/25 blur-[1px]" />
          <div className="absolute bottom-[22px] right-[18px] w-2 h-1.5 rounded-full bg-gilt/25 blur-[1px]" />
        </div>

        {/* Double rings */}
        <motion.div className="absolute -inset-1.5 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.15) 15%, transparent 35%, transparent 65%, rgba(255,255,255,0.1) 85%, transparent 100%)',
            mask: 'radial-gradient(circle, transparent 64%, black 66%, black 84%, transparent 86%)', WebkitMask: 'radial-gradient(circle, transparent 64%, black 66%, black 84%, transparent 86%)' }} />
        <motion.div className="absolute -inset-2 rounded-full" animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(184,160,106,0.18) 20%, transparent 40%, transparent 70%, rgba(104,139,126,0.1) 90%, transparent 100%)',
            mask: 'radial-gradient(circle, transparent 66%, black 68%, black 86%, transparent 88%)', WebkitMask: 'radial-gradient(circle, transparent 66%, black 68%, black 86%, transparent 88%)' }} />
      </motion.button>

      {/* Tooltip */}
      <motion.div className="absolute -bottom-12 left-1/2 -translate-x-1/2 pointer-events-none"
        animate={{ opacity: [0.4, 0.8, 0.4], y: [0, -2, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
        <div className="relative px-3 py-1.5 rounded-full border border-platinum-200 bg-white/70 backdrop-blur-sm shadow-sm">
          <p className="text-xs font-medium text-jade-dark whitespace-nowrap">点我互动 ✨</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
