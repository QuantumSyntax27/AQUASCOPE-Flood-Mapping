import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpenCheck, Info, Layers2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';
import { Badge, Card, CardHeader, EmptyState, MetricCard, ProgressBar } from '../components/ui';
import { PageHeader, DemoBadge } from '../components/layout/PageHeader';
import { FloodMap, DEFAULT_LAYERS } from '../components/map/FloodMap';
import type { FeatureInfo, MapLayerState } from '../types';

export function Validation() {
  const { result } = useAnalysis();
  const [layers, setLayers] = useState<MapLayerState>({
    ...DEFAULT_LAYERS,
    floodMask: true,
    floodHigh: true,
    floodBorderline: false,
    floodUncertain: false,
    buildings: false,
    bridges: false,
    settlements: false,
    disconnected: false,
    hospitals: false,
    towns: false,
    routes: false,
    validation: true,
  });
  const [opacities, setOpacities] = useState<Record<string, number>>({
    floodHigh: 0.45,
  });
  const [selectedFeature, setSelectedFeature] = useState<FeatureInfo | null>(null);

  if (!result) {
    return (
      <div className="h-full overflow-y-auto bg-navy-950">
        <PageHeader title="Validation" subtitle="Comparison against reference mapping." />
        <div className="px-6">
          <EmptyState icon={<ShieldCheck size={24} />} title="No analysis loaded" message="Run an analysis to view validation results." />
        </div>
      </div>
    );
  }

  const v = result.validation;
  const m = v.metrics;

  const metricCards = [
    { label: 'IoU', value: m.iou, desc: 'Intersection over union' },
    { label: 'Dice', value: m.dice, desc: 'F1 coefficient' },
    { label: 'Precision', value: m.precision, desc: 'Correct flood detections' },
    { label: 'Recall', value: m.recall, desc: 'Reference flood detected' },
    { label: 'F1', value: m.f1, desc: 'Harmonic mean' },
  ];

  const chartData = [
    { name: 'Model', value: v.modelAreaKm2, color: '#0E63C2' },
    { name: 'Reference (EMSR927)', value: v.referenceAreaKm2, color: '#16A34A' },
    { name: 'Overlap', value: v.overlapKm2, color: '#38BDF8' },
  ];

  return (
    <div className="flex h-full flex-col bg-navy-950">
      <PageHeader
        title="Validation"
        subtitle="Model output compared against EMSR927 reference mapping (validation data only — never model input)."
        badge={<DemoBadge />}
      />

      <div className="flex min-h-0 flex-1 gap-4 px-6 pb-6">
        {/* Left content */}
        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3 md:grid-cols-5"
          >
            {metricCards.map((c) => (
              <Card key={c.label} className="p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400">{c.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-white tabular-nums">
                  {c.value.toFixed(3)}
                </p>
                <p className="mt-0.5 text-[10px] text-navy-400">{c.desc}</p>
                <ProgressBar value={c.value * 100} className="mt-2" />
              </Card>
            ))}
          </motion.div>

          <p className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[11px] text-amber-300">
            <Badge color="amber" dot={false}>Demo / Mock Evaluation</Badge>
            These metrics are simulated placeholder values for UI
            demonstration — they are not real experimental results.
          </p>

          {/* EMSR927 comparison */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card>
              <CardHeader
                title="EMSR927 Comparison"
                subtitle="Validation / Reference Data — not used as model input"
                action={<Badge color="green">Reference data</Badge>}
              />
              <div data-demo="validation-metrics" className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_260px]">
                <div>
                  {/* area comparison chart */}
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ left: 0, right: 12 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#C4D4E8' }} interval={0} />
                        <YAxis tick={{ fontSize: 10, fill: '#7E97B8' }} unit=" km²" />
                        <Tooltip
                          formatter={(value: number, name: string) => [`${value} km²`, name]}
                          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #1E3F66', background: '#0B1F3A', color: '#E2EAF4' }}
                        />
                        <Bar dataKey="value" radius={[5, 5, 0, 0]} barSize={34}>
                          {chartData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* comparison table */}
                  <table className="mt-4 w-full text-left text-xs">
                    <thead className="text-[10px] font-bold uppercase tracking-wider text-navy-400">
                      <tr>
                        <th className="py-2 pr-3">Metric</th>
                        <th className="py-2 pr-3 text-right">Model result</th>
                        <th className="py-2 pr-3 text-right">Reference result</th>
                        <th className="py-2 text-right">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.comparison.map((row) => {
                        const diff = row.model - row.reference;
                        const pct = (diff / Math.max(1e-6, row.reference)) * 100;
                        return (
                          <tr key={row.name} className="border-t border-navy-800/60">
                            <td className="py-2.5 pr-3 font-semibold text-navy-100">{row.name}</td>
                            <td className="py-2.5 pr-3 text-right font-mono text-navy-200">{row.model} {row.unit}</td>
                            <td className="py-2.5 pr-3 text-right font-mono text-navy-200">{row.reference} {row.unit}</td>
                            <td className="py-2.5 text-right">
                              <span className={`font-mono font-semibold ${diff < 0 ? 'text-brand-400' : diff > 0 ? 'text-amber-400' : 'text-navy-400'}`}>
                                {diff > 0 ? '+' : ''}{diff} {row.unit} ({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-navy-800/50 p-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-navy-400">
                      <Layers2 size={12} /> Overlap analysis
                    </p>
                    <p className="mt-2 text-sm font-bold text-white tabular-nums">
                      {v.overlapKm2} km² <span className="text-xs font-semibold text-navy-400">shared extent</span>
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-navy-400">
                      {(v.overlapKm2 / v.modelAreaKm2 * 100).toFixed(0)}% of the model extent
                      overlaps the reference; {(v.overlapKm2 / v.referenceAreaKm2 * 100).toFixed(0)}%
                      of the reference is detected by the model.
                    </p>
                  </div>
                  <div className="rounded-xl border border-brand-500/25 bg-brand-500/15 p-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-400">
                      <Info size={12} /> Interpretation
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-navy-200">{v.interpretation}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Limitations */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Card>
              <CardHeader
                title="Limitations & Uncertainty"
                subtitle="Read before operational use"
                action={<TriangleAlert size={16} className="text-amber-500" />}
              />
              <ul className="space-y-2.5 px-5 py-4">
                {v.limitations.map((l, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-800/70 text-[10px] font-bold text-navy-400">
                      {i + 1}
                    </span>
                    <p className="text-[13px] leading-relaxed text-navy-200">{l}</p>
                  </li>
                ))}
              </ul>
              <div className="border-t border-navy-800/60 px-5 py-3">
                <p className="flex items-center gap-2 text-[11px] text-navy-400">
                  <BookOpenCheck size={13} className="text-navy-400" />
                  Categories of uncertainty: terrain uncertainty (SAR layover/shadow),
                  borderline confidence zones, and reference-data limitations.
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right: map */}
        <div className="hidden w-[44%] shrink-0 flex-col overflow-hidden rounded-xl border border-navy-800 shadow-panel xl:flex">
          <div className="flex items-center justify-between border-b border-navy-800 bg-navy-900 px-4 py-2.5">
            <p className="text-xs font-bold text-navy-100">Model vs Reference</p>
            <div className="flex items-center gap-3 text-[10px] font-medium text-navy-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Model flood extent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-green-600" /> EMSR927 reference
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <FloodMap
              result={result}
              layers={layers}
              onLayersChange={setLayers}
              opacities={opacities}
              onOpacityChange={(k, v) => setOpacities((o) => ({ ...o, [k]: v }))}
              selectedFeature={selectedFeature}
              onFeatureSelect={setSelectedFeature}
              showLayerPanel={false}
              showLegend
            />
          </div>
        </div>
      </div>
    </div>
  );
}
