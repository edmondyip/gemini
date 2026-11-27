import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { STATUS } from '../data/status';
import { trackEvent } from '../utils/analytics';

interface LayoutProps {
  children: ReactNode;
}

const DEMO_MENU_ITEMS = [
  { to: '/dither', label: 'Dither & CRT Lab' },
  { to: '/neon-rain', label: 'Neon Rain HK' },
  { to: '/pool', label: 'Sunlit Pool' },
] as const;

interface DemosDropdownProps {
  variant: 'desktop' | 'mobile';
}

function DemosDropdown({ variant }: DemosDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  const isDemoActive = DEMO_MENU_ITEMS.some(
    (item) => location.pathname === item.to
  );

  // Close dropdown on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const isDesktop = variant === 'desktop';

  return (
    <div
      ref={containerRef}
      className="relative shrink-0"
      onMouseEnter={isDesktop ? () => setOpen(true) : undefined}
      onMouseLeave={isDesktop ? () => setOpen(false) : undefined}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={
          isDesktop
            ? `inline-flex items-center text-sm font-medium pb-0.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isDemoActive || open
                  ? 'text-[#15803D] border-[#15803D]'
                  : 'text-[#1C1917] border-transparent hover:border-[#A8A29E]'
              }`
            : `text-sm font-medium px-2.5 py-1 rounded-[3px] border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isDemoActive || open
                  ? 'bg-[#15803D] text-white border-[#15803D]'
                  : 'bg-white text-[#1C1917] border-[#E2DFD7] hover:border-[#A8A29E]'
              }`
        }
      >
        Demos ▾
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute ${
            isDesktop ? 'left-0' : 'right-0'
          } top-full pt-1.5 z-40`}
        >
          <div className="min-w-[180px] bg-white border border-[#DED9CE] rounded-[4px] py-1 shadow-lg">
            {DEMO_MENU_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#E6F4EE] text-[#15803D]'
                      : 'text-[#1C1917] hover:bg-[#F7F5F0] hover:text-[#15803D]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const dayStr = String(STATUS.day).padStart(2, '0');
  const totalDaysStr = String(STATUS.totalDays).padStart(2, '0');
  const revenueStr = STATUS.revenueUsd.toFixed(2);
  const targetStr = STATUS.targetUsd.toFixed(2);
  const progressPct = Math.max(
    0,
    Math.min(100, (STATUS.revenueUsd / STATUS.targetUsd) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#1C1917]">
      <header className="sticky top-0 z-30 bg-[#F7F5F0] border-b border-[#E2DFD7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Link
                to="/"
                className="font-mono font-semibold text-base tracking-tight text-[#1C1917] hover:text-[#15803D] transition-colors whitespace-nowrap shrink-0"
              >
                GEMINI LAB
              </Link>
              <span className="font-mono text-sm px-2 py-0.5 bg-white border border-[#E2DFD7] text-[#57534E] rounded-[3px] whitespace-nowrap shrink-0">
                SURVIVAL RUN
              </span>
            </div>

            <nav
              aria-label="Primary mobile"
              className="flex md:hidden items-center gap-1.5 flex-wrap"
            >
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `text-sm font-medium px-2.5 py-1 rounded-[3px] border whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#15803D] text-white border-[#15803D]'
                      : 'bg-white text-[#1C1917] border-[#E2DFD7] hover:border-[#A8A29E]'
                  }`
                }
              >
                Hub
              </NavLink>
              <DemosDropdown variant="mobile" />
              <NavLink
                to="/log"
                className={({ isActive }) =>
                  `text-sm font-medium px-2.5 py-1 rounded-[3px] border whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[#15803D] text-white border-[#15803D]'
                      : 'bg-white text-[#1C1917] border-[#E2DFD7] hover:border-[#A8A29E]'
                  }`
                }
              >
                Log
              </NavLink>
              <a
                href={STATUS.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent('click_support_pass', { location: 'header_mobile' })
                }
                className="text-sm font-medium px-2.5 py-1 rounded-[3px] border bg-white text-[#1C1917] border-[#E2DFD7] hover:border-[#A8A29E] whitespace-nowrap shrink-0 transition-colors"
              >
                Support
              </a>
            </nav>
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-x-5 gap-y-2 border-t border-[#E2DFD7] pt-2 md:border-t-0 md:pt-0">
            <div className="font-mono text-sm tabular-nums text-[#1C1917] whitespace-nowrap shrink-0">
              <span className="text-[#57534E] mr-1.5">DAY</span>
              <span className="font-semibold">
                {dayStr} / {totalDaysStr}
              </span>
            </div>

            <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
              <span className="font-mono text-sm tabular-nums text-[#1C1917] whitespace-nowrap shrink-0">
                <span className="text-[#57534E] mr-1.5">REVENUE</span>
                <span className="font-semibold">
                  ${revenueStr} / ${targetStr}
                </span>
              </span>
              <div
                className="w-16 sm:w-24 h-[6px] bg-[#E7E3D8] border border-[#E2DFD7] rounded-[2px] overflow-hidden shrink-0"
                role="progressbar"
                aria-valuenow={STATUS.revenueUsd}
                aria-valuemin={0}
                aria-valuemax={STATUS.targetUsd}
                aria-label="Monthly survival revenue progress"
              >
                <div
                  className="h-full bg-[#15803D]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <nav aria-label="Primary desktop" className="hidden md:flex items-center gap-4">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `inline-flex items-center text-sm font-medium pb-0.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#15803D] border-[#15803D]'
                      : 'text-[#1C1917] border-transparent hover:border-[#A8A29E]'
                  }`
                }
              >
                Hub
              </NavLink>
              <DemosDropdown variant="desktop" />
              <NavLink
                to="/log"
                className={({ isActive }) =>
                  `inline-flex items-center text-sm font-medium pb-0.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#15803D] border-[#15803D]'
                      : 'text-[#1C1917] border-transparent hover:border-[#A8A29E]'
                  }`
                }
              >
                Log
              </NavLink>
              <a
                href={STATUS.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent('click_support_pass', { location: 'header' })
                }
                className="inline-flex items-center text-sm font-medium pb-0.5 border-b-2 border-transparent text-[#1C1917] hover:border-[#A8A29E] transition-colors whitespace-nowrap shrink-0"
              >
                Support
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-[#DED9CE] bg-[#F7F5F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-[#57534E]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-[#1C1917] whitespace-nowrap shrink-0">
              gemini.256pages.com
            </span>
            <span className="whitespace-nowrap shrink-0">
              © 2026 Edmond Yip · Built with Gemini (AI Experiment)
            </span>
            <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
              Updated {STATUS.lastUpdated}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              to="/"
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Hub
            </Link>
            <Link
              to="/pool"
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Sunlit Pool
            </Link>
            <Link
              to="/neon-rain"
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Neon Rain
            </Link>
            <Link
              to="/dither"
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Dither &amp; CRT Lab
            </Link>
            <Link
              to="/log"
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Field Log
            </Link>
            <a
              href={STATUS.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent('click_support_pass', { location: 'footer' })
              }
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Back Gemini ($1+)
            </a>
            <a
              href={STATUS.rivalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Also in this 30-day run: ChatGPT Lab
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
