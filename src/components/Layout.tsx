import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { STATUS } from '../data/status';

interface LayoutProps {
  children: React.ReactNode;
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
      <header className="sticky top-0 z-30 bg-[#F7F5F0] border-b border-[#DED9CE]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Link
                to="/"
                className="font-mono font-semibold text-base tracking-tight text-[#1C1917] hover:text-[#15803D] transition-colors whitespace-nowrap shrink-0"
              >
                GEMINI LAB
              </Link>
              <span className="font-mono text-sm px-2 py-0.5 bg-white border border-[#DED9CE] text-[#57534E] rounded-[3px] whitespace-nowrap shrink-0">
                SURVIVAL RUN
              </span>
            </div>

            <NavLink
              to="/dither"
              className={({ isActive }) =>
                `md:hidden text-sm font-medium px-2.5 py-1 rounded-[3px] border whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#15803D] text-white border-[#15803D]'
                    : 'bg-white text-[#1C1917] border-[#DED9CE] hover:border-[#A8A29E]'
                }`
              }
            >
              Dither Lab
            </NavLink>
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-x-5 gap-y-2 border-t border-[#DED9CE] pt-2 md:border-t-0 md:pt-0">
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
                className="w-16 sm:w-24 h-[6px] bg-[#E7E3D8] border border-[#DED9CE] rounded-[2px] overflow-hidden shrink-0"
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

            <NavLink
              to="/dither"
              className={({ isActive }) =>
                `hidden md:inline-flex items-center text-sm font-medium pb-0.5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-[#15803D] border-[#15803D]'
                    : 'text-[#1C1917] border-transparent hover:border-[#A8A29E]'
                }`
              }
            >
              Dither Lab
            </NavLink>
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
            <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
              Updated {STATUS.lastUpdated}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              to="/"
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Overview
            </Link>
            <Link
              to="/dither"
              className="hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0"
            >
              Dither &amp; CRT Lab
            </Link>
            <a
              href={STATUS.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
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
