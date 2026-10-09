// ─── Core domain types for AQUASCOPE ─────────────────────────────────────────
// These interfaces define the contract between the UI and the (future) backend.
// Mock services implement them today; real API clients will implement them later.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

// ─── Location & AOI ──────────────────────────────────────────────────────────

export interface PlaceLocation {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  zoom: number;
  description?: string;
}

export interface AOI {
  id: string;
  name: string;
  center: LatLng;
  /** GeoJSON polygon ring (lon/lat pairs), closed */
  ring: [number, number][];
  areaKm2: number;
  /** Corridor shape parameters — allows rebuilding the suggested corridor */
  shape?: {
    lengthKm: number;
    widthKm: number;
    headingDeg: number;
    seed: number;
  };
  /** True when the user drew a custom boundary */
  custom?: boolean;
}

// ─── Satellite scenes ────────────────────────────────────────────────────────

export interface SatelliteScene {
  id: string;
  platform: 'Sentinel-1A' | 'Sentinel-1B';
  acquisitionDate: string; // ISO date
  relativeOrbit: number;
  orbitNumber: number;
  passDirection: 'Ascending' | 'Descending';
  swathMode: string;
  status: 'available' | 'unavailable';
  unavailableReason?: string;
  isFallback?: boolean;
}

export interface SceneSelection {
  eventDate: string;
  before: SatelliteScene;
  after: SatelliteScene;
  fallbackUsed: boolean;
  fallbackNote?: string;
  coverageOk: boolean;
  orbitCompatible: boolean;
}

// ─── Analysis pipeline ───────────────────────────────────────────────────────

export type AnalysisPhase =
  | 'acquisition'
  | 'preprocessing'
  | 'flood_mapping'
  | 'infrastructure'
  | 'connectivity'
  | 'validation';

export type StageStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface StageIssue {
  what: string;
  why: string;
  retry: string;
  finalStatus: string;
  limitation?: string;
}

export interface AnalysisStageState {
  id: AnalysisPhase;
  name: string;
  description: string;
  status: StageStatus;
  progress: number; // 0–100
  durationMs?: number;
  logs: string[];
  issue?: StageIssue;
}

export interface AnalysisParams {
  location: PlaceLocation;
  aoi: AOI;
  eventDate: string; // ISO
}

export interface AnalysisMetadata {
  analysisId: string;
  generatedAt: string;
  eventDate: string;
  locationName: string;
  regionName: string;
  aoiName: string;
  aoiAreaKm2: number;
  beforeScene: SatelliteScene;
  afterScene: SatelliteScene;
  modelVersion: string;
  threshold: number;
  processingTimeMs: number;
  demSource: string;
  osmRelease: string;
  demo: true;
}

// ─── Flood result ────────────────────────────────────────────────────────────

export interface FloodResult {
  totalAreaKm2: number;
  highConfidenceKm2: number;
  borderlineKm2: number;
  uncertainKm2: number;
  modelVersion: string;
  threshold: number;
}

// ─── Infrastructure impact ───────────────────────────────────────────────────

export type Confidence = 'higher' | 'borderline' | 'lower';

export interface RoadSegment {
  id: string;
  name: string;
  class: string;
  lengthKm: number;
  affected: boolean;
  confidence: Confidence;
}

export interface RoadImpact {
  totalKm: number;
  affectedKm: number;
  affectedPct: number;
  segments: RoadSegment[];
}

export interface BuildingImpact {
  total: number;
  affected: number;
  affectedPct: number;
  totalFootprintM2: number;
  affectedFootprintM2: number;
}

export interface Bridge {
  id: string;
  name: string;
  type: string;
  road: string;
  affected: boolean;
  confidence: Confidence;
  lat: number;
  lng: number;
}

export interface BridgeImpact {
  total: number;
  affected: number;
  affectedPct: number;
  bridges: Bridge[];
}

export interface InfrastructureImpact {
  roads: RoadImpact;
  buildings: BuildingImpact;
  bridges: BridgeImpact;
}

// ─── Connectivity ────────────────────────────────────────────────────────────

export interface RouteInfo {
  available: boolean;
  distanceKm: number | null;
  note?: string;
}

export interface Settlement {
  id: string;
  name: string;
  type: 'hamlet' | 'village' | 'town';
  population: number;
  lat: number;
  lng: number;
  relevantTown: string;
  relevantHospital: string;
  status: 'connected' | 'disconnected';
  confidence: Confidence;
  affectedSegments: number;
  alternativeRoute: boolean;
  beforeRouteKm: number;
  afterRouteKm: number | null;
  distanceToTownKm: number;
}

export interface ConnectivityResult {
  settlementsAnalyzed: number;
  connected: number;
  disconnected: number;
  alternativeAvailable: number;
  alternativeUnavailable: number;
  affectedSegments: number;
  removedSegments: number;
  settlements: Settlement[];
  towns: Settlement[];
  hospitals: Settlement[];
  /** Alternative route polylines (lon/lat rings) keyed by settlement id */
  alternativeRoutes: Record<string, [number, number][]>;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationMetrics {
  iou: number;
  dice: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ValidationComparisonRow {
  name: string;
  model: number;
  reference: number;
  unit: string;
}

export interface ValidationResult {
  metrics: ValidationMetrics;
  referenceSource: string;
  referenceAreaKm2: number;
  modelAreaKm2: number;
  overlapKm2: number;
  comparison: ValidationComparisonRow[];
  interpretation: string;
  limitations: string[];
}

// ─── Full analysis result ────────────────────────────────────────────────────

export interface AnalysisResult {
  params: AnalysisParams;
  metadata: AnalysisMetadata;
  flood: FloodResult;
  infrastructure: InfrastructureImpact;
  connectivity: ConnectivityResult;
  validation: ValidationResult;
}

// ─── Map / UI types ──────────────────────────────────────────────────────────

export type MapTool = 'pan' | 'draw' | 'measure';

export interface MapLayerState {
  floodMask: boolean;
  floodHigh: boolean;
  floodBorderline: boolean;
  floodUncertain: boolean;
  roads: boolean;
  buildings: boolean;
  bridges: boolean;
  settlements: boolean;
  disconnected: boolean;
  hospitals: boolean;
  towns: boolean;
  routes: boolean;
  aoi: boolean;
  validation: boolean;
}

export interface FeatureInfo {
  kind:
    | 'flood'
    | 'road'
    | 'building'
    | 'bridge'
    | 'settlement'
    | 'hospital'
    | 'town'
    | 'route'
    | 'reference';
  id: string;
  title: string;
  fields: Array<[string, string]>;
}

export interface ReportSection {
  id: string;
  title: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
}

export interface ReportData {
  analysisId: string;
  generatedAt: string;
  location: string;
  eventDate: string;
  sections: ReportSection[];
}
