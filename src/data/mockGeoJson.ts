import type {
  AOI,
  Bridge,
  ConnectivityResult,
  LatLng,
  Settlement,
} from '../types';
import {
  centroidOf,
  haversineKm,
  hashCode,
  lonLatToLatLng,
  mulberry32,
  polygonAreaKm2,
} from '../utils/geo';

// ─── Local geo helpers ──────────────────────────────────────────────────

function kmDeg(center: LatLng) {
  return {
    lat: 1 / 111.32,
    lng: 1 / (111.32 * Math.cos((center.lat * Math.PI) / 180)),
  };
}

/** Move along a heading (radians, 0 = north, clockwise) by distKm. */
function pointAt(p: LatLng, headingRad: number, distKm: number): LatLng {
  const d = kmDeg(p);
  return {
    lat: p.lat + Math.cos(headingRad) * distKm * d.lat,
    lng: p.lng + Math.sin(headingRad) * distKm * d.lng,
  };
}

/** Move perpendicular to a heading by distKm. */
function offsetPoint(p: LatLng, headingRad: number, distKm: number): LatLng {
  const d = kmDeg(p);
  return {
    lat: p.lat - Math.sin(headingRad) * distKm * d.lat,
    lng: p.lng + Math.cos(headingRad) * distKm * d.lng,
  };
}

// ─── Corridor (riverine flood-analysis corridor) ───────────────────────

export interface FloodBlob {
  center: LatLng;
  rxKm: number;
  ryKm: number;
  heading: number;
  category: 'high' | 'borderline' | 'uncertain';
}

export interface CorridorGeometry {
  ring: LatLng[];
  axis: LatLng[];
  blobs: FloodBlob[];
  heading: number;
  lengthKm: number;
  widthKm: number;
}

export interface AOIShape {
  lengthKm: number;
  widthKm: number;
  headingDeg: number;
  seed: number;
}

/** Build a curved, river-like corridor polygon around a center point. */
export function buildCorridor(center: LatLng, shape: AOIShape): CorridorGeometry {
  const rng = mulberry32(shape.seed);
  const heading = (shape.headingDeg * Math.PI) / 180;
  const lengthKm = shape.lengthKm;
  const widthKm = shape.widthKm;

  const stations = 9;
  const axis: LatLng[] = [];
  for (let i = 0; i <= stations; i++) {
    const t = i / stations - 0.5; // -0.5 … 0.5
    const along = t * lengthKm;
    const curve = Math.sin(t * Math.PI * 1.15) * lengthKm * 0.09;
    axis.push(offsetPoint(pointAt(center, heading, along), heading, curve));
  }

  const halfW = widthKm / 2;
  const ring: LatLng[] = [];
  const jitter = () => (rng() - 0.5) * 0.4;
  axis.forEach((p) => ring.push(offsetPoint(p, heading, halfW + jitter())));
  for (let i = axis.length - 1; i >= 0; i--) {
    ring.push(offsetPoint(axis[i], heading, -halfW + jitter()));
  }

  // Flood propagation blobs along the corridor axis.
  const specs: Array<[number, number, number, FloodBlob['category']]> = [
    [-0.3, 0.15, 0.44, 'high'],
    [-0.02, 0.2, 0.52, 'high'],
    [0.22, 0.13, 0.4, 'borderline'],
    [0.38, 0.1, 0.3, 'uncertain'],
    [-0.08, 0.07, 0.28, 'borderline'],
  ];
  const blobs: FloodBlob[] = specs.map(([t, rx, ry, category]) => {
    const along = t * lengthKm;
    const curve = Math.sin(t * Math.PI * 1.15) * lengthKm * 0.09;
    return {
      center: offsetPoint(pointAt(center, heading, along), heading, curve),
      rxKm: rx * lengthKm,
      ryKm: ry * widthKm,
      heading,
      category,
    };
  });

  return { ring, axis, blobs, heading, lengthKm, widthKm };
}

/** Reconstruct corridor geometry from an AOI (shaped or custom-drawn). */
export function corridorForAOI(aoi: AOI): CorridorGeometry {
  if (aoi.shape) {
    return buildCorridor({ lat: aoi.center.lat, lng: aoi.center.lng }, aoi.shape);
  }
  // Custom polygon: fit a corridor to its bounding box.
  const pts = lonLatToLatLng(aoi.ring);
  const c = centroidOf(pts);
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  pts.forEach((p) => {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  });
  const latSpan = (maxLat - minLat) * 111.32;
  const lngSpan = (maxLng - minLng) * 111.32 * Math.cos((c.lat * Math.PI) / 180);
  const vertical = latSpan >= lngSpan;
  return buildCorridor(c, {
    lengthKm: Math.max(latSpan, lngSpan) * 1.05,
    widthKm: Math.min(latSpan, lngSpan) * 0.85 || 3.5,
    headingDeg: vertical ? 0 : 90,
    seed: hashCode(aoi.id),
  });
}

/** Cache so map layers built in different components share one geometry. */
const corridorCache = new Map<string, CorridorGeometry>();
export function cachedCorridor(aoi: AOI): CorridorGeometry {
  const key = `${aoi.id}|${aoi.center.lat.toFixed(4)}|${aoi.center.lng.toFixed(4)}|${aoi.ring.length}|${aoi.shape ? `${aoi.shape.lengthKm}|${aoi.shape.widthKm}` : 'custom'}`;
  let g = corridorCache.get(key);
  if (!g) {
    g = corridorForAOI(aoi);
    corridorCache.set(key, g);
  }
  return g;
}

// ─── Blob math ──────────────────────────────────────────────────────────

function blobLocal(blob: FloodBlob, pt: LatLng): { along: number; across: number } {
  const d = kmDeg(blob.center);
  const dLatKm = (pt.lat - blob.center.lat) / d.lat;
  const dLngKm = (pt.lng - blob.center.lng) / d.lng;
  const sinH = Math.sin(blob.heading);
  const cosH = Math.cos(blob.heading);
  return {
    along: dLngKm * sinH + dLatKm * cosH,
    across: dLngKm * cosH - dLatKm * sinH,
  };
}

export function blobContains(blob: FloodBlob, pt: LatLng, pad = 0): boolean {
  const { along, across } = blobLocal(blob, pt);
  const a = blob.rxKm + pad;
  const b = blob.ryKm + pad;
  return (along / a) ** 2 + (across / b) ** 2 <= 1;
}

export function blobDistanceKm(blob: FloodBlob, pt: LatLng): number {
  const { along, across } = blobLocal(blob, pt);
  const a = along / blob.rxKm;
  const b = across / blob.ryKm;
  return Math.sqrt(a * a + b * b); // 1.0 = on blob edge
}

function blobPolygon(blob: FloodBlob, rng: () => number): LatLng[] {
  const pts: LatLng[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + (rng() - 0.5) * 0.22;
    const p = pointAt(blob.center, blob.heading, Math.cos(a) * blob.rxKm * r);
    pts.push(offsetPoint(p, blob.heading, Math.sin(a) * blob.ryKm * r));
  }
  return pts;
}

export function pointInPolygon(pt: LatLng, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    if (yi > pt.lat !== yj > pt.lat && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function randomPointInRing(ring: LatLng[], rng: () => number): LatLng {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  ring.forEach((p) => {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  });
  for (let tries = 0; tries < 200; tries++) {
    const pt = {
      lat: minLat + rng() * (maxLat - minLat),
      lng: minLng + rng() * (maxLng - minLng),
    };
    if (pointInPolygon(pt, ring)) return pt;
  }
  return centroidOf(ring);
}

// ─── Roads ──────────────────────────────────────────────────────────────

export interface RoadNetwork {
  /** Individual segments (each a 2-point polyline) */
  segments: Array<{ id: string; name: string; roadClass: string; from: LatLng; to: LatLng; affected: boolean; confidence: 'higher' | 'borderline' }>;
  polylines: Array<{ id: string; name: string; roadClass: string; points: LatLng[] }>;
}

export function buildRoadNetwork(corridor: CorridorGeometry, rng: () => number): RoadNetwork {
  const segments: RoadNetwork['segments'] = [];
  const polylines: RoadNetwork['polylines'] = [];

  const highwayPoints = corridor.axis.map((p) => offsetPoint(p, corridor.heading, 0.28));
  polylines.push({ id: 'hwy', name: 'Prithvi Highway (H2)', roadClass: 'National Highway', points: highwayPoints });
  highwayPoints.forEach((p, i) => {
    if (i === 0) return;
    const mid = { lat: (p.lat + highwayPoints[i - 1].lat) / 2, lng: (p.lng + highwayPoints[i - 1].lng) / 2 };
    const inFlood = corridor.blobs.some((b) => blobContains(b, mid, 0.05));
    segments.push({
      id: `seg-hwy-${i}`,
      name: `Prithvi Highway · Segment ${i}`,
      roadClass: 'National Highway',
      from: highwayPoints[i - 1],
      to: p,
      affected: inFlood,
      confidence: inFlood ? 'higher' : 'higher',
    });
  });

  // Feeder roads branching east and west of the highway
  const feederSpecs = [
    { at: 2, dir: 1, name: 'Trishuli–Dhunche Feeder', cls: 'Feeder Road' },
    { at: 5, dir: -1, name: 'Rasuwa Rural Road', cls: 'Rural Road' },
    { at: 6, dir: 1, name: 'Local Track L-14', cls: 'Local Road' },
  ];
  feederSpecs.forEach((spec, fi) => {
    const start = offsetPoint(highwayPoints[spec.at], corridor.heading, 0.28);
    const pts: LatLng[] = [start];
    let heading = corridor.heading + spec.dir * (Math.PI / 2) * 0.82;
    let cur = start;
    for (let s = 0; s < 4; s++) {
      const step = 0.9 + rng() * 0.5;
      cur = pointAt(cur, heading, step);
      pts.push(cur);
      heading += (rng() - 0.5) * 0.5;
    }
    polylines.push({ id: `feeder-${fi}`, name: spec.name, roadClass: spec.cls, points: pts });
    pts.forEach((p, i) => {
      if (i === 0) return;
      const mid = { lat: (p.lat + pts[i - 1].lat) / 2, lng: (p.lng + pts[i - 1].lng) / 2 };
      const inFlood = corridor.blobs.some((b) => blobContains(b, mid, 0.05));
      segments.push({
        id: `seg-f${fi}-${i}`,
        name: `${spec.name} · Segment ${i}`,
        roadClass: spec.cls,
        from: pts[i - 1],
        to: p,
        affected: inFlood,
        confidence: inFlood ? 'higher' : 'borderline',
      });
    });
  });

  return { segments, polylines };
}

// ─── Buildings ──────────────────────────────────────────────────────────

export interface BuildingFootprint {
  id: string;
  polygon: LatLng[];
  affected: boolean;
  footprintM2: number;
}

export function buildBuildings(
  corridor: CorridorGeometry,
  count: number,
  rng: () => number,
): BuildingFootprint[] {
  const out: BuildingFootprint[] = [];
  for (let i = 0; i < count; i++) {
    const pt = randomPointInRing(corridor.ring, rng);
    const wM = 7 + rng() * 9;
    const lM = 8 + rng() * 12;
    const rot = rng() * Math.PI;
    const polygon: LatLng[] = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = pointAt(pt, rot, (sx * lM) / 2000);
      polygon.push(offsetPoint(p, rot, (sy * wM) / 2000));
    }
    const affected = corridor.blobs.some((b) => blobContains(b, pt));
    out.push({
      id: `bld-${i}`,
      polygon,
      affected,
      footprintM2: Math.round(wM * lM * (0.75 + rng() * 0.4)),
    });
  }
  return out;
}

// ─── Bridges ────────────────────────────────────────────────────────────

export function buildBridges(
  network: RoadNetwork,
  corridor: CorridorGeometry,
  total: number,
  rng: () => number,
): Bridge[] {
  const candidates: Array<{ pt: LatLng; roadName: string; roadClass: string }> = [];
  network.polylines.forEach((pl) => {
    const per = Math.max(2, Math.round((total / network.polylines.length) * (pl.id === 'hwy' ? 1.6 : 0.7)));
    for (let i = 0; i < per; i++) {
      const t = (i + 0.5) / per;
      const idx = Math.min(pl.points.length - 2, Math.floor(t * (pl.points.length - 1)));
      const frac = t * (pl.points.length - 1) - idx;
      const a = pl.points[idx];
      const b = pl.points[idx + 1];
      candidates.push({
        pt: { lat: a.lat + (b.lat - a.lat) * frac, lng: a.lng + (b.lng - a.lng) * frac },
        roadName: pl.name,
        roadClass: pl.roadClass,
      });
    }
  });

  // Sort by proximity to flood, mark the closest `affectedCount` as affected.
  const withDist = candidates.map((c, i) => ({
    ...c,
    id: `brg-${i}`,
    minDist: Math.min(...corridor.blobs.map((b) => blobDistanceKm(b, c.pt))),
  }));
  const affectedCount = Math.min(11, withDist.length);
  withDist.sort((a, b) => a.minDist - b.minDist);
  const affectedIds = new Set(withDist.slice(0, affectedCount).map((c) => c.id));

  const types = ['Beam bridge', 'Arch bridge', 'Bailey bridge', 'Culvert bridge', 'Suspension bridge'];
  return withDist
    .map((c) => ({
      id: c.id,
      name: `Bridge over Trishuli tributary · ${c.id.slice(4)}`,
      type: types[Math.floor(rng() * types.length)],
      road: c.roadName,
      affected: affectedIds.has(c.id),
      confidence: (affectedIds.has(c.id) ? 'higher' : 'higher') as 'higher',
      lat: c.pt.lat,
      lng: c.pt.lng,
    }))
    .sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
}

// ─── Settlements ────────────────────────────────────────────────────────

const SETTLEMENT_NAMES = [
  'Besi', 'Chaur', 'Danda', 'Khola', 'Gaun', 'Tole', 'Bazaar', 'Nagar', 'Pani', 'Dhar',
  'Kot', 'Simal', 'Rithi', 'Bhanjyang', 'Chisapani', 'Surya', 'Madi', 'Kali', 'Sunakhani',
  'Budhakhani', 'Malekhu', 'Gajuri', 'Galchhi', 'Thakre', 'Phulkharka', 'Khashikhanda',
  'Jiling', 'Belkot', 'Tarkughat', 'Dhuwakot', 'Khoplang', 'Bhumlung', 'Sahare', 'Aaru',
  'Pida', 'Narayanpur', 'Sitalpati', 'Kharanitar', 'Sangkosh', 'Ghyalchok', 'Panchkhal',
  'Dolalghat', 'Sisneri', 'Charaundi', 'Mulkharka', 'Thulosirubari', 'Anekot', 'Bhumlichok',
];

const SUFFIXES = ['', ' Bazaar', ' Tole', ' Gaun', ' Khola', ' Danda'];

export interface SettlementGenResult {
  settlements: Settlement[];
  towns: Settlement[];
  hospitals: Settlement[];
  alternativeRoutes: Record<string, [number, number][]>;
}

export function buildSettlements(
  corridor: CorridorGeometry,
  network: RoadNetwork,
  total: number,
  disconnectedTarget: number,
  rng: () => number,
): SettlementGenResult {
  const usedNames = new Set<string>();
  const uniqueName = () => {
    for (let i = 0; i < 400; i++) {
      const base = SETTLEMENT_NAMES[Math.floor(rng() * SETTLEMENT_NAMES.length)];
      const suffix = SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
      const name = base + suffix;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
    return `Ward ${usedNames.size + 1}`;
  };

  const raw: Array<Settlement & { axisDist: number; inFlood: boolean }> = [];
  for (let i = 0; i < total; i++) {
    let pt: LatLng;
    let axisDist: number;
    if (rng() < 0.45) {
      // Near the road corridor
      const a = corridor.axis[Math.floor(rng() * corridor.axis.length)];
      pt = offsetPoint(a, corridor.heading, (rng() - 0.5) * 3.2);
      axisDist = Math.abs(
        corridor.axis.reduce(
          (min, p) => Math.min(min, haversineKm(p, pt)),
          Infinity,
        ),
      );
    } else {
      pt = randomPointInRing(corridor.ring, rng);
      axisDist = corridor.axis.reduce((min, p) => Math.min(min, haversineKm(p, pt)), Infinity);
    }
    const inFlood = corridor.blobs.some((b) => blobContains(b, pt));
    const roll = rng();
    const type = roll < 0.04 ? 'town' : roll < 0.16 ? 'village' : 'hamlet';
    const population =
      type === 'town' ? Math.round(8000 + rng() * 36000)
      : type === 'village' ? Math.round(800 + rng() * 5200)
      : Math.round(120 + rng() * 780);

    raw.push({
      id: `stl-${i}`,
      name: uniqueName(),
      type,
      population,
      lat: pt.lat,
      lng: pt.lng,
      relevantTown: '',
      relevantHospital: '',
      status: 'connected',
      confidence: 'higher',
      affectedSegments: 0,
      alternativeRoute: false,
      beforeRouteKm: 0,
      afterRouteKm: null,
      distanceToTownKm: 0,
      axisDist,
      inFlood,
    });
  }

  // Towns & hospitals (towns are part of the settlement list)
  const byAxis = [...raw].sort((a, b) => a.axisDist - b.axisDist);
  const townIdx = new Set<number>();
  for (let i = 0; i < 5; i++) townIdx.add(raw.indexOf(byAxis[Math.floor(rng() * byAxis.length)]));
  let townCount = 0;
  raw.forEach((s) => {
    if (townIdx.has(raw.indexOf(s)) && townCount < 5) {
      s.type = 'town';
      s.population = Math.round(9000 + rng() * 30000);
      townCount++;
    }
  });
  const towns = raw.filter((s) => s.type === 'town');
  const townNames = ['Trishuli Bazar', 'Dhunche', 'Galchhi', 'Malekhu', 'Gajuri'];
  towns.forEach((t, i) => {
    t.name = townNames[i] || t.name;
  });

  const hospitalNames = [
    'Trishuli District Hospital',
    'Dhading District Hospital',
    'Rasuwa Community Hospital',
    'Gajuri Primary Health Centre',
  ];
  const hospitals: Settlement[] = towns.slice(0, 4).map((t, i) => ({
    ...t,
    id: `hsp-${i}`,
    name: hospitalNames[i],
    lat: t.lat + (rng() - 0.5) * 0.02,
    lng: t.lng + (rng() - 0.5) * 0.02,
  }));

  // Disconnected selection: flood overlap first, then distance from road axis
  const scored = [...raw].sort((a, b) => {
    const sa = (a.inFlood ? 100 : 0) - a.axisDist;
    const sb = (b.inFlood ? 100 : 0) - b.axisDist;
    return sb - sa;
  });
  const disconnectedIds = new Set(scored.slice(0, disconnectedTarget).map((s) => s.id));

  // Shuffle for alternative-route assignment (14 available / 13 unavailable)
  const disconnected = scored.filter((s) => disconnectedIds.has(s.id));
  const shuffled = [...disconnected].sort(() => rng() - 0.5);
  shuffled.forEach((s, i) => {
    s.alternativeRoute = i < 14;
  });

  raw.forEach((s) => {
    if (disconnectedIds.has(s.id)) {
      s.status = 'disconnected';
      s.affectedSegments = 1 + Math.floor(rng() * 4);
      s.confidence = rng() < 0.55 ? 'higher' : rng() < 0.85 ? 'borderline' : 'lower';
      s.beforeRouteKm = Math.round((2 + rng() * 12) * 10) / 10;
      s.afterRouteKm = s.alternativeRoute ? Math.round(s.beforeRouteKm * (1.5 + rng() * 0.9) * 10) / 10 : null;
    } else {
      s.status = 'connected';
      s.affectedSegments = rng() < 0.3 ? Math.floor(rng() * 2) : 0;
      s.confidence = 'higher';
      s.beforeRouteKm = Math.round((1 + rng() * 9) * 10) / 10;
      s.afterRouteKm = s.beforeRouteKm;
    }
    const nearestTown = towns.reduce((best, t) =>
      haversineKm(s, t) < haversineKm(s, best) ? t : best, towns[0]);
    s.relevantTown = nearestTown.name;
    s.distanceToTownKm = Math.round(haversineKm(s, nearestTown) * 10) / 10;
    const nearestHosp = hospitals.reduce((best, h) =>
      haversineKm(s, h) < haversineKm(s, best) ? h : best, hospitals[0]);
    s.relevantHospital = nearestHosp.name;
  });

  // Alternative route polylines (curved path to relevant town)
  const alternativeRoutes: Record<string, [number, number][]> = {};
  disconnected.forEach((s) => {
    if (!s.alternativeRoute) return;
    const town = towns.reduce((best, t) =>
      (t.name === s.relevantTown ? 0 : 1) < (best.name === s.relevantTown ? 0 : 1) ? t : best, towns[0]);
    const a = { lat: s.lat, lng: s.lng };
    const b = { lat: town.lat, lng: town.lng };
    const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
    const ctrl = offsetPoint(mid, corridor.heading + Math.PI / 2, 1.6 + rng() * 1.4);
    const pts: LatLng[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const lat = (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * ctrl.lat + t ** 2 * b.lat;
      const lng = (1 - t) ** 2 * a.lng + 2 * (1 - t) * t * ctrl.lng + t ** 2 * b.lng;
      pts.push({ lat, lng });
    }
    alternativeRoutes[s.id] = pts.map((p) => [p.lng, p.lat]);
  });

  return {
    settlements: raw,
    towns,
    hospitals,
    alternativeRoutes,
  };
}

// ─── GeoJSON assembly ───────────────────────────────────────────────────

type FC = GeoJSON.FeatureCollection;

function polygonFeature(id: string, name: string, polygon: LatLng[], props: Record<string, unknown> = {}): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { id, name, ...props },
    geometry: {
      type: 'Polygon',
      coordinates: [[...polygon.map((p) => [p.lng, p.lat]), [polygon[0].lng, polygon[0].lat]]],
    },
  };
}

function lineFeature(id: string, name: string, points: LatLng[], props: Record<string, unknown> = {}): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { id, name, ...props },
    geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) },
  };
}

function pointFeature(id: string, name: string, pt: LatLng, props: Record<string, unknown> = {}): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { id, name, ...props },
    geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
  };
}

export function aoiToGeoJSON(aoi: AOI): FC {
  const pts = lonLatToLatLng(aoi.ring);
  return {
    type: 'FeatureCollection',
    features: [polygonFeature(aoi.id, aoi.name, pts, { kind: 'aoi', areaKm2: aoi.areaKm2 })],
  };
}

export interface FloodLayers {
  all: FC;
  high: FC;
  borderline: FC;
  uncertain: FC;
}

export function buildFloodLayers(aoi: AOI): FloodLayers {
  const corridor = cachedCorridor(aoi);
  const rng = mulberry32(hashCode(aoi.id) + 7);
  const polygons = corridor.blobs.map((b, i) => ({
    id: `flood-${i}`,
    name: `Flood extent ${i + 1} · ${b.category} confidence`,
    polygon: blobPolygon(b, rng),
    category: b.category,
    areaKm2: Math.round(polygonAreaKm2(blobPolygon(b, rng)) * 100) / 100,
  }));
  const mk = (cat: FloodBlob['category']) => ({
    type: 'FeatureCollection' as const,
    features: polygons.filter((p) => p.category === cat).map((p) =>
      polygonFeature(p.id, p.name, p.polygon, { kind: 'flood', category: p.category, areaKm2: p.areaKm2 }),
    ),
  });
  return {
    all: { type: 'FeatureCollection', features: polygons.map((p) => polygonFeature(p.id, p.name, p.polygon, { kind: 'flood', category: p.category, areaKm2: p.areaKm2 })) },
    high: mk('high'),
    borderline: mk('borderline'),
    uncertain: mk('uncertain'),
  };
}

export interface RoadLayers {
  all: FC;
  affected: FC;
}

export function buildRoadLayers(aoi: AOI): RoadLayers {
  const corridor = cachedCorridor(aoi);
  const rng = mulberry32(hashCode(aoi.id) + 11);
  const network = buildRoadNetwork(corridor, rng);
  const feat = (s: RoadNetwork['segments'][number]) =>
    lineFeature(s.id, s.name, [s.from, s.to], {
      kind: 'road',
      roadClass: s.roadClass,
      affected: s.affected,
      confidence: s.confidence,
      lengthKm: Math.round(haversineKm(s.from, s.to) * 10) / 10,
    });
  return {
    all: { type: 'FeatureCollection', features: network.segments.map(feat) },
    affected: { type: 'FeatureCollection', features: network.segments.filter((s) => s.affected).map(feat) },
  };
}

export interface BuildingLayers {
  all: FC;
  affected: FC;
  affectedCount: number;
}

export function buildBuildingLayers(aoi: AOI): BuildingLayers {
  const corridor = cachedCorridor(aoi);
  const rng = mulberry32(hashCode(aoi.id) + 13);
  const buildings = buildBuildings(corridor, 520, rng);
  const feat = (b: BuildingFootprint) =>
    polygonFeature(b.id, `Building footprint ${b.id}`, b.polygon, {
      kind: 'building',
      affected: b.affected,
      footprintM2: b.footprintM2,
    });
  return {
    all: { type: 'FeatureCollection', features: buildings.map(feat) },
    affected: { type: 'FeatureCollection', features: buildings.filter((b) => b.affected).map(feat) },
    affectedCount: buildings.filter((b) => b.affected).length,
  };
}

export function buildBridgeLayers(bridges: Bridge[]): { all: FC; affected: FC } {
  const feat = (b: Bridge) =>
    pointFeature(b.id, b.name, { lat: b.lat, lng: b.lng }, {
      kind: 'bridge',
      type: b.type,
      road: b.road,
      affected: b.affected,
      confidence: b.confidence,
    });
  return {
    all: { type: 'FeatureCollection', features: bridges.map(feat) },
    affected: { type: 'FeatureCollection', features: bridges.filter((b) => b.affected).map(feat) },
  };
}

export function buildSettlementLayers(conn: ConnectivityResult): {
  connected: FC;
  disconnected: FC;
  towns: FC;
  hospitals: FC;
} {
  const pt = (s: Settlement) => ({ lat: s.lat, lng: s.lng });
  return {
    connected: {
      type: 'FeatureCollection',
      features: conn.settlements.filter((s) => s.status === 'connected').map((s) =>
        pointFeature(s.id, s.name, pt(s), {
          kind: 'settlement',
          type: s.type,
          population: s.population,
          status: s.status,
          confidence: s.confidence,
          relevantTown: s.relevantTown,
        }),
      ),
    },
    disconnected: {
      type: 'FeatureCollection',
      features: conn.settlements.filter((s) => s.status === 'disconnected').map((s) =>
        pointFeature(s.id, s.name, pt(s), {
          kind: 'settlement',
          type: s.type,
          population: s.population,
          status: s.status,
          confidence: s.confidence,
          relevantTown: s.relevantTown,
          alternativeRoute: s.alternativeRoute,
          beforeRouteKm: s.beforeRouteKm,
          afterRouteKm: s.afterRouteKm,
        }),
      ),
    },
    towns: {
      type: 'FeatureCollection',
      features: conn.towns.map((t) => pointFeature(t.id, t.name, pt(t), { kind: 'town', population: t.population })),
    },
    hospitals: {
      type: 'FeatureCollection',
      features: conn.hospitals.map((h) => pointFeature(h.id, h.name, pt(h), { kind: 'hospital' })),
    },
  };
}

export function buildRouteLayers(conn: ConnectivityResult, settlements: Settlement[]): {
  alternative: FC;
  featuredBefore: FC;
} {
  const altFeatures = Object.entries(conn.alternativeRoutes).map(([id, ring]) => {
    const s = settlements.find((x) => x.id === id);
    return lineFeature(`alt-${id}`, `Alternative route · ${s?.name ?? id}`, lonLatToLatLng(ring), {
      kind: 'route',
      routeType: 'alternative',
      settlement: s?.name ?? id,
      distanceKm: s?.afterRouteKm ?? null,
    });
  });

  // Featured before-routes: first three disconnected settlements
  const featured = conn.settlements.filter((s) => s.status === 'disconnected').slice(0, 3);
  const beforeFeatures = featured.map((s) => {
    const town = conn.towns.find((t) => t.name === s.relevantTown) ?? conn.towns[0];
    const a = { lat: s.lat, lng: s.lng };
    const b = { lat: town.lat, lng: town.lng };
    const pts: LatLng[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const bow = Math.sin(t * Math.PI) * 0.006;
      pts.push({ lat: a.lat + (b.lat - a.lat) * t + bow, lng: a.lng + (b.lng - a.lng) * t - bow * 0.6 });
    }
    return lineFeature(`before-${s.id}`, `Pre-event route · ${s.name}`, pts, {
      kind: 'route',
      routeType: 'before',
      settlement: s.name,
      distanceKm: s.beforeRouteKm,
    });
  });

  return {
    alternative: { type: 'FeatureCollection', features: altFeatures },
    featuredBefore: { type: 'FeatureCollection', features: beforeFeatures },
  };
}

/** Reference (EMSR927-style) polygons: model flood blobs slightly offset/scaled. */
export function buildReferenceLayers(aoi: AOI): FC {
  const corridor = cachedCorridor(aoi);
  const rng = mulberry32(hashCode(aoi.id) + 23);
  const features = corridor.blobs
    .filter((b) => b.category === 'high' || b.category === 'borderline')
    .slice(0, 3)
    .map((b, i) => {
      const shifted = offsetPoint(pointAt(b.center, b.heading, 0.25), b.heading, 0.18);
      const shiftedBlob = { ...b, center: shifted, rxKm: b.rxKm * 1.09, ryKm: b.ryKm * 1.06 };
      return polygonFeature(`ref-${i}`, `EMSR927 reference extent ${i + 1}`, blobPolygon(shiftedBlob, rng), {
        kind: 'reference',
        source: 'EMSR927',
      });
    });
  return { type: 'FeatureCollection', features };
}
