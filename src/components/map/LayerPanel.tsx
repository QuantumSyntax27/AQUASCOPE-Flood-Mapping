import type { MapLayerState } from '../../types';
import { classNames } from '../../utils/geo';
import { BASEMAPS } from './tiles';

interface LayerRow {
  key: keyof MapLayerState;
  label: string;
  color?: string;
  requires?: keyof MapLayerState;
}

export const LAYER_GROUPS: Array<{
  title: string;
  opacityKey?: string;
  rows: LayerRow[];
}> = [
  {
    title: 'Base Map',
    rows: [],
  },
  {
    title: 'Flood Analysis',
    rows: [
      { key: 'floodMask', label: 'Flood Mask', color: '#0E63C2' },
      { key: 'floodHigh', label: 'Higher Confidence', color: '#0E63C2', requires: 'floodMask' },
      { key: 'floodBorderline', label: 'Borderline', color: '#F59E0B', requires: 'floodMask' },
      { key: 'floodUncertain', label: 'Terrain Uncertain', color: '#8B5CF6', requires: 'floodMask' },
    ],
  },
  {
    title: 'Infrastructure',
    rows: [
      { key: 'roads', label: 'Roads', color: '#7C8DA6' },
      { key: 'buildings', label: 'Buildings', color: '#F97316' },
      { key: 'bridges', label: 'Bridges', color: '#DC2626' },
    ],
  },
  {
    title: 'Connectivity',
    rows: [
      { key: 'settlements', label: 'Settlements', color: '#16A34A' },
      { key: 'disconnected', label: 'Potentially Road-Disconnected', color: '#DC2626', requires: 'settlements' },
      { key: 'hospitals', label: 'Hospitals', color: '#0E63C2' },
      { key: 'towns', label: 'Towns', color: '#0EA5E9' },
      { key: 'routes', label: 'Routes', color: '#16A34A' },
    ],
  },
  {
    title: 'Analysis Areas',
    rows: [
      { key: 'aoi', label: 'Area of Interest', color: '#38BDF8' },
      { key: 'validation', label: 'Validation Reference', color: '#16A34A' },
    ],
  },
];

const GROUP_OPACITY: Record<string, string[]> = {
  'Flood Analysis': ['floodHigh', 'floodBorderline', 'floodUncertain'],
  Infrastructure: ['roads', 'buildings'],
};

export function LayerPanel({
  layers,
  onToggle,
  opacities,
  onOpacityChange,
  basemap,
  onBasemapChange,
}: {
  layers: MapLayerState;
  onToggle: (key: keyof MapLayerState) => void;
  opacities: Record<string, number>;
  onOpacityChange: (key: string, value: number) => void;
  basemap: string;
  onBasemapChange: (id: string) => void;
}) {
  return (
    <div className="p-3">
      <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">
        Map Layers
      </p>

      {/* Base map */}
      <div className="mb-3">
        <p className="px-1 pb-1.5 text-[11px] font-semibold text-navy-200">Base Map</p>
        <div className="space-y-1">
          {BASEMAPS.map((b) => (
            <label
              key={b.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-navy-300 hover:bg-navy-800/50"
            >
              <input
                type="radio"
                name="basemap"
                className="h-3.5 w-3.5 accent-brand-600"
                checked={basemap === b.id}
                onChange={() => onBasemapChange(b.id)}
              />
              {b.name}
            </label>
          ))}
        </div>
      </div>

      {LAYER_GROUPS.filter((g) => g.rows.length > 0).map((group) => (
        <div key={group.title} className="mb-3">
          <p className="px-1 pb-1.5 text-[11px] font-semibold text-navy-200">{group.title}</p>
          <div className="space-y-0.5">
            {group.rows.map((row) => {
              const disabled = row.requires ? !layers[row.requires] : false;
              const checked = layers[row.key];
              return (
                <label
                  key={row.key}
                  className={classNames(
                    'flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors',
                    disabled ? 'opacity-40' : 'text-navy-300 hover:bg-navy-800/50',
                    row.requires && 'pl-5',
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-brand-600"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(row.key)}
                  />
                  {row.color && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px] border border-white/60 shadow-sm"
                      style={{ background: row.color }}
                    />
                  )}
                  <span className="leading-tight">{row.label}</span>
                </label>
              );
            })}
          </div>
          {GROUP_OPACITY[group.title] && (
            <div className="mt-1.5 space-y-1.5 border-t border-navy-800/60 px-1.5 pt-2">
              {GROUP_OPACITY[group.title].map((key) => (
                <OpacitySlider
                  key={key}
                  label={key === 'floodHigh' ? 'Higher confidence' : key === 'floodBorderline' ? 'Borderline' : key === 'floodUncertain' ? 'Terrain uncertain' : key === 'roads' ? 'Roads' : 'Buildings'}
                  value={opacities[key] ?? 0.7}
                  onChange={(v) => onOpacityChange(key, v)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      <p className="border-t border-navy-800/60 px-1.5 pt-2 text-[10px] leading-snug text-navy-400">
        Simulated analysis geometry for demonstration.
      </p>
    </div>
  );
}

function OpacitySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-medium text-navy-400">
        <span>{label}</span>
        <span className="font-mono">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0.1}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="aq-range mt-0.5 w-full"
        aria-label={`${label} opacity`}
      />
    </div>
  );
}
