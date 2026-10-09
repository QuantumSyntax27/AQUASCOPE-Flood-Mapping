import { useCallback, useEffect, useRef, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import type { AnalysisResult, LatLng } from '../../types';
import { buildFloodLayers, aoiToGeoJSON } from '../../data/mockGeoJson';
import { classNames } from '../../utils/geo';

/**
 * Before / After swipe comparison.
 * Two synced Leaflet maps; the top map is clipped by a draggable divider.
 * "Before" = pre-event satellite view with pre-event water extent.
 * "After"  = co-event satellite view with the AI flood mask.
 */

interface ViewState {
  center: LatLng;
  zoom: number;
}

function SyncView({ view, onMove }: { view: ViewState; onMove: (v: ViewState) => void }) {
  const map = useMap();
  const internal = useRef(false);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (internal.current) {
      internal.current = false;
      return;
    }
    map.setView([view.center.lat, view.center.lng], view.zoom, { animate: false });
  }, [map, view]);

  useEffect(() => {
    const handler = () => {
      internal.current = true;
      onMoveRef.current({
        center: { lat: map.getCenter().lat, lng: map.getCenter().lng },
        zoom: map.getZoom(),
      });
    };
    map.on('moveend', handler);
    return () => {
      map.off('moveend', handler);
    };
  }, [map]);

  return null;
}

/** Small mock pre-event permanent water body near the river. */
function preEventWater(center: LatLng): GeoJSON.FeatureCollection {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    pts.push([
      center.lng + Math.cos(a) * 0.016 + Math.sin(a * 2) * 0.004,
      center.lat + Math.sin(a) * 0.008 + Math.cos(a * 3) * 0.002,
    ]);
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Pre-event water extent' },
        geometry: { type: 'Polygon', coordinates: [pts] },
      },
    ],
  };
}

const WATER_STYLE: L.PathOptions = {
  color: '#38BDF8',
  weight: 1.5,
  opacity: 0.9,
  fillColor: '#0E63C2',
  fillOpacity: 0.35,
};

const FLOOD_COMPARE_STYLE: L.PathOptions = {
  color: '#0E63C2',
  weight: 1,
  opacity: 0.95,
  fillColor: '#0E63C2',
  fillOpacity: 0.55,
};

export function BeforeAfterCompare({
  result,
  beforeDate,
  afterDate,
  height = 420,
  className,
}: {
  result: AnalysisResult;
  beforeDate: string;
  afterDate: string;
  height?: number | string;
  className?: string;
}) {
  const aoi = result.params.aoi;
  const initial: ViewState = {
    center: { lat: aoi.center.lat, lng: aoi.center.lng },
    zoom: 12,
  };
  const [view, setView] = useState<ViewState>(initial);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const flood = buildFloodLayers(aoi);
  const water = useRef(preEventWater(aoi.center));
  const aoiGeo = aoiToGeoJSON(aoi);

  const handleMove = useCallback((v: ViewState) => setView(v), []);

  const updateFromPointer = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(96, Math.max(4, pct)));
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => updateFromPointer(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const tileUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const attribution = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';

  return (
    <div
      ref={containerRef}
      className={classNames('relative select-none overflow-hidden rounded-xl border border-navy-800 shadow-panel', className)}
      style={{ height }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.compare-handle')) {
          setDragging(true);
        }
      }}
    >
      {/* Before map (bottom) */}
      <MapContainer
        center={[view.center.lat, view.center.lng]}
        zoom={view.zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        preferCanvas
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <GeoJSON data={water.current} style={() => WATER_STYLE} interactive={false} />
        <GeoJSON data={aoiGeo} interactive={false} style={() => ({
          color: '#38BDF8', weight: 1.5, dashArray: '6 5', fillColor: '#0E63C2', fillOpacity: 0.05,
        })} />
        <SyncView view={view} onMove={handleMove} />
      </MapContainer>

      {/* After map (top, clipped) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <MapContainer
          center={[view.center.lat, view.center.lng]}
          zoom={view.zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
          preferCanvas
        >
          <TileLayer url={tileUrl} attribution={attribution} />
          <GeoJSON data={flood.all} style={() => FLOOD_COMPARE_STYLE} interactive={false} />
          <GeoJSON data={aoiGeo} interactive={false} style={() => ({
            color: '#38BDF8', weight: 1.5, dashArray: '6 5', fillColor: '#0E63C2', fillOpacity: 0.05,
          })} />
          <SyncView view={view} onMove={handleMove} />
        </MapContainer>
      </div>

      {/* Divider */}
      <div
        className="compare-handle absolute inset-y-0 z-[400] cursor-ew-resize"
        style={{ left: `${pos}%` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragging(true);
        }}
        role="slider"
        aria-label="Comparison slider"
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(4, p - 4));
          if (e.key === 'ArrowRight') setPos((p) => Math.min(96, p + 4));
        }}
      >
        <div className="absolute inset-y-0 -left-px w-0.5 bg-navy-900 shadow-[0_0_8px_rgba(0,0,0,.6)]" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-navy-900/80 text-white shadow-map">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
            <path d="M6 1L1 6l5 5M12 1l5 5-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute left-3 top-3 z-[400] rounded-md bg-navy-950/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300 backdrop-blur">
        Before · {beforeDate}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 z-[400] rounded-md bg-navy-950/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300 backdrop-blur">
        After · {afterDate}
      </span>

      {/* Keyboard-accessible range input */}
      <input
        type="range"
        min={4}
        max={96}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        className="aq-range absolute bottom-3 left-1/2 z-[400] w-56 -translate-x-1/2 rounded-full bg-navy-950/60 px-1 backdrop-blur"
        aria-label="Before after comparison position"
      />
    </div>
  );
}
