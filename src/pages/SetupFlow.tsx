import { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import * as L from 'leaflet';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, MapPin, PenTool, Ruler, RotateCcw, X } from 'lucide-react';
import type { AOI, LatLng, MapTool, PlaceLocation } from '../types';
import { classNames } from '../utils/geo';
import { BASEMAPS } from '../components/map/tiles';
import { buildCorridor } from '../data/mockGeoJson';
import { buildSuggestedAOI } from '../data/mockAnalysis';
import { DEFAULT_LOCATION } from '../data/places';
import { useDemo } from '../context/DemoContext';
import { LocationStep } from '../components/analysis/LocationStep';
import { AOIStep } from '../components/analysis/AOIStep';
import { EventDateStep } from '../components/analysis/EventDateStep';
import { SummaryStep } from '../components/analysis/SummaryStep';

export interface SetupState {
  location: PlaceLocation | null;
  aoi: AOI | null;
  eventDate: string | null;
}

const STEPS = [
  { id: 0, label: 'Location', sub: 'Where did the flood occur?' },
  { id: 1, label: 'AOI', sub: 'Define the analysis area' },
  { id: 2, label: 'Event Date', sub: 'When did the event occur?' },
  { id: 3, label: 'Summary', sub: 'Review & run' },
];

const markerIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:22px;height:22px">
    <span style="position:absolute;inset:0;border-radius:50%;background:rgba(56,189,248,.35);animation:pulse-ring 1.8s cubic-bezier(.2,.6,.4,1) infinite"></span>
    <span style="position:absolute;inset:5px;border-radius:50%;background:#0E63C2;border:3px solid #fff;box-shadow:0 2px 8px rgba(11,31,58,.45)"></span>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const aoiHandleIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#0E63C2;border:3px solid #fff;box-shadow:0 2px 8px rgba(11,31,58,.45);cursor:grab"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function ViewControl({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

function SetupToolController({
  tool,
  onDrawPoint,
  onMeasurePoint,
}: {
  tool: MapTool;
  onDrawPoint: (ll: LatLng) => void;
  onMeasurePoint: (ll: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (tool === 'draw') onDrawPoint(ll);
      else if (tool === 'measure') onMeasurePoint(ll);
    },
  });
  return null;
}

function CursorControl({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    const c = map.getContainer();
    c.classList.toggle('leaflet-drawing-cursor', active);
    return () => c.classList.remove('leaflet-drawing-cursor');
  }, [map, active]);
  return null;
}

export function SetupFlow() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SetupState>({
    location: null,
    aoi: null,
    eventDate: null,
  });
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 27.851, lng: 85.184 });
  const [mapZoom, setMapZoom] = useState(10);
  const [pinMode, setPinMode] = useState(false);
  const [tool, setTool] = useState<MapTool>('pan');
  const [drawPoints, setDrawPoints] = useState<LatLng[]>([]);
  const [measurePoints, setMeasurePoints] = useState<LatLng[]>([]);
  const [aoiAdjust, setAoiAdjust] = useState(false);

  const update = (patch: Partial<SetupState>) => setState((s) => ({ ...s, ...patch }));

  const handleMapFocus = (loc: PlaceLocation) => {
    setMapCenter({ lat: loc.lat, lng: loc.lng });
    setMapZoom(loc.zoom ?? 12);
  };

  const canProceed =
    (step === 0 && !!state.location) ||
    (step === 1 && !!state.aoi) ||
    (step === 2 && !!state.eventDate) ||
    step === 3;

  const next = () => {
    if (step < 3 && canProceed) setStep(step + 1);
  };
  const back = () => step > 0 && setStep(step - 1);

  const handlePin = (ll: LatLng) => {
    setMapCenter(ll);
    window.dispatchEvent(new CustomEvent('aquascope:pin', { detail: ll }));
  };

  const handleDrawFinish = () => {
    if (drawPoints.length >= 3) {
      const ring = drawPoints.map((p) => [p.lng, p.lat] as [number, number]);
      const area = ringArea(ring);
      const centroid = drawPoints.reduce(
        (acc, p) => ({ lat: acc.lat + p.lat / drawPoints.length, lng: acc.lng + p.lng / drawPoints.length }),
        { lat: 0, lng: 0 },
      );
      update({
        aoi: {
          id: 'aoi-custom',
          name: 'Custom drawn boundary',
          center: centroid,
          ring,
          areaKm2: Math.round(area * 10) / 10,
        },
      });
    }
    setDrawPoints([]);
    setTool('pan');
  };

  const handleAOIMove = (center: LatLng) => {
    setState((s) => {
      if (!s.aoi?.shape) return s;
      const corridor = buildCorridor(center, s.aoi.shape);
      return {
        ...s,
        aoi: {
          ...s.aoi,
          center,
          ring: corridor.ring.map((p) => [p.lng, p.lat] as [number, number]),
        },
      };
    });
  };

  const handleAOIResize = (factor: number) => {
    setState((s) => {
      if (!s.aoi?.shape) return s;
      const shape = {
        ...s.aoi.shape,
        lengthKm: Math.min(30, Math.max(5, s.aoi.shape.lengthKm * factor)),
        widthKm: Math.min(14, Math.max(2.5, s.aoi.shape.widthKm * factor)),
      };
      const corridor = buildCorridor(s.aoi.center, shape);
      return {
        ...s,
        aoi: {
          ...s.aoi,
          shape,
          ring: corridor.ring.map((p) => [p.lng, p.lat] as [number, number]),
          areaKm2: Math.round(ringArea(corridor.ring.map((p) => [p.lng, p.lat])) * 10) / 10,
        },
      };
    });
  };

  const measureKm = measureDistance(measurePoints);

  // ── Demo Mode auto-drive ─────────────────────────────
  // When the guided demo is on one of the setup steps,
  // perform the real UI actions automatically. Handles both
  // the linear flow and direct step jumps (catch-up).
  const { active, started, step: demoStep, runId, finished } = useDemo();
  const demoDone = useRef<string | null>(null);
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    if (!active || !started || finished || !demoStep) return;
    const key = `${runId}:${demoStep.id}`;
    if (demoDone.current === key) return;

    const ensureLocation = () => {
      setState((s) => (s.location ? s : { ...s, location: DEFAULT_LOCATION }));
      handleMapFocus(DEFAULT_LOCATION);
    };
    const ensureAoi = () => {
      setState((s) => {
        if (s.aoi || !s.location) return s;
        return { ...s, aoi: buildSuggestedAOI(s.location) };
      });
    };
    const ensureDate = () => {
      setState((s) => (s.eventDate ? s : { ...s, eventDate: '2026-08-26' }));
    };
    const clickRun = () => {
      (
        document.querySelector(
          '[data-demo="run-analysis"]',
        ) as HTMLButtonElement | null
      )?.click();
    };

    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) =>
      timers.push(setTimeout(fn, ms));

    if (demoStep.id === 'location') {
      if (step === 0 && !state.location) {
        demoDone.current = key;
        later(ensureLocation, 800);
        later(() => nextRef.current(), 2300);
      }
    } else if (demoStep.id === 'aoi') {
      if (step === 1 && !state.aoi) {
        // linear flow
        demoDone.current = key;
        later(ensureAoi, 700);
        later(() => nextRef.current(), 2200);
      } else if (step !== 1) {
        // direct jump — fast-forward to a consistent state
        demoDone.current = key;
        later(ensureLocation, 250);
        later(ensureAoi, 550);
        later(() => setStep(1), 850);
      }
    } else if (demoStep.id === 'event-date') {
      if (step === 2 && !state.eventDate) {
        demoDone.current = key;
        later(ensureDate, 800);
        later(() => nextRef.current(), 2300);
      } else if (step !== 2) {
        demoDone.current = key;
        later(ensureLocation, 250);
        later(ensureAoi, 500);
        later(ensureDate, 750);
        later(() => setStep(2), 1050);
      }
    } else if (demoStep.id === 'analysis') {
      if (step === 3) {
        demoDone.current = key;
        later(clickRun, 900);
      } else {
        demoDone.current = key;
        later(ensureLocation, 250);
        later(ensureAoi, 500);
        later(ensureDate, 750);
        later(() => setStep(3), 1050);
        later(clickRun, 1900);
      }
    }

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, started, finished, demoStep?.id, runId, step, state.location, state.aoi, state.eventDate]);

  return (
    <div className="flex h-full flex-col bg-navy-950">
      {/* Step header */}
      <div className="shrink-0 border-b border-navy-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <ol className="flex items-center gap-2" aria-label="Analysis setup progress">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={classNames(
                    'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors',
                    i === step ? 'bg-brand-500/12' : i < step ? 'hover:bg-navy-800/50' : 'opacity-50',
                  )}
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span
                    className={classNames(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                      i === step
                        ? 'bg-brand-600 text-white'
                        : i < step
                          ? 'bg-green-500 text-white'
                          : 'bg-navy-800/70 text-navy-400',
                    )}
                  >
                    {i < step ? <Check size={13} /> : `0${i + 1}`}
                  </span>
                  <span className={classNames('text-sm font-semibold', i === step ? 'text-brand-300' : 'text-navy-200')}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && <span className="h-px w-8 bg-navy-200" aria-hidden />}
              </li>
            ))}
          </ol>
          <p className="hidden text-sm text-navy-400 md:block">{STEPS[step].sub}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left: step content */}
        <div className="w-full shrink-0 overflow-y-auto border-r border-navy-800 lg:w-[440px] xl:w-[480px]">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="p-6"
          >
            {step === 0 && (
              <LocationStep
                state={state}
                update={update}
                pinMode={pinMode}
                setPinMode={(v) => {
                  setPinMode(v);
                  setTool('pan');
                }}
                onMapFocus={handleMapFocus}
                onProceed={next}
                canProceed={canProceed}
                onBack={back}
              />
            )}
            {step === 1 && (
              <AOIStep
                state={state}
                update={update}
                aoiAdjust={aoiAdjust}
                setAoiAdjust={setAoiAdjust}
                tool={tool}
                setTool={(t) => {
                  setTool(t);
                  setAoiAdjust(false);
                }}
                drawPoints={drawPoints}
                onDrawClear={() => setDrawPoints([])}
                onResize={handleAOIResize}
                onProceed={next}
                onBack={back}
                canProceed={canProceed}
              />
            )}
            {step === 2 && (
              <EventDateStep
                state={state}
                update={update}
                onProceed={next}
                onBack={back}
                canProceed={canProceed}
              />
            )}
            {step === 3 && (
              <SummaryStep state={state} onBack={back} />
            )}
          </motion.div>
        </div>

        {/* Right: map */}
        <div className="relative min-w-0 flex-1 bg-navy-950">
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            preferCanvas
          >
            <TileLayer
              url={BASEMAPS[0].url}
              attribution={BASEMAPS[0].attribution}
            />
            <ZoomControl position="topright" />
            <ViewControl center={mapCenter} zoom={mapZoom} />
            <CursorControl active={tool !== 'pan' || pinMode} />
            <SetupToolController
              tool={pinMode ? 'pan' : tool}
              onDrawPoint={(ll) => setDrawPoints((p) => [...p, ll])}
              onMeasurePoint={(ll) => setMeasurePoints((p) => [...p, ll])}
            />

            {/* Pin mode: clicking the map places the marker */}
            {pinMode && <PinController onPin={handlePin} />}

            {/* Location marker */}
            {step === 0 && state.location && (
              <Marker
                position={[state.location.lat, state.location.lng]}
                icon={markerIcon}
                interactive={false}
              />
            )}
            {pinMode && state.location && (
              <Marker
                position={[state.location.lat, state.location.lng]}
                icon={markerIcon}
                interactive={false}
              />
            )}

            {/* AOI */}
            {step >= 1 && state.aoi && (
              <>
                <Polygon
                  positions={state.aoi.ring.map(([lng, lat]) => [lat, lng])}
                  pathOptions={{
                    color: '#38BDF8',
                    weight: 2,
                    fillColor: '#0E63C2',
                    fillOpacity: aoiAdjust ? 0.12 : 0.08,
                    dashArray: aoiAdjust ? undefined : '8 6',
                  }}
                />
                {aoiAdjust && (
                  <Marker
                    position={[state.aoi.center.lat, state.aoi.center.lng]}
                    icon={aoiHandleIcon}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = e.target.getLatLng();
                        handleAOIMove({ lat: ll.lat, lng: ll.lng });
                        setMapCenter({ lat: ll.lat, lng: ll.lng });
                      },
                    }}
                  />
                )}
              </>
            )}

            {/* Draw preview */}
            {tool === 'draw' && drawPoints.length > 0 && (
              <>
                <Polygon
                  positions={drawPoints.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: '#38BDF8', weight: 2, fillColor: '#0E63C2', fillOpacity: 0.14, dashArray: '6 5' }}
                />
                <Polyline
                  positions={drawPoints.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color: '#38BDF8', weight: 2, dashArray: '6 5' }}
                />
              </>
            )}

            {/* Measure */}
            {tool === 'measure' && measurePoints.length > 0 && (
              <Polyline
                positions={measurePoints.map((p) => [p.lat, p.lng])}
                pathOptions={{ color: '#F59E0B', weight: 2.5, dashArray: '6 5' }}
              />
            )}
          </MapContainer>

          {/* Floating map tools */}
          {step === 1 && (
            <div className="absolute right-3 top-3 z-[500] flex flex-col gap-1.5">
              <SetupToolBtn
                active={tool === 'draw'}
                onClick={() => {
                  setTool(tool === 'draw' ? 'pan' : 'draw');
                  setDrawPoints([]);
                }}
                label={tool === 'draw' ? 'Cancel drawing' : 'Draw custom boundary'}
              >
                <PenTool size={16} />
              </SetupToolBtn>
              <SetupToolBtn
                active={tool === 'measure'}
                onClick={() => {
                  setTool(tool === 'measure' ? 'pan' : 'measure');
                  setMeasurePoints([]);
                }}
                label={tool === 'measure' ? 'Exit measurement' : 'Measure distance'}
              >
                <Ruler size={16} />
              </SetupToolBtn>
            </div>
          )}

          {/* Draw action bar */}
          {tool === 'draw' && (
            <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-navy-800 bg-navy-900 px-3 py-2 shadow-lifted">
              <span className="text-xs font-medium text-navy-300">
                {drawPoints.length < 3 ? `Click map to add points (${drawPoints.length}/3 min)` : `${drawPoints.length} points`}
              </span>
              <button
                className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
                disabled={drawPoints.length < 3}
                onClick={handleDrawFinish}
              >
                <Check size={12} /> Finish
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-md border border-navy-700 px-2.5 py-1 text-[11px] font-semibold text-navy-300 hover:bg-navy-800/50"
                onClick={() => setDrawPoints([])}
              >
                <RotateCcw size={12} /> Clear
              </button>
              <button className="rounded-md p-1 text-navy-400 hover:bg-navy-800/50" onClick={() => { setTool('pan'); setDrawPoints([]); }} aria-label="Cancel drawing">
                <X size={14} />
              </button>
            </div>
          )}
          {tool === 'measure' && (
            <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-navy-800 bg-navy-900 px-3 py-2 shadow-lifted">
              <span className="text-xs font-medium text-navy-300">
                Distance: <span className="font-mono font-semibold text-white">{measureKm.toFixed(2)} km</span>
              </span>
              <button
                className="rounded-md border border-navy-700 px-2 py-1 text-[11px] font-semibold text-navy-300 hover:bg-navy-800/50"
                onClick={() => setMeasurePoints([])}
              >
                Clear
              </button>
            </div>
          )}
          {pinMode && (
            <div className="absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-xl border border-navy-800 bg-navy-900 px-4 py-2 shadow-lifted">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-navy-200">
                <MapPin size={14} className="text-brand-400" />
                Click anywhere on the map to place the location pin
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PinController({ onPin }: { onPin: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function SetupToolBtn({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={classNames(
        'flex h-9 w-9 items-center justify-center rounded-lg border shadow-panel transition-colors',
        active
          ? 'border-brand-400/35 bg-brand-600 text-white'
          : 'border-navy-800 bg-navy-900 text-navy-300 hover:bg-navy-800/50',
      )}
    >
      {children}
    </button>
  );
}

/** Rough polygon area in km² (planar approximation, fine for demo). */
function ringArea(ring: [number, number][]): number {
  if (ring.length < 3) return 0;
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const kx = 111.32 * Math.cos((cy * Math.PI) / 180);
  const ky = 110.94;
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] - cx) * kx * ((ring[i][1] - cy) * ky - (ring[j][1] - cy) * ky);
  }
  return Math.abs(area / 2);
}

function measureDistance(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const R = 6371;
    const dLat = ((points[i].lat - points[i - 1].lat) * Math.PI) / 180;
    const dLng = ((points[i].lng - points[i - 1].lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((points[i - 1].lat * Math.PI) / 180) *
        Math.cos((points[i].lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(a));
  }
  return total;
}
