import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Droplets,
  FileText,
  Home,
  Info,
  Plus,
  Route as RouteIcon,
  Satellite,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalysis } from '../context/AnalysisContext';
import { Badge, Button, Card, CardHeader, Chip, EmptyState, MetricCard, ProgressBar } from '../components/ui';
import { PageHeader } from '../components/layout/PageHeader';
import { FloodMap, DEFAULT_LAYERS } from '../components/map/FloodMap';
import type { FeatureInfo, MapLayerState } from '../types';
import { classNames, formatDateLong, formatDuration, formatNumber } from '../utils/geo';

export function Dashboard() {
  const { result } = useAnalysis();
  const navigate = useNavigate();

  // Progressive layer reveal on mount
  const [revealed, setRevealed] = useState(0);
  const [layers, setLayers] = useState<MapLayerState>(() => ({
    ...DEFAULT_LAYERS,
    buildings: false,
    bridges: false,
    hospitals: false,
    towns: false,
    routes: false,
  }));
  const [opacities, setOpacities] = useState<Record<string, number>>({
    floodHigh: 0.55,
    floodBorderline: 0.5,
    floodUncertain: 0.45,
    roads: 0.95,
    buildings: 0.8,
  });
  const [selectedFeature, setSelectedFeature] = useState<FeatureInfo | null>(null);

  useEffect(() => {
    const timers = [500, 1000, 1500, 2000].map((t) =>
      setTimeout(() => setRevealed((r) => r + 1), t),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    setLayers((l) => ({
      ...l,
      buildings: revealed >= 3,
      bridges: revealed >= 3,
      hospitals: revealed >= 3,
      towns: revealed >= 3,
      routes: revealed >= 4,
    }));
  }, [revealed]);

  const flood = result?.flood;
  const inf = result?.infrastructure;
  const conn = result?.connectivity;
  const val = result?.validation;

  const affectedBars = useMemo(() => {
    if (!inf) return [];
    return [
      { name: 'Roads', pct: inf.roads.affectedPct, value: `${inf.roads.affectedKm}/${inf.roads.totalKm} km` },
      { name: 'Buildings', pct: inf.buildings.affectedPct, value: `${inf.buildings.affected}/${inf.buildings.total}` },
      { name: 'Bridges', pct: inf.bridges.affectedPct, value: `${inf.bridges.affected}/${inf.bridges.total}` },
    ];
  }, [inf]);

  const confidenceData = useMemo(() => {
    if (!flood) return [];
    return [
      { name: 'Higher confidence', value: flood.highConfidenceKm2, color: '#0E63C2' },
      { name: 'Borderline', value: flood.borderlineKm2, color: '#F59E0B' },
      { name: 'Terrain uncertain', value: flood.uncertainKm2, color: '#8B5CF6' },
    ];
  }, [flood]);

  if (!result) {
    return (
      <div className="h-full overflow-y-auto bg-navy-950">
        <PageHeader
          title="Dashboard"
          subtitle="Flood impact overview, interactive map and key indicators."
        />
        <div className="px-6 pb-10">
          <EmptyState
            icon={<Droplets size={24} />}
            title="No analysis loaded"
            message="Run a flood analysis to populate the dashboard with flood extent, infrastructure impact and connectivity results."
            action={
              <>
                <Button onClick={() => navigate('/setup')} icon={<Plus size={15} />}>
                  Start Analysis
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/demo')}
                  icon={<Satellite size={15} />}
                >
                  Explore Demo Mode
                </Button>
              </>
            }
          />
        </div>
      </div>
    );
  }

  const md = result.metadata;

  return (
    <div className="flex h-full flex-col bg-navy-950">
      <PageHeader
        title="Dashboard"
        subtitle={`${md.locationName} · Event ${formatDateLong(md.eventDate)} · ${md.aoiName}`}
        badge={<Badge color="amber">Demo / Simulated Data</Badge>}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/setup')} icon={<Plus size={14} />}>
              New Analysis
            </Button>
            <Button size="sm" onClick={() => navigate('/reports')} icon={<FileText size={14} />}>
              Situation Report
            </Button>
          </>
        }
      />

      {/* Main 3-column workspace */}
      <div className="flex min-h-0 flex-1 gap-4 px-6 pb-4">
        {/* Left: KPIs */}
        <div className="hidden w-[240px] shrink-0 flex-col gap-3 overflow-y-auto xl:flex">
          {[
            {
              label: 'Flooded Area',
              value: `${flood!.totalAreaKm2} km²`,
              sub: `${flood!.highConfidenceKm2} km² higher confidence`,
              icon: <Droplets size={18} />,
              accent: 'blue' as const,
            },
            {
              label: 'Roads Potentially Affected',
              value: `${inf!.roads.affectedKm} km`,
              sub: `of ${inf!.roads.totalKm} km · ${inf!.roads.affectedPct}%`,
              icon: <RouteIcon size={18} />,
              accent: 'red' as const,
            },
            {
              label: 'Buildings Potentially Affected',
              value: formatNumber(inf!.buildings.affected),
              sub: `of ${formatNumber(inf!.buildings.total)} · ${inf!.buildings.affectedPct}%`,
              icon: <Building2 size={18} />,
              accent: 'amber' as const,
            },
            {
              label: 'Bridges Potentially Affected',
              value: String(inf!.bridges.affected),
              sub: `of ${inf!.bridges.total} · ${inf!.bridges.affectedPct}%`,
              icon: <Building2 size={18} />,
              accent: 'amber' as const,
            },
            {
              label: 'Potentially Road-Disconnected',
              value: String(conn!.disconnected),
              sub: `of ${conn!.settlementsAnalyzed} settlements analyzed`,
              icon: <Users size={18} />,
              accent: 'violet' as const,
            },
          ].map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.09, duration: 0.35 }}
            >
              <MetricCard label={k.label} value={k.value} sub={k.sub} icon={k.icon} accent={k.accent} />
            </motion.div>
          ))}

          {/* Confidence donut */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
            <Card>
              <CardHeader title="Flood Confidence" subtitle="Mapped extent by category" />
              <div className="h-40 px-2 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={confidenceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {confidenceData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} km²`, name]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #1E3F66', background: '#0B1F3A', color: '#E2EAF4' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 px-4 pb-4">
                {confidenceData.map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-[11px] text-navy-300">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                    <span className="ml-auto font-mono font-semibold">{d.value} km²</span>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </div>

        {/* Center: map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="min-w-0 flex-1 overflow-hidden rounded-xl border border-navy-800 shadow-panel"
        >
          <FloodMap
            result={result}
            layers={layers}
            onLayersChange={setLayers}
            opacities={opacities}
            onOpacityChange={(k, v) => setOpacities((o) => ({ ...o, [k]: v }))}
            selectedFeature={selectedFeature}
            onFeatureSelect={setSelectedFeature}
          />
        </motion.div>

        {/* Right: insights */}
        <div className="hidden w-[280px] shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader title="Alerts & Insights" subtitle="Priority items for response" />
              <ul className="space-y-2.5 px-4 py-3">
                <InsightRow
                  tone="red"
                  title={`${conn!.disconnected} settlements potentially road-disconnected`}
                  detail="No valid modelled road route remains to their relevant town."
                  to="/settlements"
                />
                <InsightRow
                  tone="amber"
                  title={`${conn!.alternativeUnavailable} settlements without alternative route`}
                  detail="May require aerial assessment or evacuation support."
                  to="/settlements"
                />
                <InsightRow
                  tone="blue"
                  title="Alternative satellite scene auto-selected"
                  detail="Primary co-event scene unavailable; orbit 143 scene from +1 day used."
                  to="/flood"
                />
                <InsightRow
                  tone="green"
                  title={`Validation IoU ${val!.metrics.iou} vs EMSR927`}
                  detail="Model extent slightly smaller than reference mapping."
                  to="/validation"
                />
              </ul>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader title="Affected Share" subtitle="Potentially affected / total" />
              <div className="h-44 px-3 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={affectedBars} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#7E97B8' }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#C4D4E8' }} width={70} />
                    <Tooltip
                      formatter={(value: number, _name: string, item?: unknown) => [
                        `${value}%  (${(item as { payload?: { value?: string } })?.payload?.value ?? ''})`,
                        'Potentially affected',
                      ]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #1E3F66', background: '#0B1F3A', color: '#E2EAF4' }}
                    />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={16}>
                      {affectedBars.map((d, i) => (
                        <Cell key={i} fill={['#DC2626', '#F97316', '#D97706'][i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader title="Modules" subtitle="Detailed analysis views" />
              <ul className="space-y-0.5 px-2 py-2">
                {[
                  { to: '/flood', label: 'Flood Detection', icon: Droplets },
                  { to: '/infrastructure', label: 'Infrastructure Impact', icon: Building2 },
                  { to: '/connectivity', label: 'Road Connectivity', icon: RouteIcon },
                  { to: '/settlements', label: 'Settlements', icon: Users },
                  { to: '/validation', label: 'Validation', icon: ShieldCheck },
                ].map((m) => (
                  <li key={m.to}>
                    <Link
                      to={m.to}
                      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-navy-200 hover:bg-brand-500/12 hover:text-brand-300"
                    >
                      <m.icon size={15} className="text-navy-400 group-hover:text-brand-400" />
                      {m.label}
                      <ArrowRight size={13} className="ml-auto text-navy-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Metadata strip */}
      <div className="shrink-0 border-t border-navy-800 bg-navy-900 px-6 py-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-navy-400">
          <Chip><Satellite size={11} /> {md.analysisId}</Chip>
          <Chip>Model {md.modelVersion}</Chip>
          <Chip>Threshold {md.threshold}</Chip>
          <Chip>DEM {md.demSource}</Chip>
          <Chip>OSM {md.osmRelease}</Chip>
          <Chip>Processed in {formatDuration(md.processingTimeMs)}</Chip>
          <span className="ml-auto hidden items-center gap-1.5 text-navy-400 md:flex">
            <Info size={11} />
            Click map features for details · toggle layers in the map panel
          </span>
        </div>
      </div>
    </div>
  );
}

function InsightRow({
  tone,
  title,
  detail,
  to,
}: {
  tone: 'red' | 'amber' | 'blue' | 'green';
  title: string;
  detail: string;
  to: string;
}) {
  const tones = {
    red: 'border-l-red-500',
    amber: 'border-l-amber-500',
    blue: 'border-l-brand-500',
    green: 'border-l-green-500',
  };
  return (
    <li>
      <Link
        to={to}
        className={classNames('block rounded-r-lg border-l-4 bg-navy-800/60 px-3 py-2 hover:bg-brand-500/12', tones[tone])}
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold text-navy-100">
          {tone === 'red' && <AlertTriangle size={12} className="text-red-500" />}
          {title}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-navy-400">{detail}</p>
      </Link>
    </li>
  );
}
