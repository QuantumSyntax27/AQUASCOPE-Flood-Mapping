import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Building2,
  Landmark,
  Route as RouteIcon,
} from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';
import {
  Badge,
  Card,
  CardHeader,
  ConfidenceBadge,
  EmptyState,
} from '../components/ui';
import { PageHeader, DemoBadge } from '../components/layout/PageHeader';
import { FloodMap, DEFAULT_LAYERS } from '../components/map/FloodMap';
import type { FeatureInfo, MapLayerState } from '../types';
import { classNames, formatNumber } from '../utils/geo';

export function Infrastructure() {
  const { result } = useAnalysis();
  const [layers, setLayers] = useState<MapLayerState>({
    ...DEFAULT_LAYERS,
    floodMask: true,
    floodHigh: true,
    floodBorderline: false,
    floodUncertain: false,
    settlements: false,
    disconnected: false,
    hospitals: false,
    towns: false,
    routes: false,
    buildings: true,
    bridges: true,
  });
  const [opacities, setOpacities] = useState<Record<string, number>>({
    floodHigh: 0.35,
    buildings: 0.7,
  });
  const [selectedFeature, setSelectedFeature] = useState<FeatureInfo | null>(null);
  const [assetTab, setAssetTab] = useState<'roads' | 'buildings' | 'bridges'>('roads');

  if (!result) {
    return (
      <div className="h-full overflow-y-auto bg-navy-950">
        <PageHeader title="Infrastructure Impact" subtitle="Potentially affected roads, buildings and bridges." />
        <div className="px-6">
          <EmptyState
            icon={<Building2 size={24} />}
            title="No analysis loaded"
            message="Run an analysis to view infrastructure impact assessment."
          />
        </div>
      </div>
    );
  }

  const inf = result.infrastructure;

  const panels = [
    {
      id: 'roads' as const,
      icon: RouteIcon,
      title: 'Roads',
      total: `${inf.roads.totalKm} km`,
      affected: `${inf.roads.affectedKm} km`,
      pct: inf.roads.affectedPct,
      formula: 'affected length ÷ total length × 100',
      detail: `${inf.roads.affectedKm} of ${inf.roads.totalKm} km potentially affected`,
    },
    {
      id: 'buildings' as const,
      icon: Building2,
      title: 'Buildings',
      total: formatNumber(inf.buildings.total),
      affected: formatNumber(inf.buildings.affected),
      pct: inf.buildings.affectedPct,
      formula: 'affected buildings ÷ total buildings × 100',
      detail: `${formatNumber(inf.buildings.affected)} of ${formatNumber(inf.buildings.total)} buildings · footprint ${formatNumber(inf.buildings.affectedFootprintM2)} m² of ${formatNumber(inf.buildings.totalFootprintM2)} m²`,
    },
    {
      id: 'bridges' as const,
      icon: Landmark,
      title: 'Bridges',
      total: String(inf.bridges.total),
      affected: String(inf.bridges.affected),
      pct: inf.bridges.affectedPct,
      formula: 'affected bridges ÷ total bridges × 100',
      detail: `${inf.bridges.affected} of ${inf.bridges.total} bridges potentially affected`,
    },
  ];

  const affectedRoads = inf.roads.segments.filter((s) => s.affected);

  return (
    <div className="flex h-full flex-col bg-navy-950">
      <PageHeader
        title="Infrastructure Impact"
        subtitle="Flood-mask overlap with OSM infrastructure. Overlap indicates potential impact — not destruction."
        badge={<DemoBadge />}
      />

      <div className="flex min-h-0 flex-1 gap-4 px-6 pb-6">
        {/* Left: content */}
        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Three asset panels */}
          <div className="grid gap-3 md:grid-cols-3">
            {panels.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setAssetTab(p.id)}
                aria-pressed={assetTab === p.id}
                className={classNames(
                  'rounded-xl border p-4 text-left shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-lifted',
                  assetTab === p.id ? 'border-brand-400/50 bg-brand-500/10 ring-1 ring-brand-400/40' : 'border-navy-800 bg-navy-900',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={classNames(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    p.id === 'roads' ? 'bg-red-500/10 text-red-400' : p.id === 'buildings' ? 'bg-amber-500/10 text-amber-400' : 'bg-navy-800/50 text-navy-300',
                  )}>
                    <p.icon size={18} />
                  </span>
                  <ArrowUpRight size={15} className="text-navy-300" />
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-navy-400">{p.title}</p>
                <p className="mt-1 text-2xl font-extrabold text-white tabular-nums">
                  {p.affected}
                  <span className="ml-1.5 text-sm font-semibold text-navy-400">of {p.total}</span>
                </p>
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-navy-400">Potentially affected</span>
                    <span className="font-mono text-navy-100">{p.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-800/70">
                    <motion.div
                      className={classNames(
                        'h-full rounded-full',
                        p.id === 'roads' ? 'bg-red-500' : p.id === 'buildings' ? 'bg-amber-500' : 'bg-navy-500',
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${p.pct}%` }}
                      transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }}
                    />
                  </div>
                </div>
                <p className="mt-2.5 text-[10px] text-navy-400">Formula: {p.formula}</p>
              </motion.button>
            ))}
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[11px] leading-relaxed text-amber-300">
            <span className="mt-0.5 font-bold">Note:</span>
            "Potentially affected" means the asset overlaps the mapped flood
            extent. Flood overlap does not prove destruction — field verification
            is required before operational decisions.
          </p>

          {/* Detail section per tab */}
          {assetTab === 'roads' && (
            <Card>
              <CardHeader
                title="Road Segments"
                subtitle={`${affectedRoads.length} of ${inf.roads.segments.length} modelled segments potentially affected`}
                action={<Badge color="red">{inf.roads.affectedPct}% affected</Badge>}
              />
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-navy-800/50 text-[10px] font-bold uppercase tracking-wider text-navy-400">
                    <tr>
                      <th className="px-5 py-2.5">Segment</th>
                      <th className="px-3 py-2.5">Class</th>
                      <th className="px-3 py-2.5 text-right">Length</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-5 py-2.5">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inf.roads.segments.map((s) => (
                      <tr
                        key={s.id}
                        className={classNames(
                          'border-t border-navy-800/60',
                          s.affected ? 'bg-red-500/10' : '',
                        )}
                      >
                        <td className="px-5 py-2.5 font-semibold text-navy-100">{s.name}</td>
                        <td className="px-3 py-2.5 text-navy-400">{s.class}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-navy-200">{s.lengthKm} km</td>
                        <td className="px-3 py-2.5">
                          {s.affected ? (
                            <Badge color="red" dot={false}>Potentially affected</Badge>
                          ) : (
                            <Badge color="slate" dot={false}>Not affected</Badge>
                          )}
                        </td>
                        <td className="px-5 py-2.5">
                          {s.affected ? <ConfidenceBadge confidence={s.confidence} /> : <span className="text-navy-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {assetTab === 'buildings' && (
            <Card>
              <CardHeader title="Building Impact" subtitle="Footprint-area overlap with the flood mask" />
              <div data-demo="infra-panel" className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <StatBlock label="Total buildings" value={formatNumber(inf.buildings.total)} />
                <StatBlock label="Potentially affected" value={formatNumber(inf.buildings.affected)} accent="amber" />
                <StatBlock label="Total footprint" value={`${formatNumber(inf.buildings.totalFootprintM2)} m²`} />
                <StatBlock label="Affected footprint" value={`${formatNumber(inf.buildings.affectedFootprintM2)} m²`} accent="amber" />
              </div>
              <div className="border-t border-navy-800/60 px-5 py-3">
                <p className="text-[11px] text-navy-400">
                  The map shows a sampled subset of footprints (of {formatNumber(inf.buildings.total)} in the AOI
                  from OpenStreetMap). Affected footprint area: {inf.buildings.affectedPct}% of total.
                </p>
              </div>
            </Card>
          )}

          {assetTab === 'bridges' && (
            <Card>
              <CardHeader
                title="Bridge Assessment"
                subtitle={`${inf.bridges.affected} of ${inf.bridges.total} bridges potentially affected`}
                action={<Badge color="red">{inf.bridges.affectedPct}% affected</Badge>}
              />
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-navy-800/50 text-[10px] font-bold uppercase tracking-wider text-navy-400">
                    <tr>
                      <th className="px-5 py-2.5">Bridge</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Carries</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inf.bridges.bridges.map((b) => (
                      <tr key={b.id} className={classNames('border-t border-navy-800/60', b.affected ? 'bg-red-500/10' : '')}>
                        <td className="px-5 py-2.5 font-semibold text-navy-100">{b.name}</td>
                        <td className="px-3 py-2.5 text-navy-400">{b.type}</td>
                        <td className="px-3 py-2.5 text-navy-400">{b.road}</td>
                        <td className="px-3 py-2.5">
                          {b.affected ? (
                            <Badge color="red" dot={false}>Potentially affected</Badge>
                          ) : (
                            <Badge color="slate" dot={false}>Not affected</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Right: map */}
        <div className="hidden w-[44%] shrink-0 overflow-hidden rounded-xl border border-navy-800 shadow-panel xl:block">
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
  );
}

function StatBlock({ label, value, accent = 'blue' }: { label: string; value: string; accent?: 'blue' | 'amber' }) {
  return (
    <div className={classNames('rounded-xl border p-4', accent === 'amber' ? 'border-amber-500/20 bg-amber-500/10' : 'border-navy-800 bg-navy-800/60')}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-white tabular-nums">{value}</p>
    </div>
  );
}
