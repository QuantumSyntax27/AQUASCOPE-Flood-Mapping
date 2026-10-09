import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CircleDot,
  GitBranch,
  Route as RouteIcon,
  Unplug,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnalysis } from '../context/AnalysisContext';
import { Badge, Button, Card, CardHeader, EmptyState, ProgressBar } from '../components/ui';
import { PageHeader, DemoBadge } from '../components/layout/PageHeader';
import { FloodMap, DEFAULT_LAYERS } from '../components/map/FloodMap';
import type { FeatureInfo, MapLayerState, Settlement } from '../types';
import { classNames } from '../utils/geo';

export function Connectivity() {
  const { result } = useAnalysis();
  const [layers, setLayers] = useState<MapLayerState>({
    ...DEFAULT_LAYERS,
    floodMask: true,
    floodHigh: true,
    floodBorderline: false,
    floodUncertain: false,
    buildings: false,
    settlements: true,
    disconnected: true,
    hospitals: true,
    towns: true,
    routes: true,
    bridges: false,
  });
  const [opacities, setOpacities] = useState<Record<string, number>>({});
  const [selectedFeature, setSelectedFeature] = useState<FeatureInfo | null>(null);

  const featured = useMemo(
    () => (result ? result.connectivity.settlements.filter((s) => s.status === 'disconnected').slice(0, 3) : []),
    [result],
  );

  if (!result) {
    return (
      <div className="h-full overflow-y-auto bg-navy-950">
        <PageHeader title="Road Connectivity" subtitle="Road-graph analysis and potentially road-disconnected settlements." />
        <div className="px-6">
          <EmptyState
            icon={<RouteIcon size={24} />}
            title="No analysis loaded"
            message="Run an analysis to view connectivity results and alternative routes."
          />
        </div>
      </div>
    );
  }

  const conn = result.connectivity;

  return (
    <div className="flex h-full flex-col bg-navy-950">
      <PageHeader
        title="Road Connectivity"
        subtitle="Potentially affected road segments are removed from the road graph; settlements are then tested for a valid route to their relevant town."
        badge={<DemoBadge />}
      />

      <div className="flex min-h-0 flex-1 gap-4 px-6 pb-6">
        {/* Left content */}
        <div className="min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Settlements analyzed', value: conn.settlementsAnalyzed, tone: 'blue' },
              { label: 'Connected', value: conn.connected, tone: 'green' },
              { label: 'Potentially road-disconnected', value: conn.disconnected, tone: 'red' },
              { label: 'Affected segments removed', value: conn.removedSegments, tone: 'amber' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400">{s.label}</p>
                  <p className={classNames(
                    'mt-1 text-2xl font-extrabold tabular-nums',
                    s.tone === 'red' ? 'text-red-400' : s.tone === 'green' ? 'text-green-400' : s.tone === 'amber' ? 'text-amber-400' : 'text-brand-400',
                  )}>
                    {s.value}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Road graph */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader
                title="Road Graph"
                subtitle="Towns, settlements and modelled road links — removed segments shown dashed red"
                action={<Badge color="slate">schematic</Badge>}
              />
              <div className="px-4 pb-4">
                <RoadGraph settlements={conn.settlements} towns={conn.towns} />
                <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-medium text-navy-400">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> Town</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" /> Connected settlement</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Potentially road-disconnected</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-6 border-t-2 border-dashed border-red-500" /> Removed road link</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-0 w-6 border-t border-slate-400" /> Usable link</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Before / after route comparison */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card>
              <CardHeader
                title="Route Comparison"
                subtitle="Before the event vs. after removing potentially affected segments"
              />
              <div className="grid gap-3 px-4 py-4 md:grid-cols-3">
                {featured.map((s, i) => (
                  <RouteComparisonCard key={s.id} settlement={s} index={i} />
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Alternative routes */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card>
              <CardHeader
                title="Alternative Routes"
                subtitle="Evaluated automatically for every potentially road-disconnected settlement"
              />
              <div className="px-5 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-green-100 bg-green-500/10 p-3.5">
                    <p className="text-2xl font-extrabold text-green-400 tabular-nums">{conn.alternativeAvailable}</p>
                    <p className="text-xs font-semibold text-green-300">with alternative route</p>
                    <div className="mt-2">
                      <ProgressBar value={(conn.alternativeAvailable / Math.max(1, conn.disconnected)) * 100} color="bg-green-500" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-500/10 p-3.5">
                    <p className="text-2xl font-extrabold text-red-400 tabular-nums">{conn.alternativeUnavailable}</p>
                    <p className="text-xs font-semibold text-red-300">without alternative route</p>
                    <div className="mt-2">
                      <ProgressBar value={(conn.alternativeUnavailable / Math.max(1, conn.disconnected)) * 100} color="bg-red-500" />
                    </div>
                  </div>
                </div>
                <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-navy-400">
                  <Unplug size={13} className="mt-0.5 shrink-0 text-navy-400" />
                  A settlement is only reported as potentially road-disconnected when
                  no valid road route remains to its selected relevant destination
                  after affected segments are removed. This describes modelled road
                  access — it does not mean people are trapped.
                </p>
                <Link
                  to="/settlements"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300"
                >
                  View all {conn.disconnected} potentially road-disconnected settlements
                  <ArrowRight size={13} />
                </Link>
              </div>
            </Card>
          </motion.div>
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

function RouteComparisonCard({ settlement, index }: { settlement: Settlement; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.07 }}
      className="rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel"
    >
      <p className="text-sm font-bold text-white">{settlement.name}</p>
      <p className="text-[11px] text-navy-400">→ {settlement.relevantTown}</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-300">
            <CircleDot size={12} className="text-slate-400" /> Before event
          </span>
          <span className="font-mono text-xs font-bold text-navy-100">{settlement.beforeRouteKm} km</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-300">
            <AlertTriangle size={12} /> After event
          </span>
          <span className="font-mono text-xs font-bold text-red-400">
            {settlement.afterRouteKm ? `${settlement.afterRouteKm} km` : 'No usable route'}
          </span>
        </div>
      </div>
      <div className="mt-3">
        {settlement.alternativeRoute ? (
          <Badge color="green">Alternative route available</Badge>
        ) : (
          <Badge color="red">No alternative route</Badge>
        )}
      </div>
    </motion.div>
  );
}

/** Schematic road-graph built from real settlement coordinates. */
function RoadGraph({
  settlements,
  towns,
}: {
  settlements: Settlement[];
  towns: Settlement[];
}) {
  const disconnected = settlements.filter((s) => s.status === 'disconnected').slice(0, 4);
  const connected = settlements.filter((s) => s.status === 'connected').slice(0, 3);

  const nodes = useMemo(() => {
    const all = [...towns, ...disconnected, ...connected];
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    all.forEach((n) => {
      minLat = Math.min(minLat, n.lat);
      maxLat = Math.max(maxLat, n.lat);
      minLng = Math.min(minLng, n.lng);
      maxLng = Math.max(maxLng, n.lng);
    });
    const W = 640, H = 300, pad = 40;
    const project = (lat: number, lng: number) => ({
      x: pad + ((lng - minLng) / Math.max(1e-6, maxLng - minLng)) * (W - pad * 2),
      y: H - pad - ((lat - minLat) / Math.max(1e-6, maxLat - minLat)) * (H - pad * 2),
    });
    return {
      W,
      H,
      townNodes: towns.map((t, i) => ({ ...project(t.lat, t.lng), name: t.name, id: `t${i}`, kind: 'town' as const })),
      discNodes: disconnected.map((s, i) => ({ ...project(s.lat, s.lng), name: s.name, id: `d${i}`, kind: 'disc' as const, town: s.relevantTown })),
      connNodes: connected.map((s, i) => ({ ...project(s.lat, s.lng), name: s.name, id: `c${i}`, kind: 'conn' as const, town: s.relevantTown })),
    };
  }, [towns, disconnected, connected]);

  const townPos = (name: string) => nodes.townNodes.find((t) => t.name === name);

  return (
    <svg data-demo="connectivity-graph" viewBox={`0 0 ${nodes.W} ${nodes.H}`} className="w-full rounded-lg bg-navy-800/50" role="img" aria-label="Schematic road graph">
      {/* usable links: town chain */}
      {nodes.townNodes.slice(1).map((t, i) => {
        const prev = nodes.townNodes[i];
        return (
          <line key={`tt-${i}`} x1={prev.x} y1={prev.y} x2={t.x} y2={t.y} stroke="#94A3B8" strokeWidth="1.6" />
        );
      })}
      {/* connected settlement links */}
      {nodes.connNodes.map((n, i) => {
        const t = townPos(n.town);
        if (!t) return null;
        return (
          <g key={`cc-${i}`}>
            <line x1={n.x} y1={n.y} x2={t.x} y2={t.y} stroke="#94A3B8" strokeWidth="1.2" />
          </g>
        );
      })}
      {/* removed links */}
      {nodes.discNodes.map((n, i) => {
        const t = townPos(n.town);
        if (!t) return null;
        return (
          <g key={`dd-${i}`}>
            <line x1={n.x} y1={n.y} x2={t.x} y2={t.y} stroke="#DC2626" strokeWidth="2" strokeDasharray="5 4" />
            <circle cx={(n.x + t.x) / 2} cy={(n.y + t.y) / 2} r="4" fill="#DC2626" />
          </g>
        );
      })}
      {/* town nodes */}
      {nodes.townNodes.map((t, i) => (
        <g key={`tn-${i}`}>
          <rect x={t.x - 6} y={t.y - 6} width="12" height="12" rx="3" fill="#0EA5E9" stroke="#fff" strokeWidth="1.5" />
          <text x={t.x} y={t.y - 11} textAnchor="middle" fontSize="9" fontWeight="600" fill="#E2EAF4">{t.name}</text>
        </g>
      ))}
      {/* connected settlement nodes */}
      {nodes.connNodes.map((n, i) => (
        <g key={`cn-${i}`}>
          <circle cx={n.x} cy={n.y} r="4.5" fill="#16A34A" stroke="#fff" strokeWidth="1.4" />
          <text x={n.x} y={n.y + 14} textAnchor="middle" fontSize="8.5" fill="#E2EAF4">{n.name}</text>
        </g>
      ))}
      {/* disconnected settlement nodes */}
      {nodes.discNodes.map((n, i) => (
        <g key={`dn-${i}`}>
          <circle cx={n.x} cy={n.y} r="5.5" fill="#DC2626" stroke="#fff" strokeWidth="1.6" />
          <text x={n.x} y={n.y + 15} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#B91C1C">{n.name}</text>
        </g>
      ))}
    </svg>
  );
}
