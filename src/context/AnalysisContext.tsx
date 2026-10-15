import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AnalysisParams, AnalysisResult, AnalysisStageState } from '../types';
import type { ReportData } from '../types';
import { generateReportData } from '../services/mockApi';

interface AnalysisContextValue {
  params: AnalysisParams | null;
  result: AnalysisResult | null;
  status: 'idle' | 'running' | 'completed';
  stages: AnalysisStageState[];
  overall: number;
  startAnalysis: (params: AnalysisParams) => Promise<void>;
  reset: () => void;
  buildReport: (sectionIds: string[]) => Promise<ReportData | null>;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

const STORAGE_KEY = 'aquascope-analysis-v1';

function loadPersisted(): { params: AnalysisParams; result: AnalysisResult } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.params && parsed?.result) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const persisted = useMemo(loadPersisted, []);
  const [params, setParams] = useState<AnalysisParams | null>(persisted?.params ?? null);
  const [result, setResult] = useState<AnalysisResult | null>(persisted?.result ?? null);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>(
    persisted ? 'completed' : 'idle',
  );
  const [stages, setStages] = useState<AnalysisStageState[]>([]);
  const [overall, setOverall] = useState(0);

  const startAnalysis = useCallback(async (p: AnalysisParams) => {
    setParams(p);
    setResult(null);
    setStatus('running');
    setStages([]);
    setOverall(0);
    try {
      const res = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(p),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      // Fall back to mock if backend unavailable
      const { runAnalysis: mockRun } = await import('../services/mockApi');
      const res = await mockRun(p, (s, o) => {
        setStages(s);
        setOverall(o);
      });
      setResult(res);
    }
    setStatus('completed');
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ params: p, result: result }));
    } catch {
      /* storage may be unavailable; analysis still works in-memory */
    }
  }, []);

  const reset = useCallback(() => {
    setParams(null);
    setResult(null);
    setStatus('idle');
    setStages([]);
    setOverall(0);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const buildReport = useCallback(
    async (sectionIds: string[]) => {
      if (!result) return null;
      return generateReportData(result, sectionIds);
    },
    [result],
  );

  const value = useMemo(
    () => ({ params, result, status, stages, overall, startAnalysis, reset, buildReport }),
    [params, result, status, stages, overall, startAnalysis, reset, buildReport],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}
