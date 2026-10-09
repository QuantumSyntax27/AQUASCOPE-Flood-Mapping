import { NavLink, useLocation } from 'react-router-dom';
import {
  Building2,
  Droplets,
  FileText,
  Info,
  LayoutDashboard,
  MapPin,
  Presentation,
  Route,
  ShieldCheck,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { classNames } from '../../utils/geo';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  demoTarget?: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Analyze',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, demoTarget: '[data-demo="dashboard"]' },
      { to: '/flood', label: 'Flood Detection', icon: Droplets },
      { to: '/infrastructure', label: 'Infrastructure Impact', icon: Building2 },
      { to: '/connectivity', label: 'Road Connectivity', icon: Route },
      { to: '/settlements', label: 'Settlements', icon: Users },
      { to: '/validation', label: 'Validation', icon: ShieldCheck },
    ],
  },
  {
    group: 'Insights',
    items: [
      { to: '/how-it-works', label: 'How It Works', icon: Workflow },
      { to: '/reports', label: 'Reports', icon: FileText },
      { to: '/about', label: 'About', icon: Info },
    ],
  },
  {
    group: 'Presentation',
    items: [
      { to: '/demo', label: 'Demo Mode', icon: Presentation },
    ],
  },
];

export function findNavItem(pathname: string): NavItem | undefined {
  for (const g of NAV_GROUPS) {
    const item = g.items.find((i) => i.to === pathname);
    if (item) return item;
  }
  return undefined;
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-lg bg-navy-900 shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width={size * 0.72} height={size * 0.72}>
        <path
          d="M16 5c5.5 0 9.5 4 9.5 9 0 6.4-5.5 12-9.5 12s-9.5-5.6-9.5-12c0-5 4-9 9.5-9zm0 4.2c-2.7 0-4.8 2.1-4.8 4.8 0 3.3 2.5 6.2 4.8 8.3 2.3-2.1 4.8-5 4.8-8.3 0-2.7-2.1-4.8-4.8-4.8z"
          fill="#38BDF8"
        />
        <circle cx="16" cy="13.8" r="2.1" fill="#0B1F3A" />
      </svg>
    </span>
  );
}

export function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  return (
    <nav className="flex h-full flex-col" aria-label="Primary">
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((g) => (
          <div key={g.group}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-navy-500">
                {g.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={classNames(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-navy-300 hover:bg-navy-800/60 hover:text-white',
                        collapsed && 'justify-center px-0',
                      )}
                    >
                      <Icon size={17} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {!collapsed && (
        <div className="border-t border-navy-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-brand-400" />
            <p className="text-[11px] font-medium text-navy-400 leading-snug">
              Demo build · simulated data
            </p>
          </div>
          <p className="mt-1 font-mono text-[10px] text-navy-500">v0.1.0-frontend</p>
        </div>
      )}
    </nav>
  );
}
