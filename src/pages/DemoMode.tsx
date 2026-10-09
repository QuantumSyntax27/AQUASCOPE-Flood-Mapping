import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import { useDemo, DEMO_STEPS } from '../context/DemoContext';
import { Button, Card } from '../components/ui';
import { PageHeader, DemoBadge } from '../components/layout/PageHeader';
import { Logo } from '../components/layout/Sidebar';

/**
 * Demo Mode — entry point for the guided product walkthrough.
 * The walkthrough itself operates the live interface;
 * this page is the clean starting screen.
 */
export function DemoMode() {
  const navigate = useNavigate();
  const demo = useDemo();

  return (
    <div className="h-full overflow-y-auto bg-navy-950">
      <PageHeader
        title="Demo Mode"
        subtitle="A guided walkthrough of the complete AQUASCOPE workflow."
        badge={<DemoBadge />}
      />

      <div className="mx-auto max-w-2xl px-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            {/* hero band */}
            <div className="relative overflow-hidden bg-navy-950 px-8 py-12 text-center">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 0%, rgba(14,99,194,0.35), transparent 65%)',
                }}
                aria-hidden
              />
              <div className="relative">
                <Logo size={60} />
                <h2 className="mt-5 text-xl font-extrabold tracking-[0.2em] text-white">
                  AQUASCOPE DEMO
                </h2>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-sky-300">
                  Guided Flood Intelligence Analysis
                </p>
                <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-navy-300">
                  Ten steps through the live application — from selecting a
                  disaster location to a downloadable situation report. The
                  demo operates the real interface using the built-in
                  scenario: <span className="font-semibold text-white">Trishuli, Nepal · 26 Aug 2026</span>.
                </p>
                <Button
                  size="lg"
                  className="mt-7"
                  onClick={demo.begin}
                  icon={<Play size={16} />}
                >
                  Start Demo
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => navigate('/home')}
                >
                  Back to Home
                </Button>
              </div>
            </div>

            {/* step outline */}
            <div className="px-8 py-6">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-400">
                <Sparkles size={13} className="text-sky-300" />
                The walkthrough
              </p>
              <ol className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {DEMO_STEPS.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm text-navy-200">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-navy-700 bg-navy-800/70 font-mono text-[10px] font-bold text-sky-300">
                      {i + 1}
                    </span>
                    <span className="leading-snug">{s.title}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-xl border border-navy-800 bg-navy-900/70 px-4 py-3 text-[11px] leading-relaxed text-navy-400">
                Demo Mode can be recorded cleanly: use the pause and
                step controls to move at your own pace, or enable
                presentation mode for a 3–5 minute judge demonstration
                with the chrome hidden and slower transitions.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
