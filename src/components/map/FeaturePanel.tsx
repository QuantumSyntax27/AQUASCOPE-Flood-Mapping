import { X } from 'lucide-react';
import type { FeatureInfo } from '../../types';
import { Badge, ConfidenceBadge } from '../ui';

const KIND_LABEL: Record<FeatureInfo['kind'], string> = {
  flood: 'Flood extent',
  road: 'Road segment',
  building: 'Building',
  bridge: 'Bridge',
  settlement: 'Settlement',
  hospital: 'Hospital',
  town: 'Town',
  route: 'Route',
  reference: 'Reference extent',
};

export function FeaturePanel({
  feature,
  onClose,
}: {
  feature: FeatureInfo;
  onClose: () => void;
}) {
  const confidenceField = feature.fields.find(([k]) => k.toLowerCase().includes('confidence'));
  return (
    <div className="overflow-hidden rounded-xl border border-navy-800 bg-navy-900 shadow-map">
      <div className="flex items-start justify-between gap-2 border-b border-navy-800/60 bg-navy-800/40 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-400">
            {KIND_LABEL[feature.kind]}
          </p>
          <h4 className="mt-0.5 truncate text-sm font-bold text-white">{feature.title}</h4>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-navy-400 hover:bg-navy-800/70 hover:text-navy-200"
          aria-label="Close details"
        >
          <X size={15} />
        </button>
      </div>
      <dl className="max-h-56 overflow-y-auto px-4 py-3">
        {feature.fields.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-3 border-b border-navy-800/60 py-1.5 last:border-0">
            <dt className="text-[11px] font-medium text-navy-400">{k}</dt>
            <dd className="text-right text-[11px] font-semibold text-navy-100">
              {k === 'Confidence' && confidenceField ? (
                <ConfidenceBadge
                  confidence={
                    String(v).toLowerCase().includes('borderline')
                      ? 'borderline'
                      : String(v).toLowerCase().includes('lower')
                        ? 'lower'
                        : 'higher'
                  }
                />
              ) : k === 'Status' ? (
                <StatusInline value={String(v)} />
              ) : (
                v
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-navy-800/60 bg-navy-800/40 px-4 py-2 text-[10px] text-navy-400">
        Simulated feature — demo geometry, not a real-world claim.
      </p>
    </div>
  );
}

function StatusInline({ value }: { value: string }) {
  const v = value.toLowerCase();
  if (v.includes('affected') && !v.includes('not')) {
    return <Badge color="amber" dot={false}>Potentially affected</Badge>;
  }
  if (v.includes('disconnected')) {
    return <Badge color="red" dot={false}>Potentially road-disconnected</Badge>;
  }
  if (v.includes('connected')) {
    return <Badge color="green" dot={false}>Connected</Badge>;
  }
  if (v.includes('not')) {
    return <Badge color="slate" dot={false}>Not affected</Badge>;
  }
  return <Badge color="blue" dot={false}>{value}</Badge>;
}
