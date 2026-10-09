import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CloudRainWind,
  Satellite,
  ShieldCheck,
} from 'lucide-react';
import type { SceneSelection } from '../../types';
import { Button, Chip } from '../ui';
import { Calendar } from './Calendar';
import { getSatelliteScenes } from '../../services/mockApi';
import { formatDateLong, todayISO } from '../../utils/geo';
import type { SetupState } from '../../pages/SetupFlow';

interface EventDateStepProps {
  state: SetupState;
  update: (patch: Partial<SetupState>) => void;
  onProceed: () => void;
  onBack: () => void;
  canProceed: boolean;
}

export function EventDateStep({
  state,
  update,
  onProceed,
  onBack,
  canProceed,
}: EventDateStepProps) {
  const [scenes, setScenes] = useState<SceneSelection | null>(null);

  const handleDateChange = (iso: string) => {
    update({ eventDate: iso });
    setScenes(getSatelliteScenes(iso));
  };

  const beforeDate = useMemo(
    () => (state.eventDate ? scenes?.before.acquisitionDate ?? null : null),
    [state.eventDate, scenes],
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-white">Event Date</h2>
      <p className="mt-1 text-sm text-navy-400">
        Select the date when the flood/event occurred. AQUASCOPE
        automatically selects the best available satellite scenes — you never
        choose orbits, sensors or preprocessing settings.
      </p>

      <div data-demo="event-calendar" className="mt-5">
        <Calendar
          value={state.eventDate}
          onChange={handleDateChange}
          maxDate={todayISO()}
        />
      </div>

      <AnimatePresence>
        {state.eventDate && scenes && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5"
          >
            {/* Timeline */}
            <div className="rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">
                Acquisition timeline
              </p>
              <div className="mt-3 flex items-center">
                <TimelineNode
                  label="BEFORE"
                  date={scenes.before.acquisitionDate}
                  sub="Pre-event scene"
                  tone="blue"
                />
                <div className="flex-1 px-1">
                  <div className="relative h-0.5 rounded bg-navy-800/70">
                    <motion.div
                      className="absolute inset-0 rounded bg-brand-400"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                </div>
                <TimelineNode
                  label="EVENT"
                  date={state.eventDate}
                  sub="Flood event date"
                  tone="red"
                />
                <div className="flex-1 px-1">
                  <div className="relative h-0.5 rounded bg-navy-800/70">
                    <motion.div
                      className="absolute inset-0 rounded bg-brand-400"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: 0.15 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  </div>
                </div>
                <TimelineNode
                  label="AFTER"
                  date={scenes.after.acquisitionDate}
                  sub="Co-event scene"
                  tone="green"
                />
              </div>
            </div>

            {/* Scene cards */}
            <div className="mt-3 grid gap-2">
              <SceneCard
                title="Before Scene"
                scene={scenes.before}
                icon={<Satellite size={15} />}
              />
              <SceneCard
                title="Event / After Scene"
                scene={scenes.after}
                icon={<CloudRainWind size={15} />}
                fallback={scenes.fallbackUsed}
              />
            </div>

            {scenes.fallbackNote && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                <p className="text-xs font-semibold text-amber-300">
                  Automatic scene substitution
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-300/90">
                  {scenes.fallbackNote}
                </p>
              </div>
            )}

            {/* Automatic checks */}
            <div className="mt-3 rounded-xl border border-navy-800 bg-navy-900 p-4 shadow-panel">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-navy-400">
                Automatic scene selection
              </p>
              <ul className="mt-2.5 space-y-2">
                <CheckRow ok label="AOI coverage" detail="100% of the analysis area inside the scene footprint" />
                <CheckRow ok label="Suitable acquisition" detail="Ascending pass, IW swath, cloud-free (SAR)" />
                <CheckRow ok label="Same / compatible relative orbit" detail="Relative orbit 143 for both scenes" />
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft size={14} /> Back
        </Button>
        <Button onClick={onProceed} disabled={!canProceed}>
          Review Analysis <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function TimelineNode({
  label,
  date,
  sub,
  tone,
}: {
  label: string;
  date: string;
  sub: string;
  tone: 'blue' | 'red' | 'green';
}) {
  const tones = {
    blue: 'bg-brand-600',
    red: 'bg-red-500',
    green: 'bg-green-500',
  };
  return (
    <div className="flex w-[74px] shrink-0 flex-col items-center text-center">
      <span className={`h-2.5 w-2.5 rounded-full ${tones[tone]} shadow-sm`} />
      <p className="mt-1.5 text-[9px] font-bold tracking-wider text-navy-400">{label}</p>
      <p className="font-mono text-[10px] font-semibold text-navy-100">{date.slice(5)}</p>
      <p className="text-[9px] text-navy-400">{sub}</p>
    </div>
  );
}

function SceneCard({
  title,
  scene,
  icon,
  fallback = false,
}: {
  title: string;
  scene: SceneSelection['before'];
  icon: React.ReactNode;
  fallback?: boolean;
}) {
  return (
    <div className="rounded-xl border border-navy-800 bg-navy-900 p-3.5 shadow-panel">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-bold text-navy-100">
          <span className="text-brand-400">{icon}</span>
          {title}
          {fallback && (
            <Chip className="border-amber-500/30 bg-amber-500/10 text-amber-300">
              Auto-selected alternative
            </Chip>
          )}
        </p>
        <Chip className="border-green-500/30 bg-green-500/10 text-green-300">
          <ShieldCheck size={11} /> Available
        </Chip>
      </div>
      <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-navy-400">
        {scene.id}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip>{scene.platform}</Chip>
        <Chip>{formatDateLong(scene.acquisitionDate)}</Chip>
        <Chip>Orbit {scene.relativeOrbit} · {scene.passDirection}</Chip>
        <Chip>{scene.swathMode}</Chip>
      </div>
    </div>
  );
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-400">
        <Check size={11} />
      </span>
      <span>
        <span className="block text-xs font-semibold text-navy-100">{label}</span>
        <span className="block text-[11px] text-navy-400">{detail}</span>
      </span>
    </li>
  );
}
