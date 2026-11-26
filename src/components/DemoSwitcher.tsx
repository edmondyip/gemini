import { Link, NavLink } from 'react-router-dom';

export interface DemoSwitcherProps {
  theme: 'dark' | 'light';
  className?: string;
}

const DEMO_LINKS = [
  { to: '/dither', label: 'Dither' },
  { to: '/neon-rain', label: 'Neon Rain' },
  { to: '/pool', label: 'Pool' },
] as const;

export function DemoSwitcher({ theme, className = '' }: DemoSwitcherProps) {
  const isDark = theme === 'dark';

  const containerClass = isDark
    ? 'inline-flex flex-wrap items-center gap-1 bg-[#0a0f1d]/78 backdrop-blur-md border border-white/15 rounded-[4px] px-2.5 py-1.5 font-mono text-xs text-slate-200 shadow-lg'
    : 'inline-flex flex-wrap items-center gap-1 bg-[#FAF7F2]/85 backdrop-blur-md border border-[#1C1917]/12 rounded-[4px] px-2.5 py-1.5 font-mono text-xs text-[#1C1917] shadow-sm';

  const hubClass = isDark
    ? 'text-emerald-400 hover:text-emerald-300 font-medium px-1.5 py-0.5 rounded-[3px] transition-colors whitespace-nowrap shrink-0'
    : 'text-[#15803D] hover:text-[#166534] font-medium px-1.5 py-0.5 rounded-[3px] transition-colors whitespace-nowrap shrink-0';

  const dividerClass = isDark
    ? 'text-white/20 px-0.5 select-none shrink-0'
    : 'text-[#1C1917]/20 px-0.5 select-none shrink-0';

  return (
    <nav
      aria-label="Demo switcher"
      className={`${containerClass} ${className}`.trim()}
    >
      <Link to="/" className={hubClass}>
        ← Hub
      </Link>
      <span className={dividerClass} aria-hidden="true">
        |
      </span>
      {DEMO_LINKS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => {
            if (isActive) {
              return 'bg-[#15803D] text-white px-2 py-0.5 rounded-[3px] font-medium whitespace-nowrap shrink-0';
            }
            return isDark
              ? 'text-slate-300 hover:text-white hover:bg-white/10 px-2 py-0.5 rounded-[3px] transition-colors whitespace-nowrap shrink-0'
              : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#1C1917]/6 px-2 py-0.5 rounded-[3px] transition-colors whitespace-nowrap shrink-0';
          }}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
