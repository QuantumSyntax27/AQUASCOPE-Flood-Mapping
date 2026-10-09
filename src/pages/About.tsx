import { motion } from 'framer-motion';
import {
  BrainCircuit,
  Database,
  Globe2,
  Info,
  Layers2,
  Network,
  Satellite,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge, Card, CardHeader } from '../components/ui';
import { PageHeader, DemoBadge } from '../components/layout/PageHeader';
import { Logo } from '../components/layout/Sidebar';

export function About() {
  return (
    <div className="h-full overflow-y-auto bg-navy-950">
      <PageHeader
        title="About AQUASCOPE"
        subtitle="Documentation, technology and responsible-use notes."
      />

      <div className="mx-auto max-w-4xl space-y-4 px-6 pb-10">
        {/* Overview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-6 bg-navy-950 px-8 py-8 md:flex-row md:items-center">
              <Logo size={64} />
              <div>
                <h1 className="text-2xl font-extrabold tracking-[0.18em] text-white">
                  AQUASCOPE
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-navy-200">
                  A satellite-powered flood impact mapping and disaster
                  intelligence platform. AQUASCOPE turns a location, an area
                  of interest and an event date into a validated flood
                  impact assessment — flood extent, infrastructure impact,
                  connectivity analysis and a printable situation report.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          <AboutCard
            icon={<Info size={18} />}
            title="The Problem"
            body={[
              'During monsoon floods, responders need to know where water is, what it touches, and which communities have lost road access — within hours, not days.',
              'Manual flood mapping is slow, optical satellites are blocked by clouds, and infrastructure impact is rarely quantified consistently.',
            ]}
          />
          <AboutCard
            icon={<Globe2 size={18} />}
            title="The Solution"
            body={[
              'AQUASCOPE automates the full chain: scene selection, preprocessing, AI flood segmentation, infrastructure overlay, road-graph connectivity analysis and validation.',
              'Analysts provide only three inputs — location, AOI and event date. Everything else, including satellite scene selection, is handled automatically.',
            ]}
          />
          <AboutCard
            icon={<Satellite size={18} />}
            title="Data Sources"
            body={[
              'Sentinel-1 A/B SAR (IW GRD) — cloud-independent, day and night radar imagery.',
              'Copernicus DEM GLO-30 — terrain correction and layover/shadow handling.',
              'OpenStreetMap — roads, building footprints and bridges.',
              'EMSR927 — used strictly as validation / reference data, never as model input.',
            ]}
          />
          <AboutCard
            icon={<BrainCircuit size={18} />}
            title="AI Approach"
            body={[
              'Proposed Siamese U-Net / SNUNet-style change-aware segmentation: a shared encoder compares pre-event and co-event scenes, a decoder produces a flood score map.',
              'A validation-selected threshold converts scores into a binary mask with higher-confidence, borderline and terrain-uncertain categories.',
              'The exact architecture and hyperparameters remain open until validation against reference data is complete.',
            ]}
          />
          <AboutCard
            icon={<Network size={18} />}
            title="GIS Approach"
            body={[
              'Flood masks are intersected with OSM infrastructure to quantify potentially affected roads, buildings and bridges — reported as overlap, never as destruction.',
              'A road graph is built, potentially affected segments are removed, and every settlement is tested for a valid route to its relevant town. Settlements without a route are reported as potentially road-disconnected, with alternative routes where they exist.',
            ]}
          />
          <AboutCard
            icon={<ShieldCheck size={18} />}
            title="Validation & Limitations"
            body={[
              'Model output is compared against EMSR927 reference mapping (IoU, Dice, precision, recall, F1). Disagreement does not automatically mean the model is wrong — reference mapping is not absolute ground truth.',
              'Key limitations: SAR layover/shadow in steep terrain, borderline confidence zones, reference-data production timelines, and the need for field verification before operational decisions.',
            ]}
          />
        </div>

        {/* Technology */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Card>
            <CardHeader title="Technology" subtitle="Frontend architecture" />
            <div className="flex flex-wrap gap-2 px-5 py-4">
              {['React 18', 'TypeScript (strict)', 'Vite', 'Tailwind CSS', 'React Router', 'Motion for React', 'React-Leaflet / Leaflet', 'Recharts', 'jsPDF', 'Lucide icons'].map((t) => (
                <Badge key={t} color="blue" dot={false}>{t}</Badge>
              ))}
            </div>
            <p className="border-t border-navy-800/60 px-5 py-3 text-[11px] leading-relaxed text-navy-400">
              The UI talks to a centralised service layer (src/services/mockApi.ts)
              with typed interfaces. Every mock service can be replaced by a
              real FastAPI + AI/GIS backend endpoint without rewriting the UI.
            </p>
          </Card>
        </motion.div>

        {/* Mock data notice */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Card className="border-amber-500/30 bg-amber-500/10">
            <div className="flex gap-3 p-5">
              <Database size={20} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-bold text-amber-900">
                  Current build: mock analysis data
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-300/90">
                  This frontend uses realistic simulated data for the default
                  demo scenario (Trishuli, Nepal · 26 August 2026). The
                  planned backend will connect Sentinel-1 acquisition,
                  Copernicus DEM preprocessing, AI segmentation inference,
                  OSM-based road network analysis and EMSR927 validation. No
                  real flood event is represented anywhere in this demo.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Team */}
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Card>
            <CardHeader title="Team" subtitle="Hackathon build crew" action={<Users size={16} className="text-navy-400" />} />
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'A. Sharma', role: 'Frontend & GIS UX' },
                { name: 'R. Thapa', role: 'AI / Segmentation' },
                { name: 'S. Maharjan', role: 'Backend & Data' },
                { name: 'M. Gurung', role: 'Domain & Validation' },
              ].map((m) => (
                <div key={m.name} className="flex items-center gap-3 rounded-xl border border-navy-800 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {m.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{m.name}</p>
                    <p className="text-[11px] text-navy-400">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <p className="flex items-center gap-2 pb-2 text-[11px] text-navy-400">
          <Layers2 size={12} />
          AQUASCOPE · Satellite-Powered Flood Impact Mapping & Disaster Intelligence Platform
        </p>
      </div>
    </div>
  );
}

function AboutCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string[];
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <Card className="h-full p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/12 text-brand-400">
          {icon}
        </span>
        <h2 className="mt-3 text-base font-bold text-white">{title}</h2>
        <div className="mt-2 space-y-2">
          {body.map((p, i) => (
            <p key={i} className="text-[13px] leading-relaxed text-navy-300">{p}</p>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
