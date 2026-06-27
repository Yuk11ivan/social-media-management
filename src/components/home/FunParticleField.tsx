import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  baseX: number;
  baseY: number;
}

const PLATFORM_COLORS = [
  '#D4BF8A', '#BFA76A', '#C4A870', '#EAD9B2', '#A89055', '#F5ECD8',
];

const PARTICLE_COUNT = 100;
const CONNECTION_DISTANCE = 130;
const MOUSE_ATTRACT_DISTANCE = 150;
const MOUSE_ATTRACT_FORCE = 0.08;

export default function FunParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animFrameRef = useRef<number>(0);
  const burstRef = useRef<{ x: number; y: number; force: number } | null>(null);

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1.5,
        color: PLATFORM_COLORS[Math.floor(Math.random() * PLATFORM_COLORS.length)],
        alpha: Math.random() * 0.5 + 0.2,
        baseX: x,
        baseY: y,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      if (particlesRef.current.length === 0) {
        initParticles(rect.width, rect.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;
    const TARGET_FPS = 60;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const animate = (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(animate);

      const delta = timestamp - lastTime;
      if (delta < FRAME_INTERVAL) return;
      lastTime = timestamp - (delta % FRAME_INTERVAL);

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const mouse = mouseRef.current;
      const burst = burstRef.current;

      ctx.clearRect(0, 0, w, h);

      // Update & draw particles
      for (const p of particlesRef.current) {
        // Mouse attraction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);

        if (distToMouse < MOUSE_ATTRACT_DISTANCE && distToMouse > 1) {
          const force = (MOUSE_ATTRACT_DISTANCE - distToMouse) / MOUSE_ATTRACT_DISTANCE;
          const fx = (dx / distToMouse) * force * MOUSE_ATTRACT_FORCE;
          const fy = (dy / distToMouse) * force * MOUSE_ATTRACT_FORCE;
          p.vx += fx;
          p.vy += fy;
        }

        // Burst effect
        if (burst) {
          const bdx = p.x - burst.x;
          const bdy = p.y - burst.y;
          const distToBurst = Math.sqrt(bdx * bdx + bdy * bdy);
          if (distToBurst < burst.force && distToBurst > 0.1) {
            const force = burst.force / (distToBurst + 1);
            p.vx += (bdx / distToBurst) * force;
            p.vy += (bdy / distToBurst) * force;
          }
        }

        // Gentle drift back toward base position
        const driftX = p.baseX - p.x;
        const driftY = p.baseY - p.y;
        p.vx += driftX * 0.00005;
        p.vy += driftY * 0.00005;

        // Apply velocity
        p.x += p.vx;
        p.y += p.vy;

        // Damping
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Boundary: gentle bounce
        if (p.x < 0) { p.x = 0; p.vx *= -0.3; }
        if (p.x > w) { p.x = w; p.vx *= -0.3; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.3; }
        if (p.y > h) { p.y = h; p.vy *= -0.3; }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw connections
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = '#D4BF8A';
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      // Decay burst
      if (burst) {
        burst.force *= 0.92;
        if (burst.force < 0.5) burstRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      burstRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        force: 12 + Math.random() * 6,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
