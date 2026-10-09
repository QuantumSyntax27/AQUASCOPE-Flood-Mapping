import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Columns2,
  Droplets,
  Info,
  Satellite,
} from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';
import { Badge, Button, Card, CardHeader, Chip, EmptyState, MetricCard, ProgressBar } from '../components/ui';
import { PageHeader, DemoBadge } from '../components/layout/PageHeader';
import { FloodMap, DEFAULT_LAYERS } from '../components/map/FloodMap';
import { BeforeAfterCompare } from '../components/map/BeforeAfterCompare';
import type { FeatureInfo, MapLayerState } from '../types';
import { formatDateLong } from '../utils/geo';
import { useDemoStep } from '../context/DemoContext';

export function FloodDetection() {
  const { result } = useAnalysis();
  const [mode, setMode] = useState<'map' | 'compare'>('map');
  const [layers, setLayers] = useState<MapLayerState>({
    ...DEFAULT_LAYERS,
    buildings: false,
    bridges: false,
    settlements: false,
    disconnected: false,
    hospitals: false,
    towns: false,
    routes: false,
    validation: false,
  });
  const [opacities, setOpacities] = useState<Record<string, number>>({
    floodHigh: 0.55,
    floodBorderline: 0.5,
    floodUncertain: 0.45,
  });
  const [selectedFeature, setSelectedFeature] = useState<FeatureInfo | null>(null);

  // Demo Mode: showcase the before/after comparison view
  useDemoStep(
    'flood',
    () => {
      const t = setTimeout(
        () => setMode((m) => (m === 'map' ? 'compare' : m)),
        1300,
      );
      return () => clearTimeout(t);
    },
    [result],
  );

  if (!result) {
    return (
      <div className="h-full overflow-y-auto bg-navy-950">
        <PageHeader title="Flood Detection" subtitle="AI change detection and flood extent analysis." />
        <div className="px-6">
          <EmptyState
            icon={<Droplets size={24} />}
            title="No analysis loaded"
            message="Run an analysis to view flood detection results, confidence categories and model metrics."
          />
        </div>
      </div>
    );
  }

  const f = result.flood;
  const md = result.metadata;
  const metrics = [
    { label: 'IoU', value: result.validation.metrics.iou },
    { label: 'Dice', value: result.validation.metrics.dice },
    { label: 'Precision', value: result.validation.metrics.precision },
    { label: 'Recall', value: result.validation.metrics.recall },
    { label: 'F1', value: result.validation.metrics.f1 },
  ];
  const categories = [
    { label: 'Higher confidence', km2: f.highConfidenceKm2, pct: (f.highConfidenceKm2 / f.totalAreaKm2) * 100, color: '#0E63C2' },
    { label: 'Borderline', km2: f.borderlineKm2, pct: (f.borderlineKm2 / f.totalAreaKm2) * 100, color: '#F59E0B' },
    { label: 'Terrain uncertain', km2: f.uncertainKm2, pct: (f.uncertainKm2 / f.totalAreaKm2) * 100, color: '#8B5CF6' },
  ];

  return (
    <div className="flex h-full flex-col bg-navy-950">
      <PageHeader
        title="Flood Detection"
        subtitle="Sentinel-1 change detection maps flood extent with confidence categories."
        badge={<DemoBadge />}
        actions={
          <div className="flex rounded-lg border border-navy-700 bg-navy-800/50 p-0.5">
            <button
              onClick={() => setMode('map')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'map' ? 'bg-navy-900 text-brand-300 shadow-sm' : 'text-navy-400'}`}
            >
              Flood Map
            </button>
            <button
              onClick={() => setMode('compare')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'compare' ? 'bg-navy-900 text-brand-300 shadow-sm' : 'text-navy-400'}`}
            >
              Before / After
            </button>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4 px-6 pb-6">
        {/* Map / comparison */}
        <div data-demo="flood-map" className="min-w-0 flex-1 overflow-hidden rounded-xl border border-navy-800 shadow-panel">
          {mode === 'map' ? (
            <FloodMap
              result={result}
              layers={layers}
              onLayersChange={setLayers}
              opacities={opacities}
              onOpacityChange={(k, v) => setOpacities((o) => ({ ...o, [k]: v }))}
              selectedFeature={selectedFeature}
              onFeatureSelect={setSelectedFeature}
            />
          ) : (
            <div className="h-full p-3">
              <BeforeAfterCompare
                result={result}
                beforeDate={md.beforeScene.acquisitionDate}
                afterDate={md.afterScene.acquisitionDate}
                height="100%"
                className="h-full"
              />
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-navy-400">
                <Info size={12} />
                Drag the divider to compare pre-event imagery with the co-event flood
                mask. Imagery is simulated for demonstration.
              </p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-[320px] shrink-0 space-y-3 overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader title="Mapped Flood Extent" subtitle={`Event ${formatDateLong(md.eventDate)}`} />
              <div className="px-5 py-4">
                <p className="text-3xl font-extrabold text-white tabular-nums">
                  {f.totalAreaKm2} <span className="text-base font-bold text-navy-400">km²</span>
                </p>
                <div className="mt-4 space-y-3">
                  {categories.map((c) => (
                    <div key={c.label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-navy-200">{c.label}</span>
                        <span className="font-mono text-navy-400">{c.km2} km² · {c.pct.toFixed(0)}%</span>
                      </div>
                      <ProgressBar value={c.pct} className="mt-1" barStyle={{ background: c.color }} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader
                title="Model Metrics"
                subtitle="Demo / mock evaluation — not experimental results"
                action={<Badge color="amber" dot={false}>Mock</Badge>}
              />
              <div className="space-y-2.5 px-5 py-4">
                {metrics.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-navy-200">{m.label}</span>
                      <span className="font-mono font-bold text-white">{m.value.toFixed(3)}</span>
                    </div>
                    <ProgressBar value={m.value * 100} className="mt-1" />
                  </div>
                ))}
                <p className="pt-1 text-[10px] leading-snug text-navy-400">
                  Metrics are simulated placeholder values shown for UI
                  demonstration until a validated model is connected.
                </p>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card>
              <CardHeader title="Analysis Metadata" subtitle="Automatic configuration" />
              <dl className="space-y-0 px-5 py-3">
                <MetaRow label="Location" value={md.locationName} />
                <MetaRow label="AOI" value={`${md.aoiName} (${md.aoiAreaKm2.toFixed(1)} km²)`} />
                <MetaRow label="Event date" value={formatDateLong(md.eventDate)} />
                <MetaRow label="Before scene" value={md.beforeScene.acquisitionDate} mono />
                <MetaRow label="Co-event scene" value={md.afterScene.acquisitionDate} mono />
                <MetaRow label="Relative orbit" value={`${md.afterScene.relativeOrbit} · ${md.afterScene.passDirection}`} />
                <MetaRow label="Model" value={md.modelVersion} mono />
                <MetaRow label="Threshold" value={String(md.threshold)} mono />
              </dl>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-brand-500/25 bg-brand-500/10">
              <div className="flex gap-3 p-4">
                <Satellite size={18} className="mt-0.5 shrink-0 text-brand-400" />
                <p className="text-[11px] leading-relaxed text-navy-300">
                  <span className="font-semibold text-navy-100">How it works:</span> pre-event
                  and co-event Sentinel-1 scenes are compared by a change-aware
                  segmentation model. A validation-selected threshold converts the
                  flood score map into a binary mask with confidence categories.
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-navy-800/60 py-1.5 last:border-0">
      <dt className="text-[11px] font-medium text-navy-400">{label}</dt>
      <dd className={`text-right text-[11px] font-semibold text-navy-100 ${mono ? 'font-mono' : ''} break-all`}>
        {value}
      </dd>
    </div>
  );
}
