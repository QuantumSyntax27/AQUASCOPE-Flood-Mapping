import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckSquare,
  Download,
  FileText,
  Loader2,
  ListChecks,
  Plus,
  Square,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAnalysis } from '../context/AnalysisContext';
import { Badge, Button, Card, CardHeader, Chip, EmptyState } from '../components/ui';
import { PageHeader, DemoBadge } from '../components/layout/PageHeader';
import { formatDateLong } from '../utils/geo';
import { useDemo } from '../context/DemoContext';
import type { ReportData } from '../types';

const ALL_SECTIONS = [
  { id: 'flood-assessment', title: '1. Flood Assessment' },
  { id: 'infrastructure-impact', title: '2. Infrastructure Impact' },
  { id: 'connectivity-assessment', title: '3. Connectivity Assessment' },
  { id: 'disconnected-settlements', title: '4. Potentially Road-Disconnected Settlements' },
  { id: 'confidence-uncertainty', title: '5. Confidence & Uncertainty' },
  { id: 'validation', title: '6. Validation' },
  { id: 'limitations', title: '7. Limitations' },
  { id: 'metadata', title: '8. Analysis Metadata' },
];

type Phase = 'idle' | 'building' | 'ready' | 'pdf-building' | 'pdf-ready';

export function Reports() {
  const { result, buildReport } = useAnalysis();
  const [selectedSections, setSelectedSections] = useState<string[]>(
    ALL_SECTIONS.map((s) => s.id),
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [report, setReport] = useState<ReportData | null>(null);

  // Demo Mode: auto-generate the situation report
  const { active, started, finished, step: demoStep, runId, setReportReady } =
    useDemo();

  useEffect(() => {
    if (!active || !started || finished || demoStep?.id !== 'report' || !result)
      return;
    const t = setTimeout(() => {
      void (async () => {
        setPhase('building');
        const data = await buildReport(selectedSections);
        setReport(data);
        setPhase('ready');
      })();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, started, finished, demoStep?.id, runId, result]);

  useEffect(() => {
    if (phase === 'ready' || phase === 'pdf-ready') setReportReady(true);
  }, [phase, setReportReady]);

  if (!result) {
    return (
      <div className="h-full overflow-y-auto bg-navy-950">
        <PageHeader title="Reports" subtitle="Situation report generation." />
        <div className="px-6">
          <EmptyState
            icon={<FileText size={24} />}
            title="No analysis loaded"
            message="Run an analysis to generate a situation report."
          />
        </div>
      </div>
    );
  }

  const md = result.metadata;

  const toggleSection = (id: string) => {
    setSelectedSections((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  };

  const generate = async () => {
    setPhase('building');
    const data = await buildReport(selectedSections);
    setReport(data);
    setPhase('ready');
  };

  const generatePdf = async () => {
    if (!report) return;
    setPhase('pdf-building');
    await new Promise((r) => setTimeout(r, 600));
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Header band
    doc.setFillColor(11, 31, 58);
    doc.rect(0, 0, pageW, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('AQUASCOPE — SITUATION REPORT', margin, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${report.location}   ·   Event: ${formatDateLong(report.eventDate)}`, margin, 18);
    doc.text(`Analysis ${report.analysisId}`, pageW - margin, 11, { align: 'right' });
    doc.text('DEMO / SIMULATED DATA', pageW - margin, 18, { align: 'right' });
    y = 34;

    doc.setTextColor(11, 31, 58);
    doc.setFontSize(8.5);
    doc.text(`Generated ${new Date(report.generatedAt).toLocaleString()}  ·  All values are simulated demonstration data, not real-world measurements.`, margin, y);
    y += 8;

    report.sections.forEach((section) => {
      ensureSpace(34);
      // section title
      doc.setFillColor(238, 247, 254);
      doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(14, 99, 194);
      doc.text(section.title, margin + 2, y + 5.6);
      y += 11;

      // summary
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(section.summary, pageW - margin * 2) as string[];
      lines.forEach((line) => {
        ensureSpace(5);
        doc.text(line, margin, y);
        y += 4.4;
      });
      y += 2;

      // metrics table
      if (section.metrics.length > 0) {
        ensureSpace(section.metrics.length * 6 + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(11, 31, 58);
        section.metrics.forEach((m) => {
          doc.text(m.label, margin + 2, y);
          doc.text(String(m.value), pageW - margin - 2, y, { align: 'right' });
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y + 1.8, pageW - margin, y + 1.8);
          y += 6;
        });
        y += 4;
      }
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(140, 155, 175);
      doc.text(
        `AQUASCOPE demo report · simulated data · page ${i} of ${pageCount}`,
        pageW / 2,
        pageH - 8,
        { align: 'center' },
      );
    }

    doc.save(`aquascope-situation-report-${report.analysisId}.pdf`);
    setPhase('pdf-ready');
  };

  return (
    <div className="flex h-full flex-col bg-navy-950">
      <PageHeader
        title="Situation Report"
        subtitle="Structured, printable report compiled from the analysis results."
        badge={<DemoBadge />}
      />

      <div className="flex min-h-0 flex-1 gap-4 px-6 pb-6">
        {/* Generator panel */}
        <div className="w-[300px] shrink-0 space-y-3 overflow-y-auto">
          <Card>
            <CardHeader
              title="Report Sections"
              subtitle={`${selectedSections.length} of ${ALL_SECTIONS.length} selected`}
            />
            <div className="space-y-0.5 px-3 py-3">
              {ALL_SECTIONS.map((s) => {
                const checked = selectedSections.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSection(s.id)}
                    aria-pressed={checked}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs font-medium text-navy-200 hover:bg-navy-800/50"
                  >
                    {checked ? (
                      <CheckSquare size={15} className="shrink-0 text-brand-400" />
                    ) : (
                      <Square size={15} className="shrink-0 text-navy-300" />
                    )}
                    {s.title}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-navy-800/60 px-5 py-3.5">
              <Button
                data-demo="report-generate"
                className="w-full"
                onClick={generate}
                loading={phase === 'building'}
                disabled={selectedSections.length === 0 || phase === 'building'}
                icon={<ListChecks size={15} />}
              >
                Generate Situation Report
              </Button>
            </div>
          </Card>

          <AnimatePresence>
            {report && (phase === 'ready' || phase === 'pdf-building' || phase === 'pdf-ready') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-brand-500/25">
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-400">
                      Report Status
                    </p>
                    <div className="mt-2 space-y-2">
                      <StatusLine ok label="Report compiled" />
                      <StatusLine ok label={`${report.sections.length} sections`} />
                      <StatusLine ok={phase === 'pdf-ready'} label="PDF generated" pending={phase === 'pdf-building'} />
                    </div>
                    {phase === 'pdf-ready' ? (
                      <div className="mt-3">
                        <Badge color="green">PDF ready</Badge>
                        <Button
                          className="mt-3 w-full"
                          variant="dark"
                          onClick={generatePdf}
                          icon={<Download size={15} />}
                        >
                          Download PDF
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="mt-3 w-full"
                        onClick={generatePdf}
                        loading={phase === 'pdf-building'}
                        icon={<FileText size={15} />}
                      >
                        Generate PDF
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="border-amber-500/20 bg-amber-500/10">
            <div className="p-4">
              <p className="text-[11px] font-semibold text-amber-300">Data integrity</p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-300/90">
                Reports are compiled from structured analysis data only —
                no free-form AI generation is used, so figures in the
                report always match the dashboard exactly.
              </p>
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          {report ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-[760px]"
            >
              {/* Report document */}
              <div className="rounded-xl border border-navy-800 bg-navy-900 shadow-lifted">
                <div className="rounded-t-xl bg-navy-900 px-8 py-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400">
                        AQUASCOPE · Situation Report
                      </p>
                      <h1 className="mt-1 text-xl font-extrabold text-white">
                        Flood Impact Assessment
                      </h1>
                      <p className="mt-1 text-sm text-navy-200">
                        {report.location} · Event {formatDateLong(report.eventDate)}
                      </p>
                    </div>
                    <Chip className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                      Demo / Simulated Data
                    </Chip>
                  </div>
                </div>
                <div className="px-8 py-6">
                  <p className="text-[11px] text-navy-400">
                    Generated {new Date(report.generatedAt).toLocaleString()} · Analysis {report.analysisId}
                  </p>

                  {report.sections.map((section, i) => (
                    <motion.section
                      key={section.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="mt-6"
                    >
                      <h2 className="flex items-center gap-2 border-b-2 border-brand-500/25 pb-2 text-sm font-bold text-white">
                        <Plus size={13} className="text-brand-500" />
                        {section.title}
                      </h2>
                      <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-navy-200">
                        {section.summary}
                      </p>
                      {section.metrics.length > 0 && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-navy-800">
                          {section.metrics.map((m, j) => (
                            <div
                              key={m.label}
                              className={`flex items-center justify-between px-4 py-2 text-xs ${j % 2 === 0 ? 'bg-navy-800/60' : 'bg-navy-900'}`}
                            >
                              <span className="font-medium text-navy-300">{m.label}</span>
                              <span className="font-mono font-semibold text-white">{m.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.section>
                  ))}

                  <div className="mt-8 rounded-lg bg-navy-800/50 px-4 py-3 text-[10px] leading-relaxed text-navy-400">
                    This report was produced by the AQUASCOPE demonstration
                    frontend with simulated analysis data. It does not
                    represent a real flood event. Figures must be verified
                    against authoritative sources before any operational use.
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy-800">
              <FileText size={36} className="text-navy-200" />
              <p className="mt-3 text-sm font-semibold text-navy-300">No report generated yet</p>
              <p className="mt-1 max-w-xs text-center text-xs text-navy-400">
                Select sections and choose "Generate Situation Report" to
                build a preview here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusLine({ ok, label, pending = false }: { ok: boolean; label: string; pending?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-navy-200">
      {pending ? (
        <Loader2 size={13} className="animate-spin text-brand-500" />
      ) : ok ? (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-400">
          <CheckSquare size={10} />
        </span>
      ) : (
        <span className="h-4 w-4 rounded-full border-2 border-navy-700" />
      )}
      {label}
    </div>
  );
}
