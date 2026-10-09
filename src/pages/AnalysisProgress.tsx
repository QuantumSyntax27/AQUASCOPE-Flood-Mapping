import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  FileCheck2,
  Loader2,
  Terminal,
  Wrench,
} from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';
import { Badge, Button, ProgressBar, StatusBadge } from '../components/ui';
import { formatDuration } from '../utils/geo';
import type { AnalysisStageState } from '../types';

export function AnalysisProgress() {
  const { stages, overall, status, result, params } = useAnalysis();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [techOpen, setTechOpen] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (status === 'completed' && result) {
      const t = setTimeout(() => setShowComplete(true), 700);
      return () => clearTimeout(t);
    }
  }, [status, result]);

  if (stages.length === 0 && status !== 'running') {
    return (
      <div className="flex h-full items-center justify-center bg-navy-900">
        <div className="text-center">
          <p className="text-sm text-navy-400">No analysis is running.</p>
          <Button className="mt-4" onClick={() => navigate('/setup')}>
            Start a new analysis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-navy-950">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lifted"
          >
            {status === 'completed' ? (
              <CheckCircle2 size={26} />
            ) : (
              <Loader2 size={26} className="animate-spin" />
            )}
          </motion.div>
          <h1 className="mt-4 text-xl font-bold text-white">
            {status === 'completed' ? 'Analysis Complete' : 'Running Flood Analysis'}
          </h1>
          <p className="mt-1 text-sm text-navy-400">
            {params
              ? `${params.location.name} · Event ${params.eventDate} · ${params.aoi.name}`
              : 'Processing…'}
          </p>
          <div className="mx-auto mt-4 max-w-md">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-navy-300">Overall progress</span>
              <span className="font-mono text-brand-400">{overall}%</span>
            </div>
            <ProgressBar value={overall} className="mt-1.5 h-2" />
          </div>
        </div>

        {/* Stages */}
        <div className="mt-8 space-y-2.5">
          {stages.map((stage, i) => (
            <StageCard
              key={stage.id}
              stage={stage}
              index={i}
              expanded={expanded === stage.id}
              onToggle={() => setExpanded(expanded === stage.id ? null : stage.id)}
            />
          ))}
        </div>

        {/* Technical details (collapsed by default) */}
        <div className="mt-6">
          <button
            onClick={() => setTechOpen((v) => !v)}
            aria-expanded={techOpen}
            className="flex w-full items-center justify-between rounded-xl border border-navy-800 bg-navy-900 px-4 py-3 shadow-panel hover:bg-navy-800/60"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-navy-100">
              <Terminal size={15} className="text-navy-400" />
              Technical Details
              <Badge color="slate">advanced</Badge>
            </span>
            <ChevronDown
              size={16}
              className={`text-navy-400 transition-transform ${techOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {techOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-xl border border-navy-800 bg-navy-950 p-4 shadow-panel">
                  <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                    <TechRow label="Location" value={params?.location.name ?? '—'} />
                    <TechRow label="Event date" value={params?.eventDate ?? '—'} />
                    <TechRow label="AOI" value={params ? `${params.aoi.name} (${params.aoi.areaKm2.toFixed(1)} km²)` : '—'} />
                    <TechRow label="Before scene" value={result?.metadata.beforeScene.id ?? '—'} />
                    <TechRow label="Co-event scene" value={result?.metadata.afterScene.id ?? '—'} />
                    <TechRow label="Relative orbit" value={result ? `${result.metadata.afterScene.relativeOrbit} (${result.metadata.afterScene.passDirection})` : '—'} />
                    <TechRow label="AOI coverage" value="100%" />
                    <TechRow label="DEM" value={result?.metadata.demSource ?? '—'} />
                    <TechRow label="OSM release" value={result?.metadata.osmRelease ?? '—'} />
                    <TechRow label="Model version" value={result?.metadata.modelVersion ?? '—'} />
                    <TechRow label="Threshold" value={result ? String(result.metadata.threshold) : '—'} />
                    <TechRow label="Processing time" value={result ? formatDuration(result.metadata.processingTimeMs) : '—'} />
                  </dl>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate('/setup')}>
            Cancel / start over
          </Button>
        </div>
      </div>

      {/* Completion overlay */}
      <AnimatePresence>
        {showComplete && status === 'completed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center bg-navy-950/70 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="w-full max-w-md rounded-2xl bg-navy-900 p-7 shadow-map"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', damping: 12 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-400"
              >
                <FileCheck2 size={30} />
              </motion.div>
              <h2 className="mt-4 text-center text-lg font-bold text-white">
                Analysis Complete
              </h2>
              <p className="mt-2 text-center text-sm leading-relaxed text-navy-400">
                Flood mapping, infrastructure impact and connectivity analysis
                are ready for {params?.location.name}.
              </p>
              {result && (
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-navy-800/50 p-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-white tabular-nums">{result.flood.totalAreaKm2}</p>
                    <p className="text-[10px] font-medium text-navy-400">km² flooded</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white tabular-nums">{result.infrastructure.roads.affectedKm}</p>
                    <p className="text-[10px] font-medium text-navy-400">km roads affected</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white tabular-nums">{result.connectivity.disconnected}</p>
                    <p className="text-[10px] font-medium text-navy-400">settlements disconnected</p>
                  </div>
                </div>
              )}
              <div className="mt-5 flex justify-center gap-2">
                <Button onClick={() => navigate('/dashboard')}>
                  Open Dashboard
                </Button>
                <Button variant="secondary" onClick={() => navigate('/flood')}>
                  Flood Detection
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StageCard({
  stage,
  index,
  expanded,
  onToggle,
}: {
  stage: AnalysisStageState;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`overflow-hidden rounded-xl border bg-navy-900 shadow-panel transition-colors ${
        stage.status === 'failed' ? 'border-red-500/30' : 'border-navy-800'
      }`}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-navy-800/50"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            stage.status === 'completed'
              ? 'bg-green-100 text-green-400'
              : stage.status === 'failed'
                ? 'bg-red-100 text-red-400'
                : stage.status === 'processing'
                  ? 'bg-brand-100 text-brand-300'
                  : 'bg-navy-800/70 text-navy-400'
          }`}
        >
          {stage.status === 'completed' ? (
            <CheckCircle2 size={16} />
          ) : stage.status === 'failed' ? (
            <AlertWarning size={16} />
          ) : stage.status === 'processing' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CircleDashed size={16} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              <span className="mr-1.5 font-mono text-[11px] text-navy-400">
                {String(index + 1).padStart(2, '0')}
              </span>
              {stage.name}
            </span>
            <StatusBadge status={stage.status} />
          </span>
          <span className="mt-0.5 block truncate text-xs text-navy-400">
            {stage.description}
          </span>
        </span>
        {stage.durationMs !== undefined && stage.status === 'completed' && (
          <span className="font-mono text-[11px] text-navy-400">
            {formatDuration(stage.durationMs)}
          </span>
        )}
        <ChevronDown
          size={15}
          className={`shrink-0 text-navy-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-navy-800/60 px-4 py-3">
              {stage.status === 'processing' && (
                <ProgressBar value={stage.progress} className="mb-3" />
              )}
              {stage.issue && (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Wrench size={13} />
                    {stage.issue.finalStatus}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-300/90">
                    <span className="font-semibold">What failed:</span> {stage.issue.what}.{' '}
                    <span className="font-semibold">Why:</span> {stage.issue.why}{' '}
                    <span className="font-semibold">Retried:</span> {stage.issue.retry}
                  </p>
                  {stage.issue.limitation && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-amber-300/80">
                      <span className="font-semibold">Limitation:</span> {stage.issue.limitation}
                    </p>
                  )}
                </div>
              )}
              <ul className="space-y-1">
                {stage.logs.map((log, i) => (
                  <li
                    key={i}
                    className={`font-mono text-[11px] leading-relaxed ${
                      log.startsWith('ERROR')
                        ? 'text-red-400'
                        : log.startsWith('RETRY')
                          ? 'text-amber-400'
                          : 'text-navy-400'
                    }`}
                  >
                    <span className="mr-2 text-navy-300">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {log}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AlertWarning(props: { size?: number }) {
  return <AlertTriangle size={props.size} />;
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-navy-800/60 pb-1.5">
      <dt className="text-[11px] font-medium text-navy-400">{label}</dt>
      <dd className="text-right font-mono text-[11px] text-navy-100">{value}</dd>
    </div>
  );
}
