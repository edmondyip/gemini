import { Link } from 'react-router-dom';
import { LOGS } from '../data/logs';
import { STATUS } from '../data/status';
import { trackEvent } from '../utils/analytics';

export function LogPage() {
  const entries = [...LOGS].sort((a, b) => b.day - a.day);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Page Header */}
      <header>
        <span className="font-mono text-sm font-medium text-[#15803D]">
          FIELD LOG // BUILD IN PUBLIC
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#1C1917] mt-1 text-balance">
          Daily Field Log
        </h1>
        <p className="text-base text-[#57534E] mt-2 max-w-2xl leading-relaxed">
          Transparent daily accounting, shipped artifacts, distribution
          experiments, and hard lessons across the 30-day $20 survival run.
        </p>
      </header>

      {/* Public Ledger Strip */}
      <section
        aria-label="Public Ledger"
        className="bg-white border border-[#E2DFD7] rounded-[3px] overflow-hidden"
      >
        <div className="px-5 py-2.5 bg-[#FAF9F6] border-b border-[#E2DFD7] flex flex-wrap items-center justify-between gap-2 font-mono text-xs uppercase tracking-wider text-[#57534E]">
          <span>PUBLIC LEDGER — TRANSPARENT ACCOUNTING</span>
          <span className="tabular-nums">UPDATED {STATUS.lastUpdated}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E2DFD7]">
          <div className="p-4 sm:p-5">
            <div className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
              Product Revenue
            </div>
            <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[#1C1917] mt-1">
              ${STATUS.productRevenueUsd.toFixed(2)}
            </div>
            <div className="font-mono text-xs text-[#57534E] mt-0.5">
              Pro Packs
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
              Community Support
            </div>
            <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[#1C1917] mt-1">
              ${STATUS.supportRevenueUsd.toFixed(2)}
            </div>
            <div className="font-mono text-xs text-[#57534E] mt-0.5">
              $1+ Pass
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
              Ad Spend
            </div>
            <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[#1C1917] mt-1">
              ${STATUS.adSpendUsd.toFixed(2)}
            </div>
            <div className="font-mono text-xs text-[#57534E] mt-0.5">
              Organic only
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
              Monthly Target
            </div>
            <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[#1C1917] mt-1">
              ${STATUS.targetUsd.toFixed(2)}
            </div>
            <div className="font-mono text-xs text-[#57534E] mt-0.5">
              Subscription goal
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 sm:p-5">
            <div className="font-mono text-xs uppercase tracking-wider text-[#57534E]">
              Run Clock
            </div>
            <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-[#15803D] mt-1">
              Day {STATUS.day} / {STATUS.totalDays}
            </div>
            <div className="font-mono text-xs text-[#57534E] mt-0.5">
              30-day window
            </div>
          </div>
        </div>
      </section>

      {/* Chronological Editorial Log Cards (Newest First) */}
      <section aria-label="Daily entries" className="space-y-6">
        {entries.map((entry) => (
          <article
            key={entry.day}
            className="bg-white border border-[#E2DFD7] rounded-[3px] overflow-hidden"
          >
            <div className="p-5 sm:p-6 border-b border-[#E2DFD7]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-[#15803D] text-white font-mono text-xs font-medium px-2 py-0.5 rounded-[3px] whitespace-nowrap shrink-0">
                  DAY {String(entry.day).padStart(2, '0')}
                </span>
                <time
                  dateTime={entry.date}
                  className="font-mono text-sm tabular-nums text-[#57534E] whitespace-nowrap shrink-0"
                >
                  {entry.date}
                </time>
                <span className="font-mono text-xs sm:text-sm text-[#57534E] sm:ml-auto">
                  {entry.metrics}
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl text-[#1C1917] mt-3 leading-tight text-balance">
                {entry.title}
              </h2>
              <p className="mt-2 text-base text-[#57534E] leading-relaxed">
                {entry.summary}
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#15803D] mb-3">
                WHAT SHIPPED
              </h3>
              <ul className="space-y-2 text-base text-[#1C1917]">
                {entry.shipped.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="font-mono text-sm text-[#15803D] mt-0.5 shrink-0">
                      +
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E2DFD7] border-t border-[#E2DFD7] bg-[#FAF9F6]">
              <div className="p-5 sm:p-6">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#1C1917] mb-2">
                  HARD LESSON
                </h3>
                <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
                  {entry.lesson}
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#15803D] mb-2">
                  NEXT MOVE
                </h3>
                <p className="text-sm sm:text-base text-[#1C1917] leading-relaxed">
                  {entry.nextMove}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Compact Footer CTA Row */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link
          to="/dither"
          className="inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] text-white px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          Launch Dither &amp; CRT Lab -&gt;
        </Link>
        <a
          href={STATUS.supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent('click_support_pass', { location: 'field_log' })
          }
          className="inline-flex items-center justify-center bg-white border border-[#E2DFD7] hover:border-[#A8A29E] text-[#1C1917] px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          Support Run ($1+)
        </a>
      </div>
    </div>
  );
}
