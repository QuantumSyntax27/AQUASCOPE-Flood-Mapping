import type {
  AnalysisMetadata,
  AnalysisParams,
  AnalysisResult,
  AOI,
  ConnectivityResult,
  PlaceLocation,
  SatelliteScene,
  SceneSelection,
  Settlement,
} from '../types';
import {
  buildCorridor,
  buildBridges,
  buildRoadNetwork,
  buildSettlements,
  cachedCorridor,
} from './mockGeoJson';
import {
  addDaysISO,
  delay,
  hashCode,
  haversineKm,
  mulberry32,
  polygonAreaKm2,
} from '../utils/geo';

// ─── AOI construction ───────────────────────────────────────────────

const SUGGESTED_SHAPE = { lengthKm: 12, widthKm: 5, headingDeg: -32 };

export function buildSuggestedAOI(location: PlaceLocation): AOI {
  const shape = { ...SUGGESTED_SHAPE, seed: hashCode(location.id) };
  const corridor = buildCorridor({ lat: location.lat, lng: location.lng }, shape);
  return {
    id: `aoi-${location.id}`,
    name: `${location.name} analysis corridor`,
    center: { lat: location.lat, lng: location.lng },
    ring: corridor.ring.map((p) => [p.lng, p.lat]),
    areaKm2: Math.round(polygonAreaKm2(corridor.ring) * 10) / 10,
    shape,
  };
}

/** Rebuild the suggested corridor after moving / resizing. */
export function rebuildSuggestedAOI(aoi: AOI): AOI {
  if (!aoi.shape) return aoi;
  const corridor = buildCorridor(aoi.center, aoi.shape);
  return {
    ...aoi,
    ring: corridor.ring.map((p) => [p.lng, p.lat]),
    areaKm2: Math.round(polygonAreaKm2(corridor.ring) * 10) / 10,
  };
}

export function resizeAOI(aoi: AOI, factor: number): AOI {
  if (!aoi.shape) return aoi;
  const next = {
    ...aoi,
    shape: {
      ...aoi.shape,
      lengthKm: Math.min(30, Math.max(5, aoi.shape.lengthKm * factor)),
      widthKm: Math.min(14, Math.max(2.5, aoi.shape.widthKm * factor)),
    },
  };
  return rebuildSuggestedAOI(next);
}

// ─── Satellite scene selection (automatic) ──────────────────────────

export function getSatelliteScenes(eventDate: string, preEventDays: number = 12): SceneSelection {
  const beforeDate = addDaysISO(eventDate, -preEventDays);
  const fallbackDate = addDaysISO(eventDate, 1);
  const before: SatelliteScene = {
    id: `S1A_IW_GRDH_1SDV_${beforeDate.replaceAll('-', '')}T061231_${beforeDate.replaceAll('-', '')}T061256_058412_06F1A2_9D3C`,
    platform: 'Sentinel-1A',
    acquisitionDate: beforeDate,
    relativeOrbit: 143,
    orbitNumber: 58412,
    passDirection: 'Ascending',
    swathMode: 'Interferometric Wide (IW)',
    status: 'available',
  };
  const primary: SatelliteScene = {
    id: `S1A_IW_GRDH_1SDV_${eventDate.replaceAll('-', '')}T061228_${eventDate.replaceAll('-', '')}T061253_058620_07C8E1_2B1A`,
    platform: 'Sentinel-1A',
    acquisitionDate: eventDate,
    relativeOrbit: 143,
    orbitNumber: 58620,
    passDirection: 'Ascending',
    swathMode: 'Interferometric Wide (IW)',
    status: 'unavailable',
    unavailableReason:
      'Downlink gap — scheduled station pass missed during the event window; scene pending reprocessing.',
  };
  const fallback: SatelliteScene = {
    id: `S1B_IW_GRDH_1SDV_${fallbackDate.replaceAll('-', '')}T061234_${fallbackDate.replaceAll('-', '')}T061259_058789_07A1B3_4E8F`,
    platform: 'Sentinel-1B',
    acquisitionDate: fallbackDate,
    relativeOrbit: 143,
    orbitNumber: 58789,
    passDirection: 'Ascending',
    swathMode: 'Interferometric Wide (IW)',
    status: 'available',
    isFallback: true,
  };
  return {
    eventDate,
    before,
    after: fallback,
    fallbackUsed: true,
    fallbackNote:
      'Primary co-event scene (event date) was unavailable. System automatically selected the next suitable scene from the same relative orbit (143, ascending) to preserve geometry consistency for change detection.',
    coverageOk: true,
    orbitCompatible: true,
  };
}

// ─── Full mock analysis result ──────────────────────────────────────

export function buildAnalysisResult(params: AnalysisParams, processingTimeMs: number): AnalysisResult {
  const rng = mulberry32(hashCode(params.aoi.id) + hashCode(params.eventDate));
  const corridor = cachedCorridor(params.aoi);
  const network = buildRoadNetwork(corridor, mulberry32(hashCode(params.aoi.id) + 11));
  const bridges = buildBridges(network, corridor, 38, mulberry32(hashCode(params.aoi.id) + 17));
  const gen = buildSettlements(corridor, network, 124, 27, mulberry32(hashCode(params.aoi.id) + 19));

  // ── Roads: normalize segment lengths so totals match the demo scenario
  const rawLengths = network.segments.map((s) => haversineKm(s.from, s.to));
  const totalRaw = rawLengths.reduce((a, b) => a + b, 0);
  const TOTAL_KM = 82.4;
  const AFFECTED_KM = 17.6;
  const scale = TOTAL_KM / totalRaw;
  const targetAffectedRaw = AFFECTED_KM / scale;

  // Start from geometry-flagged affected segments, then adjust to reach the target.
  const affectedSet = new Set(network.segments.filter((s) => s.affected).map((s) => s.id));
  const affectedRawSum = () =>
    network.segments.reduce((sum, s, i) => (affectedSet.has(s.id) ? sum + rawLengths[i] : sum), 0);
  const byLengthDesc = network.segments
    .map((s, i) => ({ id: s.id, len: rawLengths[i] }))
    .sort((a, b) => b.len - a.len);
  let guard = 0;
  while (affectedRawSum() < targetAffectedRaw && guard++ < 40) {
    const candidate = byLengthDesc.find((s) => !affectedSet.has(s.id));
    if (!candidate) break;
    affectedSet.add(candidate.id);
  }
  guard = 0;
  while (affectedRawSum() > targetAffectedRaw * 1.12 && guard++ < 40) {
    const removable = byLengthDesc
      .filter((s) => affectedSet.has(s.id))
      .sort((a, b) => a.len - b.len)[0];
    if (!removable || affectedSet.size <= 3) break;
    affectedSet.delete(removable.id);
  }

  const segments = network.segments.map((s, i) => ({
    id: s.id,
    name: s.name,
    class: s.roadClass,
    lengthKm: Math.round(rawLengths[i] * scale * 10) / 10,
    affected: affectedSet.has(s.id),
    confidence: affectedSet.has(s.id) ? ('higher' as const) : ('higher' as const),
  }));
  const affectedSegmentsList = segments.filter((s) => s.affected);

  // ── Buildings
  const BUILDING_TOTAL = 4250;
  const BUILDING_AFFECTED = 680;
  const FOOTPRINT_TOTAL = 510000;
  const FOOTPRINT_AFFECTED = 82000;

  // ── Connectivity
  const settlements = gen.settlements;
  const disconnected = settlements.filter((s) => s.status === 'disconnected');
  const connectivity: ConnectivityResult = {
    settlementsAnalyzed: settlements.length,
    connected: settlements.filter((s) => s.status === 'connected').length,
    disconnected: disconnected.length,
    alternativeAvailable: disconnected.filter((s) => s.alternativeRoute).length,
    alternativeUnavailable: disconnected.filter((s) => !s.alternativeRoute).length,
    affectedSegments: disconnected.reduce((sum, s) => sum + s.affectedSegments, 0),
    removedSegments: affectedSegmentsList.length,
    settlements,
    towns: gen.towns,
    hospitals: gen.hospitals,
    alternativeRoutes: gen.alternativeRoutes,
  };

  const scenes = getSatelliteScenes(params.eventDate);

  return {
    params,
    metadata: {
      analysisId: `AQS-${params.eventDate.replaceAll('-', '')}-${Math.floor(rng() * 9000 + 1000)}`,
      generatedAt: new Date().toISOString(),
      eventDate: params.eventDate,
      locationName: params.location.name,
      regionName: params.location.region,
      aoiName: params.aoi.name,
      aoiAreaKm2: params.aoi.areaKm2,
      beforeScene: scenes.before,
      afterScene: scenes.after,
      modelVersion: 'aquascope-floodnet v0.9.2',
      threshold: 0.52,
      processingTimeMs,
      demSource: 'Copernicus DEM GLO-30',
      osmRelease: 'OSM planet 2026-08-30',
      demo: true,
    },
    flood: {
      totalAreaKm2: 24.6,
      highConfidenceKm2: 14.2,
      borderlineKm2: 7.1,
      uncertainKm2: 3.3,
      modelVersion: 'aquascope-floodnet v0.9.2',
      threshold: 0.52,
    },
    infrastructure: {
      roads: {
        totalKm: TOTAL_KM,
        affectedKm: AFFECTED_KM,
        affectedPct: Math.round((AFFECTED_KM / TOTAL_KM) * 1000) / 10,
        segments,
      },
      buildings: {
        total: BUILDING_TOTAL,
        affected: BUILDING_AFFECTED,
        affectedPct: Math.round((BUILDING_AFFECTED / BUILDING_TOTAL) * 1000) / 10,
        totalFootprintM2: FOOTPRINT_TOTAL,
        affectedFootprintM2: FOOTPRINT_AFFECTED,
      },
      bridges: {
        total: bridges.length,
        affected: bridges.filter((b) => b.affected).length,
        affectedPct:
          Math.round((bridges.filter((b) => b.affected).length / bridges.length) * 1000) / 10,
        bridges,
      },
    },
    connectivity,
    validation: {
      metrics: { iou: 0.78, dice: 0.876, precision: 0.84, recall: 0.91, f1: 0.874 },
      referenceSource: 'EMSR927 (Copernicus Emergency Management Service)',
      referenceAreaKm2: 26.9,
      modelAreaKm2: 24.6,
      overlapKm2: 19.8,
      comparison: [
        { name: 'Flooded area', model: 24.6, reference: 26.9, unit: 'km²' },
        { name: 'High-confidence extent', model: 14.2, reference: 15.8, unit: 'km²' },
        { name: 'Affected road length', model: 17.6, reference: 19.2, unit: 'km' },
        { name: 'Potentially affected settlements', model: 27, reference: 31, unit: 'count' },
      ],
      interpretation:
        'The model maps a slightly smaller flood extent than the EMSR927 reference. Differences concentrate along corridor edges where SAR layover and shadow reduce confidence. Disagreement does not automatically mean the model is wrong — reference mapping is not absolute ground truth and is produced under its own assumptions and timing constraints.',
      limitations: [
        'Terrain uncertainty: steep slopes in the corridor cause SAR layover and shadow, reducing detection reliability.',
        'Optical imagery is unaffected by clouds in this scenario, but cloud cover would degrade any optical cross-check.',
        'Reference data (EMSR927) has its own production timeline and mapping conventions; it is a validation reference, not ground truth.',
        'Urban areas with dense building cover may under-report flood extent due to double-bounce scattering.',
        'Results are preliminary and should be verified with local field information before operational use.',
      ],
    },
  };
}

export async function buildResultWithDelay(
  params: AnalysisParams,
  processingTimeMs: number,
): Promise<AnalysisResult> {
  await delay(350);
  return buildAnalysisResult(params, processingTimeMs);
}
