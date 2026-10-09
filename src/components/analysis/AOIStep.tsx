import { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  Expand,
  MousePointer2,
  PenTool,
  RotateCcw,
} from 'lucide-react';
import type { AOI } from '../../types';
import { Button, Chip } from '../ui';
import { buildSuggestedAOI } from '../../data/mockAnalysis';
import { formatCoord } from '../../utils/geo';
import type { SetupState } from '../../pages/SetupFlow';

interface AOIStepProps {
  state: SetupState;
  update: (patch: Partial<SetupState>) => void;
  aoiAdjust: boolean;
  setAoiAdjust: (v: boolean) => void;
  tool: 'pan' | 'draw' | 'measure';
  setTool: (t: 'pan' | 'draw' | 'measure') => void;
  drawPoints: unknown[];
  onDrawClear: () => void;
  onResize: (factor: number) => void;
  onProceed: () => void;
  onBack: () => void;
  canProceed: boolean;
}

export function AOIStep({
  state,
  update,
  aoiAdjust,
  setAoiAdjust,
  setTool,
  drawPoints,
  onDrawClear,
  onResize,
  onProceed,
  onBack,
  canProceed,
}: AOIStepProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSuggested, setIsSuggested] = useState(true);

  // Build the suggested corridor when entering the step.
  useEffect(() => {
    if (!state.aoi && state.location) {
      const aoi = buildSuggestedAOI(state.location);
      update({ aoi });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aoi = state.aoi;
  const drawing = drawPoints.length > 0;

  const resetToSuggested = () => {
    if (!state.location) return;
    update({ aoi: buildSuggestedAOI(state.location) });
    setIsSuggested(true);
    setConfirmed(false);
    setAoiAdjust(false);
    setTool('pan');
    onDrawClear();
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-white">Area of Interest</h2>
      <p className="mt-1 text-sm text-navy-400">
        We suggest a flood-analysis corridor around {state.location?.name}{' '}
        that follows the river valley, where flood propagation is most likely.
        You can accept, adjust, or draw your own boundary.
      </p>

      {/* Suggested AOI card */}
      {aoi && (
        <div data-demo="aoi-card" className="mt-5 rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-400">
                {isSuggested ? 'Suggested analysis corridor' : 'Current boundary'}
              </p>
              <p className="mt-1 text-sm font-bold text-white">{aoi.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip>Area · {aoi.areaKm2.toFixed(1)} km²</Chip>
                <Chip>Center · {formatCoord(aoi.center.lat, aoi.center.lng)}</Chip>
                {aoi.shape && <Chip>Corridor · {aoi.shape.lengthKm.toFixed(1)} × {aoi.shape.widthKm.toFixed(1)} km</Chip>}
                {aoi.custom !== undefined && <Chip>Custom polygon</Chip>}
              </div>
            </div>
            {confirmed && <Check size={18} className="shrink-0 text-green-500" />}
          </div>
          {isSuggested && (
            <p className="mt-3 rounded-lg bg-navy-800/50 px-3 py-2 text-[11px] leading-relaxed text-navy-300">
              The corridor is oriented along the river course and sized for
              Sentinel-1 swath coverage — no manual coordinate entry needed.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setConfirmed(true);
              setAoiAdjust(false);
              setTool('pan');
            }}
            icon={<Check size={14} />}
          >
            Use Suggested Area
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAoiAdjust(!aoiAdjust);
              setTool('pan');
            }}
            icon={<Expand size={14} />}
            disabled={!aoi?.shape}
          >
            {aoiAdjust ? 'Done Adjusting' : 'Adjust Area'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTool(drawing || aoi ? 'draw' : 'draw');
              setAoiAdjust(false);
            }}
            icon={<PenTool size={14} />}
          >
            {drawing ? 'Continue Drawing' : 'Draw Custom Boundary'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToSuggested}
            icon={<RotateCcw size={14} />}
          >
            Clear / Reset
          </Button>
        </div>
      </div>

      {/* Adjust hints */}
      {aoiAdjust && (
        <div className="mt-3 rounded-xl border border-brand-500/25 bg-brand-500/15 p-4">
          <div className="flex items-start gap-3">
            <MousePointer2 size={17} className="mt-0.5 shrink-0 text-brand-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Adjust mode</p>
              <p className="mt-1 text-xs leading-relaxed text-navy-300">
                Drag the blue handle on the map to move the corridor, or use
                the buttons below to resize it.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => onResize(0.85)}>
                  − Smaller
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onResize(1.18)}>
                  + Larger
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {drawing && (
        <div className="mt-3 rounded-xl border border-brand-500/25 bg-brand-500/15 p-4">
          <div className="flex items-start gap-3">
            <PenTool size={17} className="mt-0.5 shrink-0 text-brand-400" />
            <div>
              <p className="text-sm font-semibold text-white">Drawing custom boundary</p>
              <p className="mt-1 text-xs leading-relaxed text-navy-300">
                Click on the map to add vertices (minimum 3), then choose
                <span className="font-semibold"> Finish</span> on the map toolbar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {aoi && !confirmed && !drawing && (
        <div className="mt-4 border-t border-navy-800/60 pt-4">
          <p className="text-sm font-semibold text-navy-100">
            Is this the analysis area you want to use?
          </p>
          <div className="mt-3">
            <Button size="sm" onClick={() => { setConfirmed(true); setAoiAdjust(false); }} icon={<Check size={14} />}>
              Confirm AOI
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft size={14} /> Back
        </Button>
        <Button onClick={onProceed} disabled={!canProceed || !confirmed}>
          Continue to Event Date
        </Button>
      </div>
    </div>
  );
}
