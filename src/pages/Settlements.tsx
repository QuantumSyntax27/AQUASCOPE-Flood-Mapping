import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Search,
  Users,
  X,
  MapPin,
  Hospital,
  Route as RouteIcon,
} from 'lucide-react';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import * as L from 'leaflet';
import { useAnalysis } from '../context/AnalysisContext';
import { Badge, Card, CardHeader, ConfidenceBadge, EmptyState } from '../components/ui';
import { PageHeader, DemoBadge } from '../components/layout/PageHeader';
import type { Settlement } from '../types';
import { classNames, formatCoord, formatNumber } from '../utils/geo';
import { BASEMAPS } from '../components/map/tiles';
import { useDemoStep } from '../context/DemoContext';

type SortKey = 'name' | 'population' | 'distance' | 'status';
type StatusFilter = 'all' | 'connected' | 'disconnected';
type ConfidenceFilter = 'all' | 'higher' | 'borderline' | 'lower';

export function Settlements() {
  const { result } = useAnalysis();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Settlement | null>(null);

  const settlements = useMemo(() => {
    if (!result) return [];
    let list = [...result.connectivity.settlements];
    if (statusFilter !== 'all') list = list.filter((s) => s.status === statusFilter);
    if (confidenceFilter !== 'all') list = list.filter((s) => s.confidence === confidenceFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.relevantTown.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'population':
          cmp = a.population - b.population;
          break;
        case 'distance':
          cmp = a.distanceToTownKm - b.distanceToTownKm;
          break;
        case 'status':
          cmp = a.status === b.status ? 0 : a.status === 'disconnected' ? 1 : -1;
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [result, statusFilter, confidenceFilter, query, sortKey, sortAsc]);

  // Demo Mode: open a potentially road-disconnected settlement
  useDemoStep(
    'settlement',
    () => {
      const t = setTimeout(() => {
        setSelected((cur) => {
          if (cur) return cur;
          const target =
            settlements.find((s) => s.status === 'disconnected') ??
            settlements[0];
          return target ?? null;
        });
      }, 1500);
      return () => clearTimeout(t);
    },
    [result, settlements],
  );

  if (!result) {
    return (
      <div className="h-full overflow-y-auto bg-navy-950">
        <PageHeader title="Settlements" subtitle="Settlement-level connectivity assessment." />
        <div className="px-6">
          <EmptyState icon={<Users size={24} />} title="No analysis loaded" message="Run an analysis to view settlement connectivity results." />
        </div>
      </div>
    );
  }

  const conn = result.connectivity;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  };

  return (
    <div className="flex h-full flex-col bg-navy-950">
      <PageHeader
        title="Settlements"
        subtitle={`${conn.settlementsAnalyzed} settlements analyzed · ${conn.connected} connected · ${conn.disconnected} potentially road-disconnected`}
        badge={<DemoBadge />}
      />

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 px-6 pb-4">
        <SummaryChip label="Analyzed" value={conn.settlementsAnalyzed} tone="blue" />
        <SummaryChip label="Connected" value={conn.connected} tone="green" />
        <SummaryChip label="Potentially road-disconnected" value={conn.disconnected} tone="red" />
        <SummaryChip label="Alternative route available" value={conn.alternativeAvailable} tone="green" />
        <SummaryChip label="Alternative route unavailable" value={conn.alternativeUnavailable} tone="amber" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settlement or town…"
            className="h-9 w-64 rounded-lg border border-navy-700 bg-navy-900 pl-8 pr-3 text-xs text-white placeholder:text-navy-500 focus:border-brand-400"
            aria-label="Search settlements"
          />
        </div>
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'connected', label: 'Connected' },
            { value: 'disconnected', label: 'Potentially road-disconnected' },
          ]}
          label="Status"
        />
        <FilterSelect
          value={confidenceFilter}
          onChange={(v) => setConfidenceFilter(v as ConfidenceFilter)}
          options={[
            { value: 'all', label: 'All confidence' },
            { value: 'higher', label: 'Higher confidence' },
            { value: 'borderline', label: 'Borderline' },
            { value: 'lower', label: 'Lower confidence' },
          ]}
          label="Confidence"
        />
        <span className="ml-auto text-xs text-navy-400">
          {settlements.length} of {conn.settlementsAnalyzed} shown
        </span>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 px-6 pb-6">
        <Card data-demo="settlement-table" className="flex h-full flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-navy-800/50 text-[10px] font-bold uppercase tracking-wider text-navy-400">
                <tr>
                  <SortTh label="Settlement" sortKey="name" active={sortKey === 'name'} asc={sortAsc} onClick={() => toggleSort('name')} />
                  <th className="px-3 py-2.5">Type</th>
                  <SortTh label="Population" sortKey="population" active={sortKey === 'population'} asc={sortAsc} onClick={() => toggleSort('population')} className="text-right" />
                  <th className="px-3 py-2.5">Relevant Town</th>
                  <th className="px-3 py-2.5">Relevant Hospital</th>
                  <SortTh label="Distance" sortKey="distance" active={sortKey === 'distance'} asc={sortAsc} onClick={() => toggleSort('distance')} className="text-right" />
                  <SortTh label="Status" sortKey="status" active={sortKey === 'status'} asc={sortAsc} onClick={() => toggleSort('status')} />
                  <th className="px-3 py-2.5">Alt. Route</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(s)}
                    tabIndex={0}
                    className={classNames(
                      'cursor-pointer border-t border-navy-800/60 transition-colors hover:bg-brand-500/15 focus:bg-brand-500/12',
                      selected?.id === s.id ? 'bg-brand-500/12' : '',
                    )}
                  >
                    <td className="px-5 py-2.5 font-semibold text-navy-100">{s.name}</td>
                    <td className="px-3 py-2.5 capitalize text-navy-400">{s.type}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-navy-200">{formatNumber(s.population)}</td>
                    <td className="px-3 py-2.5 text-navy-300">{s.relevantTown}</td>
                    <td className="px-3 py-2.5 text-navy-300">{s.relevantHospital}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-navy-200">{s.distanceToTownKm} km</td>
                    <td className="px-3 py-2.5">
                      {s.status === 'disconnected' ? (
                        <Badge color="red" dot={false}>Potentially road-disconnected</Badge>
                      ) : (
                        <Badge color="green" dot={false}>Connected</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.status === 'connected' ? (
                        <span className="text-navy-300">—</span>
                      ) : s.alternativeRoute ? (
                        <Badge color="green" dot={false}>{s.afterRouteKm} km</Badge>
                      ) : (
                        <Badge color="red" dot={false}>None</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-navy-400">
                      No settlements match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] bg-navy-950/30"
              onClick={() => setSelected(null)}
            />
            <motion.aside
              initial={{ x: 480 }}
              animate={{ x: 0 }}
              exit={{ x: 480 }}
              transition={{ type: 'tween', duration: 0.24 }}
              className="fixed inset-y-0 right-0 z-[510] flex w-[440px] max-w-full flex-col bg-navy-900 shadow-map"
              role="dialog"
              aria-label={`Settlement details: ${selected.name}`}
            >
              <div className="flex items-start justify-between gap-3 border-b border-navy-800 px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-400">
                    Settlement Detail
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-white">{selected.name}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selected.status === 'disconnected' ? (
                      <Badge color="red">Potentially road-disconnected</Badge>
                    ) : (
                      <Badge color="green">Connected</Badge>
                    )}
                    <ConfidenceBadge confidence={selected.confidence} />
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-800/50 hover:text-navy-200"
                  aria-label="Close details"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {/* Mini map */}
                <div className="overflow-hidden rounded-xl border border-navy-800 shadow-panel">
                  <SettlementMiniMap settlement={selected} />
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <DetailField label="Type" value={selected.type} />
                  <DetailField label="Population" value={`~${formatNumber(selected.population)}`} />
                  <DetailField label="Coordinates" value={formatCoord(selected.lat, selected.lng)} mono />
                  <DetailField label="Distance to town" value={`${selected.distanceToTownKm} km`} />
                </dl>

                <Card className="p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-navy-100">
                    <MapPin size={13} className="text-brand-400" /> Relevant destination
                  </p>
                  <div className="mt-2 space-y-1.5 text-xs text-navy-300">
                    <p>Town: <span className="font-semibold">{selected.relevantTown}</span></p>
                    <p className="flex items-center gap-1.5">
                      <Hospital size={12} className="text-navy-400" />
                      Hospital: <span className="font-semibold">{selected.relevantHospital}</span>
                    </p>
                  </div>
                </Card>

                <Card className="p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-navy-100">
                    <RouteIcon size={13} className="text-brand-400" /> Route assessment
                  </p>
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-navy-300">
                      Affected road segments: <span className="font-bold text-white">{selected.affectedSegments}</span>
                    </p>
                    <div className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2">
                      <span className="text-[11px] font-semibold text-navy-300">Before route</span>
                      <span className="font-mono text-xs font-bold text-navy-100">{selected.beforeRouteKm} km</span>
                    </div>
                    <div className={classNames(
                      'flex items-center justify-between rounded-lg px-3 py-2',
                      selected.afterRouteKm ? 'bg-green-500/10' : 'bg-red-500/10',
                    )}>
                      <span className={classNames('text-[11px] font-semibold', selected.afterRouteKm ? 'text-green-300' : 'text-red-300')}>
                        After route
                      </span>
                      <span className={classNames('font-mono text-xs font-bold', selected.afterRouteKm ? 'text-green-300' : 'text-red-400')}>
                        {selected.afterRouteKm ? `${selected.afterRouteKm} km` : 'No usable route'}
                      </span>
                    </div>
                    {selected.alternativeRoute ? (
                      <Badge color="green">Alternative route available ({selected.afterRouteKm} km)</Badge>
                    ) : (
                      <Badge color="red">No alternative route</Badge>
                    )}
                  </div>
                </Card>

                <p className="rounded-lg bg-navy-800/50 px-3 py-2.5 text-[10px] leading-relaxed text-navy-400">
                  "Potentially road-disconnected" means no valid modelled road
                  route remains to the selected relevant destination. It does not
                  indicate that people are trapped, and field verification is
                  required.
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'red' | 'amber' }) {
  const tones = {
    blue: 'border-brand-400/35 bg-brand-500/12 text-brand-300',
    green: 'border-green-500/30 bg-green-500/10 text-green-300',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  };
  return (
    <div className={classNames('flex items-center gap-2.5 rounded-xl border px-3.5 py-2', tones[tone])}>
      <span className="text-lg font-extrabold tabular-nums">{value}</span>
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-navy-300">
      {label}
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 appearance-none rounded-lg border border-navy-700 bg-navy-900 pl-2.5 pr-8 text-xs font-medium text-navy-100 focus:border-brand-400"
          aria-label={label}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-400" />
      </span>
    </label>
  );
}

function SortTh({
  label,
  sortKey,
  active,
  asc,
  onClick,
  className,
}: {
  label: string;
  sortKey: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th className={classNames('px-3 py-2.5', className)}>
      <button
        onClick={onClick}
        className={classNames(
          'inline-flex items-center gap-1 font-bold uppercase tracking-wider transition-colors',
          active ? 'text-brand-400' : 'hover:text-navy-300',
        )}
        aria-sort={active ? (asc ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        <ChevronDown size={11} className={classNames('transition-transform', active && !asc && 'rotate-180', !active && 'opacity-30')} />
      </button>
    </th>
  );
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-navy-400">{label}</dt>
      <dd className={classNames('mt-0.5 text-sm font-semibold text-white', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  );
}

const settlementIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(11,31,58,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

function SettlementMiniMap({ settlement }: { settlement: Settlement }) {
  const { result } = useAnalysis();
  const town = result?.connectivity.towns.find((t) => t.name === settlement.relevantTown);
  const altRoute = result?.connectivity.alternativeRoutes[settlement.id];
  const center: [number, number] = [settlement.lat, settlement.lng];

  return (
    <div className="relative" style={{ height: 210 }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={BASEMAPS[0].url} />
        {altRoute && (
          <Polyline
            positions={altRoute.map(([lng, lat]) => [lat, lng])}
            pathOptions={{ color: '#16A34A', weight: 3, dashArray: '6 5' }}
          />
        )}
        {town && (
          <Marker position={[town.lat, town.lng]} icon={settlementIcon('#0EA5E9')}>
          </Marker>
        )}
        <Marker
          position={[settlement.lat, settlement.lng]}
          icon={settlementIcon(settlement.status === 'disconnected' ? '#DC2626' : '#16A34A')}
        />
      </MapContainer>
      <div className="absolute left-2.5 top-2.5 z-[400] rounded-md bg-navy-950/75 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
        {settlement.name}
        {town ? ` → ${town.name}` : ''}
        {altRoute ? ' · alternative route' : settlement.status === 'disconnected' ? ' · no usable route' : ''}
      </div>
    </div>
  );
}
