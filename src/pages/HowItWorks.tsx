import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit,
  ChevronDown,
  Database,
  FileText,
  Layers2,
  Map as MapIcon,
  Network,
  Radar,
  ScanSearch,
  Satellite,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Workflow,
} from 'lucide-react';
import { Badge, Card } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { classNames } from '../utils/geo';

interface PipelineStage {
  id: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  what: string;
  why: string;
  data: string;
  output: string;
}

const STAGES: PipelineStage[] = [
  {
    id: 'inputs',
    icon: <MapIcon size={18} />,
    title: 'Location + AOI + Event Date',
    tagline: 'The only inputs an analyst provides',
    what: 'The analyst provides the affected location, an area of interest (a river-corridor suggestion is generated automatically), and the date the flood occurred.',
    why: 'Everything downstream is derived from these three inputs — no sensor, orbit or model configuration is required from the user.',
    data: 'User input · geocoding · generated analysis corridor',
    output: 'Analysis request with AOI geometry and event date',
  },
  {
    id: 's1',
    icon: <Satellite size={18} />,
    title: 'Sentinel-1 Scene Selection',
    tagline: 'Automatic imagery acquisition',
    what: 'Suitable Sentinel-1 SAR scenes are selected automatically: a pre-event scene and a co-event scene from the same relative orbit for geometric consistency.',
    why: 'SAR penetrates clouds and works day and night — critical during monsoon floods when optical imagery is unusable.',
    data: 'Sentinel-1 A/B IW GRD (Copernicus)',
    output: 'Before + co-event scenes with verified AOI coverage',
  },
  {
    id: 'preprocess',
    icon: <SlidersHorizontal size={18} />,
    title: 'Preprocessing',
    tagline: 'Analysis-ready radar data',
    what: 'Orbit correction, thermal noise removal, radiometric calibration to sigma-0, and terrain correction using the Copernicus DEM.',
    why: 'Consistent, terrain-corrected backscatter is required for a fair before/after comparison — topography otherwise mimics flood signal.',
    data: 'Copernicus DEM GLO-30 · orbit files',
    output: 'Co-registered, terrain-corrected sigma-0 image pair',
  },
  {
    id: 'ai',
    icon: <BrainCircuit size={18} />,
    title: 'AI Flood Segmentation',
    tagline: 'Change-aware deep learning',
    what: 'A proposed Siamese U-Net / SNUNet-style change-aware segmentation approach compares the before and after scenes and produces a flood score map.',
    why: 'Change detection suppresses permanent water and highlights new inundation, which single-image classification cannot do reliably.',
    data: 'Preprocessed Sentinel-1 pair',
    output: 'Flood score / probability-like map',
  },
  {
    id: 'mask',
    icon: <ScanSearch size={18} />,
    title: 'Flood Mask',
    tagline: 'From scores to decisions',
    what: 'A validation-selected threshold converts the flood score map into a binary flood mask, split into higher-confidence, borderline and terrain-uncertain categories.',
    why: 'Reporting confidence categories is more honest than a single binary answer — responders can weight actions accordingly.',
    data: 'Flood score map · validation-selected threshold',
    output: 'Categorical flood mask (km² by confidence)',
  },
  {
    id: 'osm',
    icon: <Layers2 size={18} />,
    title: 'OSM Infrastructure Overlay',
    tagline: 'Where floods meet assets',
    what: 'OpenStreetMap roads, building footprints and bridges are intersected with the flood mask.',
    why: 'Raw flood extent alone does not tell responders what is at risk — infrastructure overlap translates extent into impact.',
    data: 'OpenStreetMap (roads, buildings, bridges)',
    output: 'Potentially affected roads, buildings, bridges',
  },
  {
    id: 'roads',
    icon: <Workflow size={18} />,
    title: 'Affected Roads',
    tagline: 'Segment-level assessment',
    what: 'Individual road segments that overlap the flood mask are flagged as potentially affected, with per-segment confidence.',
    why: 'Segment-level flags feed the connectivity model and let responders prioritise specific stretches, not just corridors.',
    data: 'Flood mask · OSM road network',
    output: 'Affected road segment list with lengths',
  },
  {
    id: 'graph',
    icon: <Network size={18} />,
    title: 'Road Graph Construction',
    tagline: 'Network model of the region',
    what: 'The road network is modelled as a graph. Potentially affected segments are removed to simulate passability after the event.',
    why: 'Flood impact on connectivity emerges from the network structure — a single blocked bridge can isolate many settlements.',
    data: 'OSM road graph · affected segments',
    output: 'Post-event road graph',
  },
  {
    id: 'connectivity',
    icon: <Radar size={18} />,
    title: 'Connectivity Analysis',
    tagline: 'Which settlements can still be reached?',
    what: 'Every settlement is tested for a valid route to its relevant town. Where no route remains, alternative routes are searched automatically.',
    why: 'Identifies communities that may need aerial assessment or evacuation support — without claiming anyone is trapped.',
    data: 'Post-event road graph · settlement locations',
    output: 'Connected / potentially road-disconnected settlements',
  },
  {
    id: 'settlements',
    icon: <Users size={18} />,
    title: 'Potentially Road-Disconnected Settlements',
    tagline: 'Prioritised response list',
    what: 'Settlements without any valid modelled route are listed with relevant town, relevant hospital, affected segments, and alternative-route availability.',
    why: 'Gives response coordinators a concrete, ranked list for ground verification and support planning.',
    data: 'Connectivity results · settlement attributes',
    output: 'Settlement-level impact dossier',
  },
  {
    id: 'validation',
    icon: <ShieldCheck size={18} />,
    title: 'Validation',
    tagline: 'Reference comparison',
    what: 'The flood mask is compared against EMSR927 reference mapping (IoU, Dice, precision, recall, F1) and differences are interpreted with limitations stated.',
    why: 'Disagreement with a reference does not automatically mean the model is wrong — reference mapping is not absolute ground truth.',
    data: 'EMSR927 (validation / reference data only)',
    output: 'Validation metrics + interpretation + limitations',
  },
  {
    id: 'report',
    icon: <FileText size={18} />,
    title: 'Situation Report',
    tagline: 'Shareable intelligence',
    what: 'All results are compiled into a structured situation report that can be generated and downloaded as a PDF for the response coordination cell.',
    why: 'Decision-makers need a concise, printable artefact — not a map application.',
    data: 'All analysis outputs',
    output: 'Situation report PDF',
  },
];

const AI_FLOW: Array<{ label: string; sub: string }> = [
  { label: 'Before Sentinel-1', sub: 'pre-event σ⁰' },
  { label: 'After Sentinel-1', sub: 'co-event σ⁰' },
  { label: 'Encoder', sub: 'shared feature encoder' },
  { label: 'Feature Comparison', sub: 'difference & context' },
  { label: 'Decoder', sub: 'dense upsampling' },
  { label: 'Flood Score Map', sub: 'probability-like output' },
  { label: 'Validation-selected Threshold', sub: 'e.g. 0.52' },
  { label: 'Binary Flood Mask', sub: 'with confidence categories' },
];

export function HowItWorks() {
  const [open, setOpen] = useState<string>('inputs');
  const [aiOpen, setAiOpen] = useState(true);

  return (
    <div className="h-full overflow-y-auto bg-navy-950">
      <PageHeader
        title="How It Works"
        subtitle="From a location and a date to a validated situation report — fully automated."
      />

      <div className="mx-auto max-w-5xl px-6 pb-10">
        {/* Pipeline overview strip */}
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-center gap-1.5 px-1 py-2">
            {STAGES.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setOpen(s.id);
                    document.getElementById(`stage-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={classNames(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                    open === s.id
                      ? 'border-brand-400/50 bg-brand-600 text-white shadow-sm'
                      : 'border-navy-700 bg-navy-900 text-navy-300 hover:border-brand-400/50 hover:text-brand-300',
                  )}
                >
                  <span className="font-mono text-[9px] opacity-70">{String(i + 1).padStart(2, '0')}</span>
                  {s.title.split(' ')[0]}
                </button>
                {i < STAGES.length - 1 && (
                  <span className="h-px w-3 bg-navy-200" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline detail */}
        <div className="mt-6 space-y-2.5">
          {STAGES.map((s, i) => {
            const expanded = open === s.id;
            return (
              <motion.div
                key={s.id}
                id={`stage-${s.id}`}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
              >
                <Card
                  className={classNames(
                    'overflow-hidden transition-shadow',
                    expanded ? 'shadow-lifted ring-1 ring-brand-400/40' : 'shadow-panel',
                  )}
                >
                  <button
                    onClick={() => setOpen(expanded ? '' : s.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-navy-800/50"
                  >
                    <span className={classNames(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      expanded ? 'bg-brand-600 text-white' : 'bg-navy-800/50 text-navy-300',
                    )}>
                      {s.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-navy-300">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-bold text-white">{s.title}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-navy-400">{s.tagline}</span>
                    </span>
                    <ChevronDown size={17} className={classNames('shrink-0 text-navy-300 transition-transform', expanded && 'rotate-180')} />
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-4 border-t border-navy-800/60 px-5 py-4 sm:grid-cols-2">
                          <QA icon={<ScanSearch size={13} />} q="What happens?" a={s.what} />
                          <QA icon={<Workflow size={13} />} q="Why is it needed?" a={s.why} />
                          <QA icon={<Database size={13} />} q="What data is used?" a={s.data} />
                          <QA icon={<FileText size={13} />} q="What comes out?" a={s.output} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* AI architecture */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mt-8"
        >
          <Card>
            <div className="flex items-center justify-between border-b border-navy-800/60 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-white">AI Architecture</h2>
                <p className="mt-0.5 text-xs text-navy-400">
                  Proposed Siamese U-Net / SNUNet-style change-aware
                  segmentation approach
                </p>
              </div>
              <Badge color="blue">Proposed approach</Badge>
            </div>
            <div className="px-5 py-5">
              <button
                onClick={() => setAiOpen((v) => !v)}
                aria-expanded={aiOpen}
                className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300"
              >
                <ChevronDown size={14} className={classNames('transition-transform', aiOpen && 'rotate-180')} />
                {aiOpen ? 'Hide' : 'Show'} architecture diagram
              </button>
              {aiOpen && <ArchitectureDiagram />}
              <p className="mt-4 text-[11px] leading-relaxed text-navy-400">
                Exact tensor dimensions and hyperparameters depend on the
                final model configuration and are intentionally not
                specified here. The final model choice (including whether
                SNUNet is adopted) will be validated before operational use.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function QA({ icon, q, a }: { icon: React.ReactNode; q: string; a: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500/12 text-brand-400">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-navy-400">{q}</p>
        <p className="mt-1 text-xs leading-relaxed text-navy-200">{a}</p>
      </div>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 900 340" className="min-w-[720px]" role="img" aria-label="AI architecture diagram">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#6A93C0" />
          </marker>
        </defs>

        {/* Before / After inputs */}
        <FlowBox x={30} y={70} w={150} h={70} title={AI_FLOW[0].label} sub={AI_FLOW[0].sub} fill="#EEF7FE" stroke="#B7D9FB" />
        <FlowBox x={30} y={190} w={150} h={70} title={AI_FLOW[1].label} sub={AI_FLOW[1].sub} fill="#EEF7FE" stroke="#B7D9FB" />

        {/* Encoder */}
        <FlowBox x={250} y={125} w={140} h={80} title={AI_FLOW[2].label} sub={AI_FLOW[2].sub} fill="#0E63C2" stroke="#0B4E9C" dark />
        <path d="M180 105 C 215 105 215 145 250 150" stroke="#6A93C0" strokeWidth="1.6" fill="none" markerEnd="url(#arrow)" />
        <path d="M180 225 C 215 225 215 175 250 165" stroke="#6A93C0" strokeWidth="1.6" fill="none" markerEnd="url(#arrow)" />

        {/* Feature comparison */}
        <FlowBox x={440} y={125} w={150} h={80} title={AI_FLOW[3].label} sub={AI_FLOW[3].sub} fill="#D9ECFD" stroke="#84BDF7" />
        <path d="M390 165 L440 165" stroke="#6A93C0" strokeWidth="1.6" fill="none" markerEnd="url(#arrow)" />

        {/* Decoder */}
        <FlowBox x={640} y={125} w={120} h={80} title={AI_FLOW[4].label} sub={AI_FLOW[4].sub} fill="#0E63C2" stroke="#0B4E9C" dark />
        <path d="M590 165 L640 165" stroke="#6A93C0" strokeWidth="1.6" fill="none" markerEnd="url(#arrow)" />

        {/* Flood score */}
        <FlowBox x={640} y={255} w={120} h={60} title={AI_FLOW[5].label} sub={AI_FLOW[5].sub} fill="#EEF7FE" stroke="#B7D9FB" />
        <path d="M700 205 L700 255" stroke="#6A93C0" strokeWidth="1.6" fill="none" markerEnd="url(#arrow)" />

        {/* Threshold */}
        <FlowBox x={440} y={255} w={150} h={60} title={AI_FLOW[6].label} sub={AI_FLOW[6].sub} fill="#FEF3C7" stroke="#FCD34D" />
        <path d="M640 285 L590 285" stroke="#6A93C0" strokeWidth="1.6" fill="none" markerEnd="url(#arrow)" />

        {/* Binary mask */}
        <FlowBox x={230} y={255} w={160} h={60} title={AI_FLOW[7].label} sub={AI_FLOW[7].sub} fill="#DCFCE7" stroke="#86EFAC" />
        <path d="M440 285 L390 285" stroke="#6A93C0" strokeWidth="1.6" fill="none" markerEnd="url(#arrow)" />

        {/* confidence annotation */}
        <text x={310} y={240} textAnchor="middle" fontSize="10" fill="#6A93C0">
          higher · borderline · terrain-uncertain
        </text>
      </svg>
    </div>
  );
}

function FlowBox({
  x, y, w, h, title, sub, fill, stroke, dark = false,
}: {
  x: number; y: number; w: number; h: number;
  title: string; sub: string; fill: string; stroke: string; dark?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={1.4} />
      <text
        x={x + w / 2}
        y={y + h / 2 - (sub ? 4 : 0)}
        textAnchor="middle"
        fontSize="11.5"
        fontWeight={700}
        fill={dark ? '#FFFFFF' : '#0B1F3A'}
      >
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize="9.5" fill={dark ? 'rgba(255,255,255,.75)' : '#6A93C0'}>
          {sub}
        </text>
      )}
    </g>
  );
}
