import type {
  AnalysisParams,
  AnalysisResult,
  AnalysisStageState,
  AnalysisPhase,
  ReportData,
  ReportSection,
  SatelliteScene,
  SceneSelection,
} from '../types';
import {
  buildAnalysisResult,
  buildSuggestedAOI,
  getSatelliteScenes,
} from '../data/mockAnalysis';
import { geocodeAddress, searchLocations } from '../data/places';
import { delay, formatDuration } from '../utils/geo';

export { searchLocations, geocodeAddress, buildSuggestedAOI, getSatelliteScenes };

// ─── Pipeline stage definitions ────────────────────────────────────

interface StageDef {
  id: AnalysisPhase;
  name: string;
  description: string;
  logs: string[];
}

const STAGE_DEFS: StageDef[] = [
  {
    id: 'acquisition',
    name: 'Data Acquisition',
    description: 'Selecting suitable Sentinel-1 scenes and fetching coverage over the AOI.',
    logs: [
      'Querying Sentinel-1 catalogue for relative orbit 143…',
      'Before scene acquired: S1A IW GRD, 12 days prior to event',
      'Checking AOI coverage: 100% of corridor within scene footprint',
    ],
  },
  {
    id: 'preprocessing',
    name: 'Preprocessing',
    description: 'Orbit correction, thermal noise removal, radiometric calibration and terrain correction.',
    logs: [
      'Applying orbit file and removing thermal noise…',
      'Radiometric calibration to sigma-0…',
      'Terrain correction with Copernicus DEM GLO-30…',
      'Co-registration of before / after pair: residual 0.12 px',
    ],
  },
  {
    id: 'flood_mapping',
    name: 'AI Flood Mapping',
    description: 'Change-aware segmentation comparing pre-event and co-event imagery.',
    logs: [
      'Loading change-aware segmentation model (Siamese U-Net style)…',
      'Computing before / after feature difference…',
      'Applying validation-selected threshold (0.52)…',
      'Generating confidence categories: higher / borderline / terrain-uncertain',
    ],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Impact',
    description: 'Overlaying OSM roads, buildings and bridges with the flood mask.',
    logs: [
      'Loading OSM infrastructure for the AOI…',
      'Intersecting flood mask with 82.4 km of roads…',
      'Intersecting flood mask with building footprints…',
      'Flagging 38 bridges for overlap assessment…',
    ],
  },
  {
    id: 'connectivity',
    name: 'Connectivity Analysis',
    description: 'Building the road graph, removing affected segments and re-routing settlements.',
    logs: [
      'Constructing road graph from OSM network…',
      'Removing potentially affected segments from the graph…',
      'Computing reachable settlements per relevant town…',
      'Evaluating alternative routes for disconnected settlements…',
    ],
  },
  {
    id: 'validation',
    name: 'Validation',
    description: 'Comparing the flood mask against EMSR927 reference mapping.',
    logs: [
      'Loading EMSR927 reference polygons (validation only — not model input)…',
      'Computing IoU, Dice, precision and recall…',
      'Flagging high-uncertainty terrain zones…',
      'Compiling situation report inputs…',
    ],
  },
];

function stageToState(def: StageDef): AnalysisStageState {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    status: 'queued',
    progress: 0,
    logs: [],
  };
}

function overallPct(stages: AnalysisStageState[]): number {
  return Math.round(stages.reduce((s, x) => s + x.progress, 0) / stages.length);
}

const ACQUISITION_ISSUE = {
  what: 'Primary co-event scene unavailable',
  why: 'The Sentinel-1A pass on the event date missed its scheduled downlink window, so the scene is not yet available in the catalogue.',
  retry: 'System automatically queried the same relative orbit (143, ascending) and selected the next suitable acquisition (Sentinel-1B, +1 day) with near-identical geometry.',
  finalStatus: 'Recovered — alternative scene selected automatically',
  limitation:
    'The co-event scene is 1 day after the event date. Rapid flood changes on the event day itself may not be captured.',
};

/**
 * Simulates the analysis pipeline. In production this would stream
 * progress from the FastAPI backend (WebSocket / polling).
 */
export async function runAnalysis(
  params: AnalysisParams,
  onProgress: (stages: AnalysisStageState[], overall: number) => void,
): Promise<AnalysisResult> {
  const stages = STAGE_DEFS.map(stageToState);
  const started = Date.now();
  const emit = () =>
    onProgress(
      stages.map((s) => ({ ...s, logs: [...s.logs] })),
      overallPct(stages),
    );

  for (const stage of stages) {
    stage.status = 'processing';
    emit();
    const def = STAGE_DEFS.find((d) => d.id === stage.id)!;
    let issueInjected = false;

    while (stage.progress < 100) {
      const step = 7 + Math.random() * 9;
      stage.progress = Math.min(100, stage.progress + step);

      // Simulate a recoverable failure during data acquisition.
      if (stage.id === 'acquisition' && stage.progress >= 42 && !issueInjected) {
        issueInjected = true;
        stage.status = 'failed';
        stage.issue = { ...ACQUISITION_ISSUE, finalStatus: 'Retrying…' };
        stage.logs.push('ERROR: primary co-event scene unavailable (downlink gap)');
        emit();
        await delay(1200);
        stage.status = 'processing';
        stage.logs.push('RETRY: selecting alternative scene on relative orbit 143 (Sentinel-1B, +1 day)…');
        stage.issue = { ...ACQUISITION_ISSUE };
        emit();
        await delay(700);
        stage.logs.push('Alternative scene acquired: S1B IW GRD, same relative orbit, geometry compatible');
      }

      // Emit a log line as the stage advances.
      const logIdx = Math.min(
        def.logs.length - 1,
        Math.floor((stage.progress / 100) * def.logs.length),
      );
      if (stage.logs.length < logIdx + 1 + (issueInjected ? 3 : 0)) {
        stage.logs.push(def.logs[logIdx]);
      }
      emit();
      await delay(240 + Math.random() * 260);
    }

    stage.status = 'completed';
    stage.progress = 100;
    stage.durationMs = Date.now() - started;
    emit();
    await delay(260);
  }

  return buildAnalysisResult(params, Date.now() - started);
}

// ─── Report generation (browser-side, structured mock data) ───────

export async function generateReportData(
  result: AnalysisResult,
  sectionIds: string[],
): Promise<ReportData> {
  await delay(900);
  const f = result.flood;
  const inf = result.infrastructure;
  const conn = result.connectivity;
  const val = result.validation;
  const md = result.metadata;

  const all: Record<string, ReportSection> = {
    'flood-assessment': {
      id: 'flood-assessment',
      title: '1. Flood Assessment',
      summary: `Sentinel-1 change detection mapped ${f.totalAreaKm2} km² of flooded area within the ${md.aoiName} (${md.aoiAreaKm2} km²). Of this, ${f.highConfidenceKm2} km² is higher-confidence extent, ${f.borderlineKm2} km² borderline, and ${f.uncertainKm2} km² terrain-uncertain. The event date is ${md.eventDate}; the before scene was acquired ${md.beforeScene.acquisitionDate} and the co-event scene ${md.afterScene.acquisitionDate}.`,
      metrics: [
        { label: 'Mapped flood area', value: `${f.totalAreaKm2} km²` },
        { label: 'Higher confidence', value: `${f.highConfidenceKm2} km²` },
        { label: 'Borderline', value: `${f.borderlineKm2} km²` },
        { label: 'Terrain uncertain', value: `${f.uncertainKm2} km²` },
        { label: 'Model / threshold', value: `${f.modelVersion} · ${f.threshold}` },
      ],
    },
    'infrastructure-impact': {
      id: 'infrastructure-impact',
      title: '2. Infrastructure Impact',
      summary: `Potentially affected infrastructure within the AOI: ${inf.roads.affectedKm} of ${inf.roads.totalKm} km of roads (${inf.roads.affectedPct}%), ${inf.buildings.affected} of ${inf.buildings.total} buildings (${inf.buildings.affectedPct}%), and ${inf.bridges.affected} of ${inf.bridges.total} bridges (${inf.bridges.affectedPct}%). Flood overlap indicates potential impact only — it does not prove destruction.`,
      metrics: [
        { label: 'Roads affected', value: `${inf.roads.affectedKm} / ${inf.roads.totalKm} km (${inf.roads.affectedPct}%)` },
        { label: 'Buildings affected', value: `${inf.buildings.affected} / ${inf.buildings.total} (${inf.buildings.affectedPct}%)` },
        { label: 'Building footprint affected', value: `${inf.buildings.affectedFootprintM2.toLocaleString()} / ${inf.buildings.totalFootprintM2.toLocaleString()} m²` },
        { label: 'Bridges affected', value: `${inf.bridges.affected} / ${inf.bridges.total} (${inf.bridges.affectedPct}%)` },
      ],
    },
    'connectivity-assessment': {
      id: 'connectivity-assessment',
      title: '3. Connectivity Assessment',
      summary: `Road-graph analysis evaluated ${conn.settlementsAnalyzed} settlements. ${conn.connected} remain connected; ${conn.disconnected} are potentially road-disconnected (no valid road route remains to the selected relevant destination after removing potentially affected segments). Alternative routes are available for ${conn.alternativeAvailable} settlements and unavailable for ${conn.alternativeUnavailable}.`,
      metrics: [
        { label: 'Settlements analyzed', value: String(conn.settlementsAnalyzed) },
        { label: 'Connected', value: String(conn.connected) },
        { label: 'Potentially road-disconnected', value: String(conn.disconnected) },
        { label: 'Alternative route available', value: String(conn.alternativeAvailable) },
        { label: 'Alternative route unavailable', value: String(conn.alternativeUnavailable) },
      ],
    },
    'disconnected-settlements': {
      id: 'disconnected-settlements',
      title: '4. Potentially Road-Disconnected Settlements',
      summary: conn.settlements
        .filter((s) => s.status === 'disconnected')
        .slice(0, 8)
        .map(
          (s) =>
            `${s.name} (${s.type}, pop. ~${s.population.toLocaleString()}) — relevant town: ${s.relevantTown}; relevant hospital: ${s.relevantHospital}; affected segments: ${s.affectedSegments}; alternative route: ${s.alternativeRoute ? `yes (${s.afterRouteKm} km)` : 'no'}; before route: ${s.beforeRouteKm} km.`,
        )
        .join('\n'),
      metrics: [
        { label: 'Listed settlements', value: String(conn.settlements.filter((s) => s.status === 'disconnected').length) },
        { label: 'Affected road segments', value: String(conn.affectedSegments) },
      ],
    },
    'confidence-uncertainty': {
      id: 'confidence-uncertainty',
      title: '5. Confidence & Uncertainty',
      summary: `Flood extent is reported in three confidence categories. Terrain-uncertain zones (${f.uncertainKm2} km²) coincide with steep slopes where SAR layover and shadow reduce detection reliability. Connectivity results carry per-settlement confidence labels; "potentially road-disconnected" means no valid modelled route remains, not that people are trapped.`,
      metrics: [
        { label: 'Higher confidence extent', value: `${f.highConfidenceKm2} km²` },
        { label: 'Borderline extent', value: `${f.borderlineKm2} km²` },
        { label: 'Terrain-uncertain extent', value: `${f.uncertainKm2} km²` },
      ],
    },
    validation: {
      id: 'validation',
      title: '6. Validation',
      summary: `Comparison against ${val.referenceSource} (used as validation/reference data only — never as model input). Model flooded area: ${val.modelAreaKm2} km²; reference: ${val.referenceAreaKm2} km²; overlap: ${val.overlapKm2} km². Metrics (demo/mock evaluation): IoU ${val.metrics.iou}, Dice ${val.metrics.dice}, precision ${val.metrics.precision}, recall ${val.metrics.recall}, F1 ${val.metrics.f1}. Disagreement does not automatically mean the model is wrong — reference mapping is not absolute ground truth.`,
      metrics: [
        { label: 'IoU', value: String(val.metrics.iou) },
        { label: 'Dice', value: String(val.metrics.dice) },
        { label: 'Precision', value: String(val.metrics.precision) },
        { label: 'Recall', value: String(val.metrics.recall) },
        { label: 'F1', value: String(val.metrics.f1) },
      ],
    },
    limitations: {
      id: 'limitations',
      title: '7. Limitations',
      summary: val.limitations.join('\n'),
      metrics: [{ label: 'Reference source', value: val.referenceSource }],
    },
    metadata: {
      id: 'metadata',
      title: '8. Analysis Metadata',
      summary: `Analysis ${md.analysisId} generated ${new Date(md.generatedAt).toLocaleString()}. Location: ${md.locationName} (${md.regionName}). AOI: ${md.aoiName} (${md.aoiAreaKm2} km²). Event date: ${md.eventDate}. Scenes: before ${md.beforeScene.id} (${md.beforeScene.acquisitionDate}); co-event ${md.afterScene.id} (${md.afterScene.acquisitionDate}, relative orbit ${md.afterScene.relativeOrbit}, ${md.afterScene.passDirection}). DEM: ${md.demSource}. Infrastructure: ${md.osmRelease}. Processing time: ${formatDuration(md.processingTimeMs)}. This report was produced with simulated demo data.`,
      metrics: [
        { label: 'Analysis ID', value: md.analysisId },
        { label: 'Model', value: md.modelVersion },
        { label: 'Threshold', value: String(md.threshold) },
        { label: 'Processing time', value: formatDuration(md.processingTimeMs) },
      ],
    },
  };

  return {
    analysisId: md.analysisId,
    generatedAt: md.generatedAt,
    location: `${md.locationName}, ${md.regionName}`,
    eventDate: md.eventDate,
    sections: sectionIds.map((id) => all[id]).filter(Boolean),
  };
}

export type { SatelliteScene, SceneSelection };
