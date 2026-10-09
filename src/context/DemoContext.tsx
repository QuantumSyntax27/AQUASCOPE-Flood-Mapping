import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAnalysis } from './AnalysisContext';

/**
 * DemoContext — drives the guided AQUASCOPE walkthrough.
 * The demo operates the real interface: it selects the demo
 * location, confirms the AOI, picks the event date, runs the
 * analysis and walks through every module.
 */

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  route: string;
  /** CSS selector of the element to spotlight */
  target?: string;
  /** auto-advance after N ms (unless waitFor) */
  autoAdvanceMs?: number;
  /** wait for an app condition before advancing */
  waitFor?: 'analysis-complete' | 'report-ready';
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'location',
    title: 'Select the disaster location',
    description:
      'Search for the flood-affected location. The demo selects Trishuli, Nepal — a flood-prone river corridor in the Himalaya.',
    route: '/setup',
    target: '[data-demo="location-search"]',
    autoAdvanceMs: 4600,
  },
  {
    id: 'aoi',
    title: 'Confirm the Area of Interest',
    description:
      'A river-corridor AOI is suggested automatically, sized for Sentinel-1 swath coverage. Accept it, or drag and resize it on the map.',
    route: '/setup',
    target: '[data-demo="aoi-card"]',
    autoAdvanceMs: 4600,
  },
  {
    id: 'event-date',
    title: 'Select the flood event date',
    description:
      'Choose when the flood occurred — 26 August 2026. AQUASCOPE automatically builds the BEFORE → EVENT → AFTER acquisition timeline.',
    route: '/setup',
    target: '[data-demo="event-calendar"]',
    autoAdvanceMs: 4600,
  },
  {
    id: 'analysis',
    title: 'Run the satellite-based analysis',
    description:
      'Six pipeline stages execute in sequence: data acquisition, preprocessing, AI flood mapping, infrastructure impact, connectivity analysis and validation.',
    route: '/setup',
    target: '[data-demo="run-analysis"]',
    waitFor: 'analysis-complete',
  },
  {
    id: 'flood',
    title: 'Flood Detection',
    description:
      'The mapped flood extent with confidence categories. The before / after view compares pre-event imagery with the co-event flood mask.',
    route: '/flood',
    target: '[data-demo="flood-map"]',
    autoAdvanceMs: 6200,
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure Impact',
    description:
      'Roads, buildings and bridges that overlap the flood mask are reported as potentially affected — overlap is reported, never assumed destruction.',
    route: '/infrastructure',
    target: '[data-demo="infra-panel"]',
    autoAdvanceMs: 5800,
  },
  {
    id: 'connectivity',
    title: 'Road Connectivity',
    description:
      'Potentially affected road segments are removed from the road graph to model which routes remain passable between settlements and towns.',
    route: '/connectivity',
    target: '[data-demo="connectivity-graph"]',
    autoAdvanceMs: 5800,
  },
  {
    id: 'settlement',
    title: 'Settlement Detail',
    description:
      'A potentially road-disconnected settlement: its relevant town, hospital, affected road segments and alternate route status.',
    route: '/settlements',
    target: '[data-demo="settlement-table"]',
    autoAdvanceMs: 6400,
  },
  {
    id: 'validation',
    title: 'Validation',
    description:
      'Model output is compared against EMSR927 reference data — validation only, never a model input. IoU, Dice, precision, recall and F1.',
    route: '/validation',
    target: '[data-demo="validation-metrics"]',
    autoAdvanceMs: 5800,
  },
  {
    id: 'report',
    title: 'Situation Report',
    description:
      'Compile all results into a structured situation report for the response coordination cell — downloadable as a PDF.',
    route: '/reports',
    target: '[data-demo="report-generate"]',
    waitFor: 'report-ready',
  },
];

interface DemoContextValue {
  active: boolean;
  started: boolean;
  stepIndex: number;
  paused: boolean;
  presentation: boolean;
  finished: boolean;
  runId: number;
  reportReady: boolean;
  step: DemoStep | null;
  begin: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  exit: () => void;
  togglePresentation: () => void;
  setReportReady: (v: boolean) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const { status, reset } = useAnalysis();
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const runIdRef = useRef(0);
  const [runId, setRunId] = useState(0);

  // Presentation mode hides the app chrome (header + sidebar)
  useEffect(() => {
    document.documentElement.classList.toggle('demo-presentation', presentation);
    return () => document.documentElement.classList.remove('demo-presentation');
  }, [presentation]);

  const bumpRun = useCallback(() => {
    runIdRef.current += 1;
    setRunId(runIdRef.current);
  }, []);

  const begin = useCallback(() => {
    // A fresh pipeline run makes the demo operate the real stages.
    if (status === 'completed') reset();
    sawRunningRef.current = false;
    setActive(true);
    setStarted(true);
    setStepIndex(0);
    setFinished(false);
    setPaused(false);
    setReportReady(false);
    bumpRun();
  }, [status, reset, bumpRun]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= DEMO_STEPS.length - 1) {
        setFinished(true);
        return i;
      }
      return i + 1;
    });
    setReportReady(false);
  }, []);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
    setReportReady(false);
  }, []);

  const goTo = useCallback((index: number) => {
    const i = Math.max(0, Math.min(DEMO_STEPS.length - 1, index));
    setStepIndex(i);
    setReportReady(false);
  }, []);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  const restart = useCallback(() => {
    if (status === 'completed') reset();
    sawRunningRef.current = false;
    setStepIndex(0);
    setFinished(false);
    setPaused(false);
    setReportReady(false);
    bumpRun();
  }, [status, reset, bumpRun]);

  const exit = useCallback(() => {
    setActive(false);
    setStarted(false);
    setFinished(false);
    setStepIndex(0);
    setPaused(false);
    setPresentation(false);
    setReportReady(false);
    bumpRun();
  }, [bumpRun]);

  const togglePresentation = useCallback(
    () => setPresentation((p) => !p),
    [],
  );

  // Track whether the analysis pipeline has run since the demo
  // entered the analysis step — prevents a stale completed result
  // from advancing the step before the demo actually re-runs it.
  const sawRunningRef = useRef(false);
  useEffect(() => {
    if (status === 'running') sawRunningRef.current = true;
  }, [status]);

  // Reset the pipeline guard whenever the demo enters the
  // analysis step, so a previously completed result can never
  // advance the step before the demo re-runs the pipeline.
  const stepId = started && !finished ? DEMO_STEPS[stepIndex]?.id : null;
  useEffect(() => {
    if (stepId === 'analysis') sawRunningRef.current = false;
  }, [stepId]);

  // Auto-advance engine
  useEffect(() => {
    if (!active || !started || paused || finished) return;
    const step = DEMO_STEPS[stepIndex];
    if (!step) return;

    if (step.waitFor === 'analysis-complete') {
      if (sawRunningRef.current && status === 'completed') {
        const t = setTimeout(next, 2000);
        return () => clearTimeout(t);
      }
      return; // keep waiting for the pipeline
    }
    if (step.waitFor === 'report-ready') {
      if (reportReady) {
        const t = setTimeout(() => setFinished(true), 2400);
        return () => clearTimeout(t);
      }
      return;
    }
    const t = setTimeout(next, step.autoAdvanceMs ?? 5200);
    return () => clearTimeout(t);
  }, [
    active,
    started,
    paused,
    finished,
    stepIndex,
    status,
    reportReady,
    next,
  ]);

  const value = useMemo<DemoContextValue>(
    () => ({
      active,
      started,
      stepIndex,
      paused,
      presentation,
      finished,
      runId,
      reportReady,
      step: started && !finished ? DEMO_STEPS[stepIndex] ?? null : null,
      begin,
      next,
      prev,
      goTo,
      pause,
      resume,
      restart,
      exit,
      togglePresentation,
      setReportReady,
    }),
    [
      active,
      started,
      stepIndex,
      paused,
      presentation,
      finished,
      runId,
      reportReady,
      begin,
      next,
      prev,
      goTo,
      pause,
      resume,
      restart,
      exit,
      togglePresentation,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}

/** Runs `effect` when the given demo step is active. */
export function useDemoStep(
  stepId: string,
  effect: () => void | (() => void),
  deps: unknown[] = [],
) {
  const { active, started, step, runId, finished } = useDemo();
  useEffect(() => {
    if (!active || !started || finished || step?.id !== stepId) return;
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, started, finished, step?.id, runId, ...deps]);
}
