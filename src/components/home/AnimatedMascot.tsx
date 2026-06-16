import { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function AnimatedMascot() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [clicked, setClicked] = useState(false);
  const [particleId, setParticleId] = useState(0);

  // Mouse-follow with spring physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  // Constrain to an area around center
  const x = useTransform(springX, [-100, 100], [-30, 30]);
  const y = useTransform(springY, [-100, 100], [-10, 20]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Get mouse relative to viewport center-right area
      const cx = (e.clientX / window.innerWidth - 0.7) * 200;
      const cy = (e.clientY / window.innerHeight - 0.35) * 200;
      mouseX.set(cx);
      mouseY.set(cy);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 600);

    // Spawn sparkle particles
    const colors = ['#07C160', '#FF2442', '#10b981', '#E6162D', '#34d399'];
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: particleId + i,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 80,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setParticleId((id) => id + 8);

    // Cleanup particles
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
    }, 800);
  };

  return (
    <motion.div
      className="absolute right-8 top-32 z-5 pointer-events-auto cursor-grab active:cursor-grabbing"
      style={{ x, y }}
      drag
      dragConstraints={{ left: -200, right: 200, top: -100, bottom: 200 }}
      dragElastic={0.1}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={{
        y: [0, -8, 0],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {/* Click ripple */}
      {clicked && (
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-400/30"
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* Sparkle particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      ))}

      {/* The mascot - a cute AI assistant icon */}
      <motion.div
        onClick={handleClick}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-200/50 flex items-center justify-center relative overflow-hidden cursor-pointer select-none"
        whileTap={{ scale: 0.85 }}
      >
        {/* Inner glow */}
        <div className="absolute inset-2 rounded-full bg-white/20 blur-sm" />

        {/* Face */}
        <div className="relative z-10 text-center">
          {/* Eyes */}
          <div className="flex gap-2.5 mb-1">
            <motion.div
              className="w-2 h-2 rounded-full bg-white"
              animate={{ scaleY: [1, 0.3, 1] }}
              transition={{ duration: 4, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 rounded-full bg-white"
              animate={{ scaleY: [1, 0.3, 1] }}
              transition={{ duration: 4, repeat: Infinity, delay: 0.2 }}
            />
          </div>
          {/* Smile */}
          <motion.div
            className="w-4 h-1.5 border-b-2 border-white rounded-b-full mx-auto"
            animate={{ borderWidth: [2, 1.5, 2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      {/* Tip label */}
      <motion.p
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs text-muted whitespace-nowrap pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        点击我试试~
      </motion.p>
    </motion.div>
  );
}
