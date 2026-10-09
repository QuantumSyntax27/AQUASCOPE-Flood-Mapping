import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Polygon,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import * as L from 'leaflet';
import {
  Layers,
  PenTool,
  Ruler,
  X,
  Check,
  RotateCcw,
  Info,
} from 'lucide-react';
import type {
  AnalysisResult,
  FeatureInfo,
  LatLng,
  MapLayerState,
  MapTool,
} from '../../types';
import { classNames, pathLengthKm } from '../../utils/geo';
import {
  aoiToGeoJSON,
  buildBridgeLayers,
  buildBuildingLayers,
  buildFloodLayers,
  buildReferenceLayers,
  buildRoadLayers,
  buildRouteLayers,
  buildSettlementLayers,
  cachedCorridor,
} from '../../data/mockGeoJson';
import { BASEMAPS, DEFAULT_BASEMAP } from './tiles';
import { LayerPanel, LAYER_GROUPS } from './LayerPanel';
import { MapLegend } from './MapLegend';
import { FeaturePanel } from './FeaturePanel';

// ─── Layer styling ───────────────────────────────────────────────

const FLOOD_STYLE: Record<string, { color: string; fill: string }> = {
  high: { color: '#0E63C2', fill: '#0E63C2' },
  borderline: { color: '#D97706', fill: '#F59E0B' },
  uncertain: { color: '#7C3AED', fill: '#8B5CF6' },
};

interface StyleContext {
  opacities: Record<string, number>;
  selectedId: string | null;
}

function floodStyle(ctx: StyleContext) {
  return (feature?: GeoJSON.Feature): L.PathOptions => {
    const cat = (feature?.properties?.category as string) ?? 'high';
    const s = FLOOD_STYLE[cat] ?? FLOOD_STYLE.high;
    const id = String(feature?.properties?.id ?? '');
    const selected = ctx.selectedId === id;
    return {
      color: s.color,
      weight: selected ? 2.5 : 1,
      opacity: ctx.opacities.floodMask ?? 0.9,
      fillColor: s.fill,
      fillOpacity: (ctx.opacities[cat === 'high' ? 'floodHigh' : cat === 'borderline' ? 'floodBorderline' : 'floodUncertain'] ?? 0.55) * (selected ? 1 : 0.85),
      dashArray: cat === 'uncertain' ? '4 4' : undefined,
    };
  };
}

function roadStyle(ctx: StyleContext, affected: boolean) {
  return (feature?: GeoJSON.Feature): L.PathOptions => {
    const id = String(feature?.properties?.id ?? '');
    const selected = ctx.selectedId === id;
    return {
      color: affected ? '#DC2626' : '#7C8DA6',
      weight: selected ? 5 : affected ? 3 : 2,
      opacity: ctx.opacities.roads ?? 0.95,
      lineCap: 'round',
    };
  };
}

function buildingStyle(ctx: StyleContext, affected: boolean) {
  return (feature?: GeoJSON.Feature): L.PathOptions => {
    const id = String(feature?.properties?.id ?? '');
    const selected = ctx.selectedId === id;
    return {
      color: affected ? '#EA580C' : '#94A3B8',
      weight: selected ? 2 : 0.5,
      opacity: ctx.opacities.buildings ?? 0.9,
      fillColor: affected ? '#F97316' : '#64748B',
      fillOpacity: (ctx.opacities.buildings ?? 0.9) * (affected ? 0.75 : 0.35),
    };
  };
}

const AOI_STYLE: L.PathOptions = {
  color: '#38BDF8',
  weight: 2,
  opacity: 0.95,
  fillColor: '#0E63C2',
  fillOpacity: 0.06,
  dashArray: '8 6',
};

const REF_STYLE: L.PathOptions = {
  color: '#16A34A',
  weight: 2,
  opacity: 0.9,
  fill: false,
  dashArray: '2 4',
};

const ROUTE_STYLE = (alt: boolean, selected: boolean): L.PathOptions => ({
  color: alt ? '#16A34A' : '#94A3B8',
  weight: selected ? 4.5 : 3,
  opacity: 0.95,
  dashArray: alt ? undefined : '7 6',
});

// ─── Feature → FeatureInfo ───────────────────────────────────────

function featureToInfo(feature: GeoJSON.Feature): FeatureInfo | null {
  const p = feature.properties ?? {};
  const id = String(p.id ?? '');
  const name = String(p.name ?? '');
  switch (p.kind) {
    case 'flood':
      return {
        kind: 'flood',
        id,
        title: name,
        fields: [
          ['Confidence category', p.category === 'high' ? 'Higher' : p.category === 'borderline' ? 'Borderline' : 'Terrain uncertain'],
          ['Mapped extent', `${p.areaKm2 ?? '—'} km²`],
          ['Source', 'Sentinel-1 change detection (simulated)'],
        ],
      };
    case 'road':
      return {
        kind: 'road',
        id,
        title: name,
        fields: [
          ['Road class', p.roadClass],
          ['Segment length', `${p.lengthKm} km`],
          ['Status', p.affected ? 'Potentially affected' : 'Not affected'],
          ['Confidence', p.confidence === 'higher' ? 'Higher' : 'Borderline'],
        ],
      };
    case 'building':
      return {
        kind: 'building',
        id,
        title: `Building footprint`,
        fields: [
          ['Footprint area', `${p.footprintM2} m²`],
          ['Status', p.affected ? 'Potentially affected' : 'Not affected'],
          ['Source', 'OpenStreetMap (simulated sample)'],
        ],
      };
    case 'bridge':
      return {
        kind: 'bridge',
        id,
        title: name,
        fields: [
          ['Type', p.type],
          ['Carries', p.road],
          ['Status', p.affected ? 'Potentially affected' : 'Not affected'],
        ],
      };
    case 'settlement':
      return {
        kind: 'settlement',
        id,
        title: name,
        fields: [
          ['Type', p.type],
          ['Population', `~${Number(p.population).toLocaleString()}`],
          ['Status', p.status === 'connected' ? 'Connected' : 'Potentially road-disconnected'],
          ['Relevant town', p.relevantTown],
          ['Confidence', p.confidence],
          ...(p.alternativeRoute !== undefined
            ? ([['Alternative route', p.alternativeRoute ? `Yes (${p.afterRouteKm} km)` : 'No']] as [string, string][])
            : []),
        ],
      };
    case 'town':
      return { kind: 'town', id, title: name, fields: [['Type', 'Town'], ['Population', `~${Number(p.population).toLocaleString()}`]] };
    case 'hospital':
      return { kind: 'hospital', id, title: name, fields: [['Type', 'Hospital / health facility']] };
    case 'route':
      return {
        kind: 'route',
        id,
        title: name,
        fields: [
          ['Route type', p.routeType === 'alternative' ? 'Alternative route' : 'Pre-event route'],
          ['Distance', p.distanceKm ? `${p.distanceKm} km` : 'No usable route'],
        ],
      };
    case 'reference':
      return { kind: 'reference', id, title: name, fields: [['Source', 'EMSR927 (validation reference only)']] };
    default:
      return null;
  }
}

function onEachFeatureFactory(
  ctxRef: React.MutableRefObject<StyleContext>,
  onSelect: (f: FeatureInfo | null) => void,
) {
  return (feature: GeoJSON.Feature, layer: L.Layer) => {
    const name = feature.properties?.name;
    if (name) {
      (layer as L.Path | L.CircleMarker).bindTooltip(String(name), {
        sticky: true,
        className: 'aq-tooltip',
        direction: 'top',
        offset: [0, -6],
      });
    }
    layer.on('click', () => {
      onSelect(featureToInfo(feature));
    });
  };
}

function pointToLayerCircle(
  feature: GeoJSON.Feature,
  latlng: L.LatLngExpression,
  color: string,
  radiusBy: (p: GeoJSON.GeoJsonProperties) => number,
): L.CircleMarker {
  return L.circleMarker(latlng, {
    radius: radiusBy(feature.properties ?? {}),
    color: '#ffffff',
    weight: 1.2,
    opacity: 0.9,
    fillColor: color,
    fillOpacity: 0.9,
  });
}

// ─── Tool controller ─────────────────────────────────────────────

function ToolController({
  tool,
  onDrawClick,
  onMeasureClick,
}: {
  tool: MapTool;
  onDrawClick: (ll: LatLng) => void;
  onMeasureClick: (ll: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (tool === 'draw') onDrawClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      else if (tool === 'measure') onMeasureClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function CursorControl({ tool }: { tool: MapTool }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    if (tool !== 'pan') container.classList.add('leaflet-drawing-cursor');
    else container.classList.remove('leaflet-drawing-cursor');
    return () => container.classList.remove('leaflet-drawing-cursor');
  }, [map, tool]);
  return null;
}

// ─── Main map component ──────────────────────────────────────────

export interface FloodMapProps {
  result: AnalysisResult;
  layers: MapLayerState;
  onLayersChange: (layers: MapLayerState) => void;
  opacities: Record<string, number>;
  onOpacityChange: (key: string, value: number) => void;
  center?: LatLng;
  zoom?: number;
  selectedFeature?: FeatureInfo | null;
  onFeatureSelect?: (f: FeatureInfo | null) => void;
  tool?: MapTool;
  onToolChange?: (t: MapTool) => void;
  onDrawComplete?: (ring: [number, number][]) => void;
  showToolbar?: boolean;
  showLayerPanel?: boolean;
  showLegend?: boolean;
  className?: string;
  height?: string;
}

export const DEFAULT_LAYERS: MapLayerState = {
  floodMask: true,
  floodHigh: true,
  floodBorderline: true,
  floodUncertain: true,
  roads: true,
  buildings: false,
  bridges: true,
  settlements: true,
  disconnected: true,
  hospitals: true,
  towns: true,
  routes: true,
  aoi: true,
  validation: false,
};

const handleIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#0E63C2;border:3px solid #fff;box-shadow:0 2px 8px rgba(11,31,58,.4);cursor:grab"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function FloodMap({
  result,
  layers,
  onLayersChange,
  opacities,
  onOpacityChange,
  center,
  zoom,
  selectedFeature,
  onFeatureSelect,
  tool = 'pan',
  onToolChange,
  onDrawComplete,
  showToolbar = true,
  showLayerPanel = true,
  showLegend = true,
  className,
  height = '100%',
}: FloodMapProps) {
  const [internalSelected, setInternalSelected] = useState<FeatureInfo | null>(null);
  const [drawPoints, setDrawPoints] = useState<LatLng[]>([]);
  const [measurePoints, setMeasurePoints] = useState<LatLng[]>([]);
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP);
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);

  const selected = selectedFeature !== undefined ? selectedFeature : internalSelected;
  const handleSelect = onFeatureSelect ?? setInternalSelected;

  const ctxRef = useRef<StyleContext>({ opacities, selectedId: selected?.id ?? null });
  ctxRef.current = { opacities, selectedId: selected?.id ?? null };

  // Derived geometry (memoized per result identity)
  const aoi = result.params.aoi;
  const flood = useMemo(() => buildFloodLayers(aoi), [aoi]);
  const roads = useMemo(() => buildRoadLayers(aoi), [aoi]);
  const buildings = useMemo(() => buildBuildingLayers(aoi), [aoi]);
  const bridgeLayers = useMemo(() => buildBridgeLayers(result.infrastructure.bridges.bridges), [result]);
  const settlementLayers = useMemo(() => buildSettlementLayers(result.connectivity), [result]);
  const routeLayers = useMemo(
    () => buildRouteLayers(result.connectivity, result.connectivity.settlements),
    [result],
  );
  const reference = useMemo(() => buildReferenceLayers(aoi), [aoi]);
  const aoiGeo = useMemo(() => aoiToGeoJSON(aoi), [aoi]);

  const mapCenter = center ?? { lat: aoi.center.lat, lng: aoi.center.lng };
  const mapZoom = zoom ?? 12;

  const basemapDef = BASEMAPS.find((b) => b.id === basemap) ?? BASEMAPS[0];
  const measureKm = pathLengthKm(measurePoints);

  const toggleLayer = (key: keyof MapLayerState) =>
    onLayersChange({ ...layers, [key]: !layers[key] });

  const onEachFlood = useMemo(
    () => onEachFeatureFactory(ctxRef, handleSelect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id],
  );
  const onEachRoad = useMemo(
    () => onEachFeatureFactory(ctxRef, handleSelect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id],
  );
  const onEachBuilding = useMemo(
    () => onEachFeatureFactory(ctxRef, handleSelect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id],
  );
  const onEachBridge = useMemo(
    () => onEachFeatureFactory(ctxRef, handleSelect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id],
  );
  const onEachSettlement = useMemo(
    () => onEachFeatureFactory(ctxRef, handleSelect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id],
  );
  const onEachRoute = useMemo(
    () => onEachFeatureFactory(ctxRef, handleSelect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id],
  );
  const onEachRef = useMemo(
    () => onEachFeatureFactory(ctxRef, handleSelect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id],
  );

  return (
    <div className={classNames('relative overflow-hidden bg-navy-950', className)} style={{ height }}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        preferCanvas
        scrollWheelZoom
        attributionControl
      >
        <TileLayer key={basemapDef.id} url={basemapDef.url} attribution={basemapDef.attribution} />
        <ZoomControl position="topright" />
        <CursorControl tool={tool} />
        <ToolController
          tool={tool}
          onDrawClick={(ll) => setDrawPoints((p) => [...p, ll])}
          onMeasureClick={(ll) => setMeasurePoints((p) => [...p, ll])}
        />

        {/* AOI */}
        {layers.aoi && (
          <GeoJSON key={`aoi-${aoi.id}`} data={aoiGeo} style={() => AOI_STYLE} interactive={false} />
        )}

        {/* Flood layers */}
        {layers.floodMask && layers.floodHigh && (
          <GeoJSON key="flood-high" data={flood.high} style={floodStyle(ctxRef.current)} onEachFeature={onEachFlood} />
        )}
        {layers.floodMask && layers.floodBorderline && (
          <GeoJSON key="flood-borderline" data={flood.borderline} style={floodStyle(ctxRef.current)} onEachFeature={onEachFlood} />
        )}
        {layers.floodMask && layers.floodUncertain && (
          <GeoJSON key="flood-uncertain" data={flood.uncertain} style={floodStyle(ctxRef.current)} onEachFeature={onEachFlood} />
        )}

        {/* Roads */}
        {layers.roads && <GeoJSON key="roads-all" data={roads.all} style={roadStyle(ctxRef.current, false)} onEachFeature={onEachRoad} />}
        {layers.roads && (
          <GeoJSON key="roads-affected" data={roads.affected} style={roadStyle(ctxRef.current, true)} onEachFeature={onEachRoad} />
        )}

        {/* Buildings */}
        {layers.buildings && (
          <GeoJSON key="bld-all" data={buildings.all} style={buildingStyle(ctxRef.current, false)} onEachFeature={onEachBuilding} />
        )}
        {layers.buildings && (
          <GeoJSON key="bld-affected" data={buildings.affected} style={buildingStyle(ctxRef.current, true)} onEachFeature={onEachBuilding} />
        )}

        {/* Bridges */}
        {layers.bridges && (
          <GeoJSON
            key="bridges-all"
            data={bridgeLayers.all}
            pointToLayer={(f, ll) =>
              pointToLayerCircle(f, ll, '#64748B', () => 5)
            }
            onEachFeature={onEachBridge}
          />
        )}
        {layers.bridges && (
          <GeoJSON
            key="bridges-affected"
            data={bridgeLayers.affected}
            pointToLayer={(f, ll) => pointToLayerCircle(f, ll, '#DC2626', () => 7)}
            onEachFeature={onEachBridge}
          />
        )}

        {/* Settlements */}
        {layers.settlements && (
          <GeoJSON
            key="stl-connected"
            data={settlementLayers.connected}
            pointToLayer={(f, ll) =>
              pointToLayerCircle(f, ll, '#16A34A', (p) =>
                Math.max(4, Math.min(11, 3.5 + Math.sqrt(Number(p?.population ?? 500)) / 28)),
              )
            }
            onEachFeature={onEachSettlement}
          />
        )}
        {layers.disconnected && (
          <GeoJSON
            key="stl-disconnected"
            data={settlementLayers.disconnected}
            pointToLayer={(f, ll) =>
              pointToLayerCircle(f, ll, '#DC2626', (p) =>
                Math.max(5, Math.min(12, 4 + Math.sqrt(Number(p?.population ?? 500)) / 28)),
              )
            }
            onEachFeature={onEachSettlement}
          />
        )}

        {/* Towns & hospitals */}
        {layers.towns && (
          <GeoJSON
            key="towns"
            data={settlementLayers.towns}
            pointToLayer={(f, ll) => pointToLayerCircle(f, ll, '#0EA5E9', () => 8)}
            onEachFeature={onEachSettlement}
          />
        )}
        {layers.hospitals && (
          <GeoJSON
            key="hospitals"
            data={settlementLayers.hospitals}
            pointToLayer={(f, ll) =>
              L.marker(ll, {
                icon: L.divIcon({
                  className: '',
                  html: '<div style="width:22px;height:22px;border-radius:6px;background:#0E63C2;border:2px solid #fff;display:flex;align-items:center;justify:center;box-shadow:0 2px 6px rgba(11,31,58,.45)"><span style="color:#fff;font-size:11px;font-weight:800;line-height:1">H</span></div>',
                  iconSize: [22, 22],
                  iconAnchor: [11, 11],
                }),
              })
            }
            onEachFeature={onEachBridge}
          />
        )}

        {/* Routes */}
        {layers.routes && (
          <GeoJSON key="routes-alt" data={routeLayers.alternative} style={() => ROUTE_STYLE(true, false)} onEachFeature={onEachRoute} />
        )}
        {layers.routes && (
          <GeoJSON key="routes-before" data={routeLayers.featuredBefore} style={() => ROUTE_STYLE(false, false)} onEachFeature={onEachRoute} />
        )}

        {/* Validation reference */}
        {layers.validation && (
          <GeoJSON key="reference" data={reference} style={() => REF_STYLE} onEachFeature={onEachRef} />
        )}

        {/* Draw preview */}
        {tool === 'draw' && drawPoints.length > 0 && (
          <>
            <Polygon positions={drawPoints.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#38BDF8', weight: 2, fillColor: '#0E63C2', fillOpacity: 0.15, dashArray: '6 5' }} />
            {drawPoints.map((p, i) => (
              <CircleMarker key={i} center={[p.lat, p.lng]} radius={3.5} pathOptions={{ color: '#fff', weight: 1.5, fillColor: '#0E63C2', fillOpacity: 1 }} interactive={false} />
            ))}
          </>
        )}

        {/* Measure */}
        {tool === 'measure' && measurePoints.length > 0 && (
          <>
            <Polyline positions={measurePoints.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#F59E0B', weight: 2.5, dashArray: '6 5' }} />
            {measurePoints.map((p, i) => (
              <CircleMarker
                key={i}
                center={[p.lat, p.lng]}
                radius={3.5}
                pathOptions={{ color: '#fff', weight: 1.5, fillColor: '#F59E0B', fillOpacity: 1 }}
                interactive={false}
              >
                {i === measurePoints.length - 1 && measurePoints.length > 1 && (
                  <Tooltip permanent direction="top" className="aq-tooltip" offset={[0, -10]}>
                    {measureKm.toFixed(2)} km
                  </Tooltip>
                )}
              </CircleMarker>
            ))}
          </>
        )}
      </MapContainer>

      {/* ── Toolbar ── */}
      {showToolbar && (
        <div className="absolute right-3 top-3 z-[500] flex flex-col gap-1.5">
          {onToolChange && (
            <>
              <ToolButton
                active={tool === 'draw'}
                onClick={() => {
                  const next: MapTool = tool === 'draw' ? 'pan' : 'draw';
                  onToolChange(next);
                  if (next !== 'draw') setDrawPoints([]);
                }}
                label={tool === 'draw' ? 'Cancel drawing' : 'Draw custom boundary'}
              >
                <PenTool size={16} />
              </ToolButton>
              <ToolButton
                active={tool === 'measure'}
                onClick={() => {
                  const next: MapTool = tool === 'measure' ? 'pan' : 'measure';
                  onToolChange(next);
                  if (next !== 'measure') setMeasurePoints([]);
                }}
                label={tool === 'measure' ? 'Exit measurement' : 'Measure distance'}
              >
                <Ruler size={16} />
              </ToolButton>
            </>
          )}
          {showLayerPanel && (
            <ToolButton
              active={layerPanelOpen}
              onClick={() => setLayerPanelOpen((v) => !v)}
              label="Toggle layer panel"
            >
              <Layers size={16} />
            </ToolButton>
          )}
        </div>
      )}

      {/* ── Draw/measure action bar ── */}
      {tool === 'draw' && (
        <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-navy-800 bg-navy-900 px-3 py-2 shadow-lifted">
          <span className="text-xs font-medium text-navy-300">
            {drawPoints.length < 3
              ? `Click the map to add boundary points (${drawPoints.length}/3 min)`
              : `${drawPoints.length} points`}
          </span>
          <button
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            disabled={drawPoints.length < 3}
            onClick={() => {
              onDrawComplete?.(drawPoints.map((p) => [p.lng, p.lat]));
              setDrawPoints([]);
              onToolChange?.('pan');
            }}
          >
            <Check size={12} /> Finish boundary
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-md border border-navy-700 px-2.5 py-1 text-[11px] font-semibold text-navy-300 hover:bg-navy-800/50"
            onClick={() => setDrawPoints([])}
          >
            <RotateCcw size={12} /> Clear
          </button>
          <button
            className="rounded-md p-1 text-navy-400 hover:bg-navy-800/50"
            onClick={() => {
              setDrawPoints([]);
              onToolChange?.('pan');
            }}
            aria-label="Cancel drawing"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {tool === 'measure' && (
        <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-navy-800 bg-navy-900 px-3 py-2 shadow-lifted">
          <span className="text-xs font-medium text-navy-300">
            Measure: <span className="font-mono font-semibold text-white">{measureKm.toFixed(2)} km</span>
          </span>
          <button
            className="rounded-md border border-navy-700 px-2 py-1 text-[11px] font-semibold text-navy-300 hover:bg-navy-800/50"
            onClick={() => setMeasurePoints([])}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Layer panel ── */}
      {showLayerPanel && layerPanelOpen && (
        <div className="absolute left-3 top-3 z-[500] w-[248px] max-h-[calc(100%-16px)] overflow-y-auto rounded-xl border border-navy-800 bg-navy-900/95 shadow-lifted backdrop-blur">
          <LayerPanel
            layers={layers}
            onToggle={toggleLayer}
            opacities={opacities}
            onOpacityChange={onOpacityChange}
            basemap={basemap}
            onBasemapChange={setBasemap}
          />
        </div>
      )}

      {/* ── Legend ── */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-[500] max-w-[280px]">
          <button
            className="flex w-full items-center gap-1.5 rounded-lg border border-navy-800 bg-navy-900/95 px-2.5 py-1.5 text-[11px] font-semibold text-navy-200 shadow-panel backdrop-blur"
            onClick={() => setLegendOpen((v) => !v)}
            aria-expanded={legendOpen}
          >
            <Info size={12} className="text-brand-500" />
            Legend
            <span className="ml-auto text-navy-300">{legendOpen ? '▾' : '▸'}</span>
          </button>
          {legendOpen && (
            <div className="mt-1.5 rounded-xl border border-navy-800 bg-navy-900/95 p-3 shadow-lifted backdrop-blur">
              <MapLegend layers={layers} />
            </div>
          )}
        </div>
      )}

      {/* ── Feature detail panel ── */}
      {selected && (
        <div className="absolute bottom-3 right-3 z-[500] w-[300px]">
          <FeaturePanel feature={selected} onClose={() => handleSelect(null)} />
        </div>
      )}
    </div>
  );
}

function ToolButton({
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

// Re-export so pages can compute corridor without extra imports
export { cachedCorridor, LAYER_GROUPS };
