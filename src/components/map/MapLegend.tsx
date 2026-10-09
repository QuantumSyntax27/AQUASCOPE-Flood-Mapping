import type { MapLayerState } from '../../types';

interface LegendEntry {
  label: string;
  swatch: React.CSSProperties;
}

export function MapLegend({ layers }: { layers: MapLayerState }) {
  const entries: LegendEntry[] = [];

  if (layers.floodMask && layers.floodHigh) {
    entries.push({
      label: 'Flood · higher confidence',
      swatch: { background: 'rgba(14,99,194,0.75)', border: '1px solid #0E63C2' },
    });
  }
  if (layers.floodMask && layers.floodBorderline) {
    entries.push({
      label: 'Flood · borderline',
      swatch: { background: 'rgba(245,158,11,0.7)', border: '1px solid #D97706' },
    });
  }
  if (layers.floodMask && layers.floodUncertain) {
    entries.push({
      label: 'Flood · terrain uncertain',
      swatch: { background: 'rgba(139,92,246,0.55)', border: '1px dashed #7C3AED' },
    });
  }
  if (layers.roads) {
    entries.push({
      label: 'Road · potentially affected',
      swatch: { background: 'transparent', border: '3px solid #DC2626', height: 0, borderRadius: 0 },
    });
    entries.push({
      label: 'Road network',
      swatch: { background: 'transparent', border: '2px solid #7C8DA6', height: 0, borderRadius: 0 },
    });
  }
  if (layers.buildings) {
    entries.push({
      label: 'Building · potentially affected',
      swatch: { background: 'rgba(249,115,22,0.7)', border: '1px solid #EA580C' },
    });
  }
  if (layers.bridges) {
    entries.push({
      label: 'Bridge · potentially affected',
      swatch: { background: '#DC2626', borderRadius: '50%' },
    });
  }
  if (layers.settlements) {
    entries.push({
      label: 'Settlement · connected',
      swatch: { background: '#16A34A', borderRadius: '50%' },
    });
  }
  if (layers.settlements && layers.disconnected) {
    entries.push({
      label: 'Potentially road-disconnected',
      swatch: { background: '#DC2626', borderRadius: '50%' },
    });
  }
  if (layers.hospitals) {
    entries.push({
      label: 'Hospital / health facility',
      swatch: { background: '#0E63C2', borderRadius: '4px' },
    });
  }
  if (layers.towns) {
    entries.push({ label: 'Town', swatch: { background: '#0EA5E9', borderRadius: '50%' } });
  }
  if (layers.routes) {
    entries.push({
      label: 'Alternative route',
      swatch: { background: 'transparent', border: '2.5px solid #16A34A', height: 0, borderRadius: 0 },
    });
    entries.push({
      label: 'Pre-event route',
      swatch: { background: 'transparent', border: '2px dashed #94A3B8', height: 0, borderRadius: 0 },
    });
  }
  if (layers.aoi) {
    entries.push({
      label: 'Area of Interest (AOI)',
      swatch: { background: 'rgba(56,189,248,0.15)', border: '1.5px dashed #38BDF8' },
    });
  }
  if (layers.validation) {
    entries.push({
      label: 'EMSR927 reference extent',
      swatch: { background: 'transparent', border: '2px dashed #16A34A', height: 0, borderRadius: 0 },
    });
  }

  if (entries.length === 0) {
    return <p className="text-[11px] text-navy-400">No visible layers.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {entries.map((e) => (
        <li key={e.label} className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 shrink-0"
            style={{ ...e.swatch, display: 'inline-block' }}
            aria-hidden
          />
          <span className="text-[11px] leading-tight text-navy-200">{e.label}</span>
        </li>
      ))}
    </ul>
  );
}
