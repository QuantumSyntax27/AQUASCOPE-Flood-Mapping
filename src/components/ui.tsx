import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Info,
  Loader2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { classNames } from '../utils/geo';
import type { Confidence, StageStatus } from '../types';

// ─── Button ────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-brand-600 text-white hover:bg-brand-700 shadow-sm border border-brand-700',
    secondary:
      'bg-navy-800 text-navy-100 hover:bg-navy-700 border border-navy-700 shadow-sm',
    ghost: 'bg-transparent text-navy-200 hover:bg-navy-800/70 border border-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 border border-red-700 shadow-sm',
    dark: 'bg-navy-900 text-white hover:bg-navy-800 border border-navy-800 shadow-sm',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9.5 px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-[15px] gap-2',
  };
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center font-semibold rounded-lg transition-colors',
        'focus-visible:outline-2 focus-visible:outline-brand-600',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────

export function Card({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames(
        'bg-navy-900 rounded-xl border border-navy-800 shadow-panel',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-navy-800/70">
      <div>
        <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-navy-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Badges ────────────────────────────────────────────────────────────

type BadgeColor = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet';

const badgeColors: Record<BadgeColor, string> = {
  green: 'bg-green-500/15 text-green-300 border-green-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  red: 'bg-red-500/15 text-red-300 border-red-500/30',
  blue: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

export function Badge({
  color = 'slate',
  children,
  className,
  dot = true,
}: {
  color?: BadgeColor;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const dotColors: Record<BadgeColor, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-brand-500',
    slate: 'bg-slate-400',
    violet: 'bg-violet-500',
  };
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        badgeColors[color],
        className,
      )}
    >
      {dot && <span className={classNames('h-1.5 w-1.5 rounded-full', dotColors[color])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: StageStatus }) {
  const map = {
    queued: { icon: CircleDashed, color: 'slate' as BadgeColor, label: 'Queued' },
    processing: { icon: Loader2, color: 'blue' as BadgeColor, label: 'Processing' },
    completed: { icon: CheckCircle2, color: 'green' as BadgeColor, label: 'Completed' },
    failed: { icon: XCircle, color: 'red' as BadgeColor, label: 'Failed' },
  }[status];
  const Icon = map.icon;
  return (
    <Badge color={map.color}>
      <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
      {map.label}
    </Badge>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const map = {
    higher: { color: 'green' as BadgeColor, label: 'Higher confidence' },
    borderline: { color: 'amber' as BadgeColor, label: 'Borderline' },
    lower: { color: 'violet' as BadgeColor, label: 'Lower confidence' },
  }[confidence];
  return <Badge color={map.color}>{map.label}</Badge>;
}

// ─── Metric card ───────────────────────────────────────────────────────

export function MetricCard({
  label,
  value,
  sub,
  icon,
  accent = 'blue',
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  accent?: 'blue' | 'red' | 'amber' | 'green' | 'violet';
  className?: string;
}) {
  const accents = {
    blue: 'text-brand-300 bg-brand-500/15',
    red: 'text-red-300 bg-red-500/15',
    amber: 'text-amber-300 bg-amber-500/15',
    green: 'text-green-300 bg-green-500/15',
    violet: 'text-violet-300 bg-violet-500/15',
  };
  return (
    <Card className={classNames('p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-white tracking-tight tabular-nums">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-navy-400 leading-snug">{sub}</p>}
        </div>
        {icon && (
          <span className={classNames('shrink-0 rounded-lg p-2', accents[accent])}>{icon}</span>
        )}
      </div>
    </Card>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────

export function ProgressBar({
  value,
  color = 'bg-brand-500',
  className,
  barStyle,
}: {
  value: number;
  color?: string;
  className?: string;
  barStyle?: React.CSSProperties;
}) {
  return (
    <div className={classNames('h-1.5 w-full overflow-hidden rounded-full bg-navy-800', className)}>
      <motion.div
        className={classNames('h-full rounded-full', color)}
        style={barStyle}
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ ease: 'easeOut', duration: 0.4 }}
      />
    </div>
  );
}

// ─── States ────────────────────────────────────────────────────────────

export function LoadingState({
  title = 'Loading',
  message,
  progress,
}: {
  title?: string;
  message?: string;
  progress?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-navy-800" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin" />
        <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {message && <p className="mt-1 text-xs text-navy-400 max-w-sm">{message}</p>}
        {progress !== undefined && (
          <div className="mt-3 w-56">
            <ProgressBar value={progress} />
            <p className="mt-1.5 text-[11px] font-mono text-navy-400">{progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  what,
  why,
  retry,
  finalStatus,
  limitation,
  action,
}: {
  title: string;
  what?: string;
  why?: string;
  retry?: string;
  finalStatus?: string;
  limitation?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-red-500/40 p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
          <AlertTriangle size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <div className="mt-3 space-y-2.5 text-sm">
            {what && (
              <DetailRow label="What failed" value={what} tone="red" />
            )}
            {why && <DetailRow label="Why" value={why} />}
            {retry && <DetailRow label="What was retried" value={retry} tone="blue" />}
            {finalStatus && <DetailRow label="Final status" value={finalStatus} tone="amber" />}
            {limitation && <DetailRow label="Limitation" value={limitation} tone="violet" />}
          </div>
          {action && <div className="mt-4 flex gap-2">{action}</div>}
        </div>
      </div>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'red' | 'blue' | 'amber' | 'violet';
}) {
  const tones = {
    slate: 'text-navy-300',
    red: 'text-red-300',
    blue: 'text-brand-300',
    amber: 'text-amber-300',
    violet: 'text-violet-300',
  };
  return (
    <div className="flex gap-3">
      <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-navy-400 pt-0.5">
        {label}
      </span>
      <p className={classNames('text-[13px] leading-relaxed', tones[tone])}>{value}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={classNames(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-10' : 'py-24',
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800 text-navy-400 border border-navy-700">
        {icon ?? <Info size={24} />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm text-navy-400 leading-relaxed">{message}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export function SuccessState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-green-500/40 p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-300">
          <ShieldCheck size={20} />
        </span>
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {message && <p className="mt-1 text-sm text-navy-300 leading-relaxed max-w-xl">{message}</p>}
          {action && <div className="mt-4 flex gap-2">{action}</div>}
        </div>
      </div>
    </Card>
  );
}

// ─── Misc ──────────────────────────────────────────────────────────────

export function SectionTitle({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames('flex items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-navy-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-md bg-navy-800/80 border border-navy-700 px-2 py-1 text-[11px] font-medium text-navy-300',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ListItemArrow() {
  return <ChevronRight size={14} className="text-navy-500 shrink-0" />;
}

export function RotateIcon({ className }: { className?: string }) {
  return <RotateCcw size={14} className={className} />;
}
