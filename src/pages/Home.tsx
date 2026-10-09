import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  motion,
  useMotionValueEvent,
  useScroll,
} from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CloudSun,
  Droplets,
  MapPin,
  Moon,
  Route,
  Satellite,
  ShieldCheck,
  Waves,
  Workflow,
} from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { SpaceScene } from '../components/space/SpaceScene';
import { Badge, Button } from '../components/ui';
import { Logo } from '../components/layout/Sidebar';

/**
 * Landing page — a scroll-driven cinematic story:
 * space → Earth observation → satellite intelligence →
 * flood detection → infrastructure → connectivity → product.
 * The 3D space scene is fixed behind the content and
 * choreographed by scroll progress.
 */

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
};

const heroDelay = 0.08;

export function Home() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const [scroll, setScroll] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setScroll(v));

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto bg-navy-950"
    >
      {/* ── Fixed 3D space background ─────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <Canvas
          camera={{ position: [0.6, 1.7, 11.5], fov: 52, near: 0.1, far: 220 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <SpaceScene mode="scroll" scroll={scroll} />
        </Canvas>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(2,4,9,0.8) 100%)',
          }}
        />
      </div>

      {/* ── Scroll story ──────────────────────────────────── */}
      <div className="relative z-10">
        {/* HERO */}
        <section className="flex min-h-screen items-center">
          <div className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-10">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }}>
              <Badge
                color="blue"
                className="border-brand-500/40 bg-brand-900/40 text-sky-300"
              >
                Satellite-Powered Flood Impact Mapping
              </Badge>
            </motion.div>
            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.65, delay: heroDelay }}
              className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Flood intelligence,
              <br />
              from orbit.
            </motion.h1>
            <motion.p
              {...fadeUp}
              transition={{ duration: 0.65, delay: heroDelay * 2 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-navy-200"
            >
              AQUASCOPE automatically selects Sentinel-1 imagery, maps flood
              extent with AI change detection, and quantifies the impact on
              roads, buildings and settlements — in one analysis workflow.
            </motion.p>
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.65, delay: heroDelay * 3 }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Button
                size="lg"
                onClick={() => navigate('/setup')}
                icon={<Satellite size={17} />}
              >
                Start Analysis
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="!border-navy-600 !bg-navy-800/80 !text-navy-100 hover:!bg-navy-700"
                onClick={() => navigate('/how-it-works')}
                icon={<Workflow size={16} />}
              >
                How It Works
              </Button>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 transition-colors hover:text-sky-200"
              >
                Guided Demo <ArrowRight size={15} />
              </Link>
            </motion.div>
            <motion.dl
              {...fadeUp}
              transition={{ duration: 0.65, delay: heroDelay * 4 }}
              className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-navy-700/60 pt-6"
            >
              {[
                ['6', 'Pipeline stages'],
                ['124', 'Settlements (demo)'],
                ['24.6 km²', 'Flood extent (demo)'],
              ].map(([v, l]) => (
                <div key={l}>
                  <dd className="text-xl font-bold text-white tabular-nums">
                    {v}
                  </dd>
                  <dt className="mt-1 text-[11px] font-medium text-navy-400">
                    {l}
                  </dt>
                </div>
              ))}
            </motion.dl>
          </div>
        </section>

        {/* EARTH OBSERVATION */}
        <section className="flex min-h-screen items-center justify-end">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-xl px-6 py-20 lg:px-0 lg:mr-[8%]"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300/90">
              01 · Earth Observation
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              See through cloud and darkness
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-navy-200">
              AQUASCOPE uses Synthetic Aperture Radar — an active sensor that
              images the Earth day and night, through cloud cover and rain,
              exactly when flood events are most often observed.
            </p>
            <div className="mt-7 space-y-3">
              {[
                {
                  icon: CloudSun,
                  title: 'All-weather acquisition',
                  desc: 'SAR penetrates cloud cover — no waiting for clear skies.',
                },
                {
                  icon: Moon,
                  title: 'Day & night capable',
                  desc: 'Observations are independent of sunlight or season.',
                },
                {
                  icon: Waves,
                  title: 'Millimetre-scale change',
                  desc: 'Backscatter change isolates open water from land.',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="flex gap-3.5 rounded-xl border border-navy-800/80 bg-navy-950/70 px-4 py-3.5 backdrop-blur-md"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-sky-300">
                    <f.icon size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-navy-300">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* SATELLITE INTELLIGENCE */}
        <section className="flex min-h-screen items-center">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-xl px-6 py-20 lg:ml-[8%]"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300/90">
              02 · Satellite Intelligence
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              From tasking to analysis in minutes
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-navy-200">
              Scene selection, orbit compatibility, terrain correction and
              preprocessing are handled automatically — the analyst only
              chooses where and when.
            </p>
            {/* acquisition timeline */}
            <div className="mt-8 rounded-xl border border-navy-800/80 bg-navy-950/70 p-5 backdrop-blur-md">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-400">
                Automatic acquisition timeline
              </p>
              <div className="mt-4 flex items-center gap-2">
                {['BEFORE', 'EVENT', 'AFTER'].map((s, i) => (
                  <div key={s} className="flex-1">
                    <div
                      className={`rounded-lg border px-3 py-2.5 text-center font-mono text-[11px] font-bold tracking-wider ${
                        i === 1
                          ? 'border-sky-400/50 bg-sky-400/10 text-sky-300'
                          : 'border-navy-700 bg-navy-800/50 text-navy-200'
                      }`}
                    >
                      {s}
                    </div>
                    <p className="mt-1.5 text-center font-mono text-[10px] text-navy-400">
                      {i === 0 ? 'S1A · −12 d' : i === 1 ? 'S1B · event' : 'S1A · +2 d'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-navy-400">
                <MapPin size={12} className="text-sky-300" />
                Scenes auto-selected on relative orbit 143 · descending
              </div>
            </div>
          </motion.div>
        </section>

        {/* FLOOD DETECTION */}
        <section className="flex min-h-screen items-center justify-center">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-4xl px-6 py-20"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300/90">
              03 · Flood Detection
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Flood extent, mapped with confidence
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-navy-200">
              Change detection between pre-event and post-event scenes
              delineates potentially flooded areas, each pixel carrying a
              confidence category.
            </p>
            <div className="mt-8 overflow-hidden rounded-2xl border border-navy-800/80 shadow-map">
              <FloodMapVisual />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Higher confidence', value: '14.2 km²', tone: 'text-green-300' },
                { label: 'Borderline', value: '7.8 km²', tone: 'text-amber-300' },
                { label: 'Terrain-uncertain', value: '2.6 km²', tone: 'text-violet-300' },
              ].map((c) => (
                <div
                  key={c.label}
                  className="rounded-xl border border-navy-800/80 bg-navy-950/70 px-4 py-3 backdrop-blur-md"
                >
                  <p className={`text-lg font-bold tabular-nums ${c.tone}`}>{c.value}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-navy-400">{c.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* INFRASTRUCTURE */}
        <section className="flex min-h-screen items-center justify-end">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-xl px-6 py-20 lg:mr-[8%]"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300/90">
              04 · Infrastructure Impact
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Know what the water touched
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-navy-200">
              OpenStreetMap roads, buildings and bridges are overlaid with the
              flood mask. Overlap is reported as{" "}
              <span className="font-semibold text-white">potentially affected</span>{" "}
              — never assumed destruction.
            </p>
            <div className="mt-7 space-y-3">
              {[
                {
                  icon: Route,
                  title: 'Roads',
                  desc: '17.6 km of 82.4 km potentially affected',
                  tone: 'text-amber-300 bg-amber-500/10',
                },
                {
                  icon: Building2,
                  title: 'Buildings',
                  desc: '680 of 4,250 structures potentially affected',
                  tone: 'text-sky-300 bg-brand-500/10',
                },
                {
                  icon: ShieldCheck,
                  title: 'Bridges',
                  desc: '11 of 38 crossings potentially affected',
                  tone: 'text-violet-300 bg-violet-500/10',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="flex items-center gap-3.5 rounded-xl border border-navy-800/80 bg-navy-950/70 px-4 py-3.5 backdrop-blur-md"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${f.tone}`}
                  >
                    <f.icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 truncate text-[13px] text-navy-300">
                      {f.desc}
                    </p>
                  </div>
                  <Badge color="amber" className="ml-auto hidden sm:inline-flex">
                    Potentially affected
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CONNECTIVITY */}
        <section className="flex min-h-screen items-center">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-xl px-6 py-20 lg:ml-[8%]"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300/90">
              05 · Road Connectivity
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Find the cut-off communities
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-navy-200">
              Potentially affected road segments are removed from the road
              graph. Settlements without a valid modelled route are flagged as{" "}
              <span className="font-semibold text-white">
                potentially road-disconnected
              </span>{" "}
              — with alternative routes where they exist.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                { value: '27', label: 'Potentially disconnected', tone: 'text-red-300' },
                { value: '14', label: 'Alternate routes available', tone: 'text-green-300' },
                { value: '13', label: 'No alternate route', tone: 'text-amber-300' },
                { value: '97', label: 'Connected settlements', tone: 'text-sky-300' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-navy-800/80 bg-navy-950/70 px-4 py-4 backdrop-blur-md"
                >
                  <p className={`text-2xl font-bold tabular-nums ${s.tone}`}>
                    {s.value}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-snug text-navy-400">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-navy-500">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-sky-300" />
              Connectivity is modelled from the road network — field verification
              is always required before operational decisions.
            </p>
          </motion.div>
        </section>

        {/* PRODUCT / CTA */}
        <section className="flex min-h-[90vh] items-center justify-center">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-2xl px-6 py-24 text-center"
          >
            <Logo size={64} />
            <h2 className="mt-6 text-3xl font-extrabold tracking-[0.18em] text-white sm:text-4xl">
              AQUASCOPE
            </h2>
            <p className="mt-3 text-sm font-medium text-navy-200">
              Satellite-Based Flood Intelligence
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.4em] text-sky-300/90">
              Map. Assess. Connect.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => navigate('/setup')}>
              Start Analysis
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="!border-navy-600 !bg-navy-800/80 !text-navy-100 hover:!bg-navy-700"
              onClick={() => navigate('/demo')}
            >
              Watch the Demo
            </Button>
            </div>
            <p className="mt-8 text-[11px] leading-relaxed text-navy-500">
              AQUASCOPE is a demonstration platform. All locations, imagery,
              model outputs and metrics shown are simulated for product
              evaluation and do not represent real events.
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}

/** Simulated flood-detection map panel (decorative, clearly labelled). */
function FloodMapVisual() {
  return (
    <div className="relative bg-navy-900" style={{ height: 340 }}>
      {/* terrain */}
      <svg
        className="absolute inset-0 h-full w-full opacity-50"
        viewBox="0 0 640 340"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 90 Q120 55 240 80 T640 70" stroke="#1E3F66" strokeWidth="1.2" fill="none" />
        <path d="M0 150 Q160 115 320 140 T640 120" stroke="#1E3F66" strokeWidth="1" fill="none" />
        <path d="M0 220 Q200 185 380 210 T640 190" stroke="#1E3F66" strokeWidth="1" fill="none" />
        <path d="M0 285 Q180 255 420 275 T640 255" stroke="#1E3F66" strokeWidth="1" fill="none" />
        {/* river corridor */}
        <path
          d="M120 0 C180 70 140 150 220 220 C280 275 240 310 260 340"
          stroke="#0E63C2"
          strokeWidth="7"
          fill="none"
          opacity="0.55"
          strokeLinecap="round"
        />
      </svg>

      {/* flood extent */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 340" preserveAspectRatio="none" aria-hidden>
        <motion.ellipse
          cx="215" cy="150" rx="95" ry="42"
          fill="rgba(14,99,194,0.5)" stroke="#38BDF8" strokeWidth="1"
          initial={{ scale: 0.2, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
          style={{ transformOrigin: '215px 150px' }}
        />
        <motion.ellipse
          cx="330" cy="220" rx="120" ry="50"
          fill="rgba(14,99,194,0.42)" stroke="#38BDF8" strokeWidth="1"
          initial={{ scale: 0.2, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.45, ease: 'easeOut' }}
          style={{ transformOrigin: '330px 220px' }}
        />
        <motion.ellipse
          cx="450" cy="130" rx="70" ry="30"
          fill="rgba(245,158,11,0.28)" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 3"
          initial={{ scale: 0.2, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.7, ease: 'easeOut' }}
          style={{ transformOrigin: '450px 130px' }}
        />
      </svg>

      {/* scan sweep */}
      <motion.div
        className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-sky-400/20 to-transparent"
        animate={{ x: ['-120px', '700px'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />

      {/* HUD */}
      <div className="absolute left-3 top-3 rounded-md bg-navy-950/70 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-sky-300 backdrop-blur">
        <p>27.8510° N, 85.1840° E</p>
        <p className="text-navy-400">S1B · IW GRD · ORBIT 143</p>
      </div>
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-navy-950/70 px-2.5 py-1.5 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-navy-200">
          Simulated flood extent
        </span>
      </div>
      <div className="absolute bottom-3 right-3 rounded-md bg-navy-950/70 px-2.5 py-1.5 font-mono text-[10px] text-navy-300 backdrop-blur">
        24.6 km² mapped
      </div>
    </div>
  );
}