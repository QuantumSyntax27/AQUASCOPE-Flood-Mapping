import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Crosshair,
  Database,
  MapPin,
  Play,
  Satellite,
  ShieldCheck,
} from 'lucide-react';
import { Button, Chip } from '../ui';
import { getSatelliteScenes } from '../../services/mockApi';
import { formatCoord, formatDateLong } from '../../utils/geo';
import { useAnalysis } from '../../context/AnalysisContext';
import type { SetupState } from '../../pages/SetupFlow';

export function SummaryStep({
  state,
  onBack,
}: {
  state: SetupState;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const { startAnalysis } = useAnalysis();
  const [running, setRunning] = useState(false);

  const scenes = useMemo(
    () => (state.eventDate ? getSatelliteScenes(state.eventDate) : null),
    [state.eventDate],
  );

  const { location, aoi, eventDate } = state;
  if (!location || !aoi || !eventDate) return null;

  const run = async () => {
    setRunning(true);
    try {
      await startAnalysis({ location, aoi, eventDate });
      navigate('/analysis');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-white">Ready to Run Analysis</h2>
      <p className="mt-1 text-sm text-navy-400">
        Review the analysis configuration. All data selection, preprocessing
        and model settings are handled automatically.
      </p>

      <div className="mt-5 space-y-3">
        {/* Location */}
        <div className="flex items-start gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-brand-400">
            <MapPin size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">Location</p>
            <p className="mt-0.5 text-sm font-bold text-white">{location.name}</p>
            <p className="text-xs text-navy-400">{location.region}, {location.country}</p>
            <p className="mt-0.5 font-mono text-[11px] text-navy-400">
              {formatCoord(location.lat, location.lng)}
            </p>
          </div>
        </div>

        {/* AOI */}
        <div className="flex items-start gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-brand-400">
            <Crosshair size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">Area of Interest</p>
            <p className="mt-0.5 text-sm font-bold text-white">{aoi.name}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Chip>{aoi.areaKm2.toFixed(1)} km²</Chip>
              {aoi.shape && <Chip>River corridor · auto-generated</Chip>}
            </div>
          </div>
        </div>

        {/* Event date */}
        <div className="flex items-start gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-brand-400">
            <CalendarDays size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">Event Date</p>
            <p className="mt-0.5 text-sm font-bold text-white">{formatDateLong(eventDate)}</p>
          </div>
        </div>

        {/* Scenes */}
        {scenes && (
          <div className="flex items-start gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-brand-400">
              <Satellite size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">
                Selected Satellite Scenes
              </p>
              <div className="mt-1.5 space-y-1.5">
                <p className="text-xs text-navy-200">
                  <span className="font-semibold">Before:</span>{' '}
                  <span className="font-mono text-[10px] text-navy-400">{scenes.before.id}</span>
                </p>
                <p className="text-xs text-navy-200">
                  <span className="font-semibold">Co-event:</span>{' '}
                  <span className="font-mono text-[10px] text-navy-400">{scenes.after.id}</span>
                  {scenes.fallbackUsed && (
                    <Chip className="ml-2 border-amber-500/30 bg-amber-500/10 text-amber-300">auto-selected</Chip>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data status */}
        <div className="flex items-start gap-3 rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-brand-400">
            <Database size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">Data Status</p>
            <ul className="mt-1.5 space-y-1">
              {['Sentinel-1 scenes available (auto-selected)', 'Copernicus DEM coverage confirmed', 'OSM infrastructure loaded for AOI'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-xs text-navy-200">
                  <ShieldCheck size={13} className="shrink-0 text-green-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft size={14} /> Back
        </Button>
        <Button data-demo="run-analysis" size="lg" onClick={run} loading={running} icon={<Play size={16} />}>
          Run Analysis
        </Button>
      </div>
      <p className="mt-3 text-right text-[11px] text-navy-400">
        Simulated pipeline — no real satellite data is downloaded in this demo.
      </p>
    </div>
  );
}
