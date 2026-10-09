import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDemo, DEMO_STEPS } from '../../context/DemoContext';
import { classNames } from '../../utils/geo';
import { Logo } from '../layout/Sidebar';

/**
 * DemoOverlay — global guided-tour layer.
 * Renders a spotlight ring around the active step's target
 * element (dimming everything else) plus a tooltip with
 * step controls. Rendered once at the app root so it
 * persists across route changes.
 */

const TT_W = 400;
const TT_H = 208;

export function DemoOverlay() {
  const demo = useDemo();
  const navigate = useNavigate();
  const location = useLocation();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const { active, started, finished, step, stepIndex, paused, presentation, runId } = demo;

  // Follow the step's route
  useEffect(() => {
    if (!active || !started || finished || !step) return;
    if (location.pathname !== step.route) navigate(step.route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, started, finished, step?.id, step?.route]);

  // Track the spotlight target
  useEffect(() => {
    if (!active || !started || finished || !step?.target) {
      setRect(null);
      return;
    }
    const selector = step.target;
    const update = () => {
      const el = document.querySelector(selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    const iv = setInterval(update, 300);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      clearInterval(iv);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, started, finished, step?.target, runId]);

  if (!active || !started) return null;

  // ── Completion screen ──────────────────────────────
  if (finished) {
    return (
      <div className="fixed inset-0 z-[950] flex items-center justify-center bg-[#020409]/92 p-6 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-lg rounded-2xl border border-navy-700 bg-navy-950 p-10 text-center shadow-lifted"
        >
          <Logo size={64} />
          <h2 className="mt-6 text-2xl font-extrabold tracking-[0.16em] text-white">
            AQUASCOPE ANALYSIS COMPLETE
          </h2>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.4em] text-sky-300">
            Map. Assess. Connect.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-navy-300">
            You have walked through the complete flood-intelligence
            workflow — from satellite tasking to a downloadable
            situation report.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={demo.restart}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 h-10 text-sm font-semibold text-white hover:bg-brand-500"
            >
              <RotateCcw size={15} />
              Restart Demo
            </button>
            <button
              onClick={demo.exit}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-700 bg-navy-800 px-4 h-10 text-sm font-semibold text-navy-100 hover:bg-navy-700"
            >
              <X size={15} />
              Exit Demo
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Tooltip placement ──────────────────────────────
  let left = (typeof window !== 'undefined' ? window.innerWidth : 1024) / 2 - TT_W / 2;
  let top = (typeof window !== 'undefined' ? window.innerHeight : 768) - TT_H - 20;
  if (rect) {
    const gap = 16;
    const cx = rect.left + rect.width / 2;
    left = Math.min(Math.max(cx - TT_W / 2, 14), window.innerWidth - TT_W - 14);
    const below = rect.bottom + gap + TT_H < window.innerHeight - 8;
    top = below ? rect.bottom + gap : Math.max(rect.top - gap - TT_H, 8);
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[900]">
      {/* Spotlight */}
      <AnimatePresence>
        {rect && (
          <motion.div
            key="spotlight"
            className="pointer-events-none absolute rounded-xl ring-2 ring-sky-400/80 demo-spotlight"
            style={{
              left: rect.left - 7,
              top: rect.top - 7,
              width: rect.width + 14,
              height: rect.height + 14,
              boxShadow: '0 0 0 9999px rgba(2, 6, 16, 0.8)',
            }}
            animate={{
              left: rect.left - 7,
              top: rect.top - 7,
              width: rect.width + 14,
              height: rect.height + 14,
            }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <motion.div
        className="pointer-events-auto absolute overflow-hidden rounded-xl border border-navy-700 bg-navy-950/97 shadow-lifted backdrop-blur"
        style={{ left, top, width: TT_W }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: presentation ? 0.5 : 0.28 }}
        role="dialog"
        aria-label="Demo step"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-navy-800 bg-navy-900/80 px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">
            Aquascope Demo · Step {stepIndex + 1} / {DEMO_STEPS.length}
          </p>
          <div className="flex items-center gap-0.5">
            <button
              onClick={demo.togglePresentation}
              title={presentation ? 'Exit presentation mode' : 'Presentation mode'}
              aria-label="Toggle presentation mode"
              className={classNames(
                'rounded-md p-1.5 transition-colors',
                presentation
                  ? 'bg-brand-500/20 text-sky-300'
                  : 'text-navy-400 hover:bg-navy-800 hover:text-white',
              )}
            >
              <MonitorPlay size={14} />
            </button>
            <button
              onClick={demo.exit}
              title="Exit demo"
              aria-label="Exit demo mode"
              className="rounded-md p-1.5 text-navy-400 transition-colors hover:bg-navy-800 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="px-4 py-3.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step?.id ?? 'none'}
              initial={{ opacity: 0, x: presentation ? 24 : 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: presentation ? -24 : -14 }}
              transition={{ duration: presentation ? 0.45 : 0.18 }}
            >
              <h3 className={classNames('font-bold text-white', presentation ? 'text-lg' : 'text-[15px]')}>
                {step?.title}
              </h3>
              <p className={classNames('mt-1.5 leading-relaxed text-navy-300', presentation ? 'text-[15px]' : 'text-[13px]')}>
                {step?.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* progress */}
          <div className="mt-3.5 flex items-center gap-1">
            {DEMO_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => demo.goTo(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                className={classNames(
                  'h-1 rounded-full transition-all',
                  i === stepIndex
                    ? 'w-5 bg-sky-400'
                    : i < stepIndex
                      ? 'w-1.5 bg-brand-500/70 hover:bg-brand-400'
                      : 'w-1.5 bg-navy-700 hover:bg-navy-600',
                )}
              />
            ))}
          </div>
        </div>

        {/* controls */}
        <div className="flex items-center justify-between border-t border-navy-800 px-3 py-2.5">
          <div className="flex gap-1">
            <DemoControlButton
              onClick={demo.prev}
              disabled={stepIndex === 0}
              label="Previous step"
              icon={<ChevronLeft size={14} />}
              text="Prev"
            />
            <DemoControlButton
              onClick={paused ? demo.resume : demo.pause}
              label={paused ? 'Resume' : 'Pause'}
              icon={paused ? <Play size={14} /> : <Pause size={14} />}
              text={paused ? 'Resume' : 'Pause'}
            />
            <DemoControlButton
              onClick={demo.restart}
              label="Restart demo"
              icon={<RotateCcw size={14} />}
              text="Restart"
            />
          </div>
          <DemoControlButton
            onClick={demo.next}
            label={stepIndex === DEMO_STEPS.length - 1 ? 'Finish' : 'Next step'}
            icon={<ArrowRight size={14} />}
            text={stepIndex === DEMO_STEPS.length - 1 ? 'Finish' : 'Next'}
            primary
          />
        </div>
      </motion.div>

      {/* unobtrusive exit hint when paused */}
      {paused && !rect && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-navy-700 bg-navy-950/90 px-4 py-1.5 text-[11px] font-semibold text-navy-300">
          Demo paused — resume or step through manually
        </div>
      )}
    </div>
  );
}

function DemoControlButton({
  onClick,
  disabled,
  label,
  icon,
  text,
  primary,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon: React.ReactNode;
  text: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={classNames(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none',
        primary
          ? 'bg-brand-600 text-white hover:bg-brand-500'
          : 'text-navy-300 hover:bg-navy-800 hover:text-white',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </button>
  );
}
