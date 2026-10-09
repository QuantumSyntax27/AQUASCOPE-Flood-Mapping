import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SkipForward } from 'lucide-react';
import { SpaceScene, type SpacePhase } from '../components/space/SpaceScene';
import { Logo } from '../components/layout/Sidebar';

/**
 * Cinematic opening: deep space → solar system →
 * Earth rotation → satellite approach → Earth
 * observation → AQUASCOPE reveal.
 * Respects prefers-reduced-motion (skips immediately).
 */

const SEQUENCE: { phase: SpacePhase; duration: number; caption: string }[] = [
  { phase: 'space', duration: 2800, caption: 'DEEP SPACE' },
  { phase: 'solar', duration: 2400, caption: 'INNER SOLAR SYSTEM' },
  { phase: 'earth', duration: 2600, caption: 'EARTH · ROTATION' },
  { phase: 'orbit', duration: 2600, caption: 'AQUASCOPE-1 · SATELLITE APPROACH' },
  { phase: 'scan', duration: 3000, caption: 'EARTH OBSERVATION · FLOOD MAPPING' },
  { phase: 'logo', duration: 3400, caption: '' },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export function Intro() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const total = SEQUENCE.reduce((a, s) => a + s.duration, 0);

  useEffect(() => {
    if (reduced) {
      navigate('/home', { replace: true });
      return;
    }
    let cancelled = false;
    let t = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    SEQUENCE.forEach((s, i) => {
      timers.push(setTimeout(() => !cancelled && setIndex(i), t));
      t += s.duration;
    });
    const start = Date.now();
    const tick = () => {
      if (cancelled) return;
      const p = Math.min(100, ((Date.now() - start) / total) * 100);
      setProgress(p);
      if (p < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    timers.push(
      setTimeout(() => {
        if (!cancelled) navigate('/home', { replace: true });
      }, total + 150),
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  if (reduced) return null;

  const step = SEQUENCE[index];

  return (
    <div className="relative h-screen overflow-hidden bg-[#020409]">
      <Canvas
        camera={{ position: [0, 1.4, 13.5], fov: 52, near: 0.1, far: 220 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-label="Cinematic space sequence"
      >
        <SpaceScene mode="intro" phase={step.phase} />
      </Canvas>

      {/* soft vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 52%, rgba(2,4,9,0.75) 100%)',
        }}
        aria-hidden
      />

      {/* mission caption */}
      <div className="absolute bottom-16 left-8 sm:bottom-20 sm:left-12">
        <AnimatePresence mode="wait">
          <motion.p
            key={step.phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.55 }}
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.34em] text-navy-300"
          >
            {step.caption}
          </motion.p>
        </AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 h-px w-24 bg-gradient-to-r from-sky-400/70 to-transparent"
          aria-hidden
        />
      </div>

      {/* AQUASCOPE reveal */}
      <AnimatePresence>
        {step.phase === 'logo' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* fade the 3D scene behind the logo */}
            <motion.div
              className="absolute inset-0 bg-[#020409]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.82 }}
              transition={{ duration: 1.4 }}
              aria-hidden
            />
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Logo size={64} />
            </motion.div>
            <motion.h1
              className="relative mt-7 text-4xl font-extrabold tracking-[0.24em] text-white sm:text-5xl"
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: '0.24em' }}
              transition={{ delay: 0.35, duration: 0.9, ease: 'easeOut' }}
            >
              AQUASCOPE
            </motion.h1>
            <motion.p
              className="relative mt-4 text-sm font-medium tracking-wide text-navy-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6 }}
            >
              Satellite-Based Flood Intelligence
            </motion.p>
            <motion.p
              className="relative mt-2 font-mono text-[11px] uppercase tracking-[0.4em] text-sky-300/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.05, duration: 0.6 }}
            >
              Map. Assess. Connect.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* progress */}
      <div className="absolute bottom-8 left-1/2 w-52 -translate-x-1/2">
        <div className="h-0.5 overflow-hidden rounded-full bg-navy-800/80">
          <div
            className="h-full bg-sky-400/90 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => navigate('/home', { replace: true })}
        className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-lg border border-navy-700/80 px-3 py-1.5 text-xs font-semibold text-navy-200 backdrop-blur transition-colors hover:bg-navy-800/70 hover:text-white"
      >
        <SkipForward size={13} />
        Skip intro
      </button>
    </div>
  );
}
