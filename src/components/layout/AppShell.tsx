import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Play, Plus, X, Shield, Info } from 'lucide-react';
import { useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import { findNavItem, Logo, SidebarContent } from './Sidebar';
import { classNames } from '../../utils/geo';

function HeaderBar({
  onToggleSidebar,
  sidebarCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = findNavItem(location.pathname);
  const title = nav?.label ?? 'AQUASCOPE';

  return (
    <header className="app-chrome z-30 flex h-14 shrink-0 items-center gap-3 border-b border-navy-800 bg-navy-950/95 px-4">
      <button
        className="rounded-lg p-2 text-navy-300 hover:bg-navy-800/70 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={19} />
      </button>
      <button
        className="hidden items-center gap-2.5 lg:flex"
        onClick={() => navigate('/home')}
        aria-label="AQUASCOPE home"
      >
        <Logo size={30} />
        <span className="text-[15px] font-extrabold tracking-[0.18em] text-white">
          AQUASCOPE
        </span>
      </button>
      <span className="hidden h-5 w-px bg-navy-800 lg:block" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy-100">{title}</p>
      </div>
      <span className="hidden sm:inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">
        Demo · Simulated data
      </span>
      <button
        className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-navy-700 bg-navy-800 px-3 h-9 text-xs font-semibold text-navy-100 shadow-sm hover:bg-navy-700"
        onClick={() => navigate('/demo')}
      >
        <Play size={13} />
        Demo Mode
      </button>
      <button
        className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-navy-700 bg-navy-800 px-3 h-9 text-xs font-semibold text-navy-100 shadow-sm hover:bg-navy-700"
        onClick={() => navigate('/setup')}
      >
        <Plus size={14} />
        New Analysis
      </button>
      <button
        className={classNames(
          'hidden lg:inline-flex rounded-lg p-2 text-navy-400 hover:bg-navy-800/70 hover:text-white',
          sidebarCollapsed && 'rotate-180',
        )}
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Menu size={17} />
      </button>
    </header>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-navy-950">
      <HeaderBar
        onToggleSidebar={() => setCollapsed((c) => !c)}
        sidebarCollapsed={collapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside
          className={classNames(
            'app-chrome hidden lg:block shrink-0 border-r border-navy-800 bg-navy-950 transition-all duration-300',
            collapsed ? 'w-[68px]' : 'w-[248px]',
          )}
          aria-label="Sidebar"
        >
          <SidebarContent collapsed={collapsed} />
        </aside>

        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-navy-950/60 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-[260px] bg-navy-950 shadow-map lg:hidden"
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'tween', duration: 0.22 }}
              >
                <button
                  className="absolute right-3 top-3 rounded-lg p-2 text-navy-400 hover:bg-navy-800/70 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
                <div className="p-4 pb-0">
                  <div className="flex items-center gap-2.5">
                    <Logo size={30} />
                    <span className="text-sm font-extrabold tracking-[0.18em] text-white">
                      AQUASCOPE
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main viewport */}
        <main className="min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <footer className="border-t border-navy-800 bg-navy-950/95 py-3 text-[11px] text-navy-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">AQUASCOPE</span>
            <span className="text-navy-400">· Satellite-Powered Flood Impact Mapping & Disaster Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/about"
              className="hover:text-navy-300 transition-colors text-[11px]"
              aria-label="About AQUASCOPE"
            >
              About
            </Link>
            <Link
              to="/setup"
              className="hover:text-navy-300 transition-colors text-[11px]"
              aria-label="Setup Analysis"
            >
              Setup
            </Link>
          </div>
        </div>
        <div className="mt-2 sm:mt-0 text-center sm:flex justify-between">
          <span className="text-[10px] copyright">© 2026 AQUASCOPE. All rights reserved.</span>
          <a
            href="/about"
            className="hover:text-navy-300 transition-colors text-[10px]"
            aria-label="Full copyright notice"
          >
            Full notice
          </a>
        </div>
      </footer>
    </div>
  );
}