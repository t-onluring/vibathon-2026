"use client";

import { useEffect, useRef, useState } from "react";
import type { LatestSummary, Source } from "../lib/data";

export function Masthead({
  sources,
  latest,
}: {
  sources: Source[];
  latest: LatestSummary | null;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const total = sources.length;
  const active = latest?.by_status.active ?? 0;
  const dead = (latest?.by_status.dead ?? 0) + (latest?.by_status.stale ?? 0);
  const monitored = latest?.monitored ?? sources.filter((s) => s.monitor_status !== "not_yet_monitored").length;

  return (
    <header
      ref={ref}
      className="relative overflow-hidden border-b border-[var(--g300)] bg-[var(--ivory)]"
    >
      {/* Grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(var(--slate) 1px, transparent 1px),
            linear-gradient(90deg, var(--slate) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Decorative accent blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-20 size-[420px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(217,119,87,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1180px] px-8 pt-16 pb-12 sm:pt-20 sm:pb-14">
        {/* Eyebrow */}
        <div
          className="mb-5 flex items-center gap-3 transition-all duration-500"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transitionDelay: "0ms",
          }}
        >
          <span className="eyebrow">Vibathon 2026 · HSI IT Division</span>
        </div>

        {/* Title */}
        <h1
          className="font-serif text-[clamp(34px,5vw,58px)] leading-[1.06] tracking-[-0.018em] text-[var(--slate)] mb-4 max-w-[22ch] transition-all duration-700"
          style={{
            fontWeight: 500,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(14px)",
            transitionDelay: "80ms",
          }}
        >
          Source List{" "}
          <em className="italic text-[var(--clay)]">Kajian Sunnah</em>
          <br />
          Indonesia
        </h1>

        {/* Subtitle */}
        <p
          className="text-[16.5px] text-[var(--g700)] max-w-[600px] leading-relaxed mb-10 transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transitionDelay: "160ms",
          }}
        >
          Open registry sumber kajian dengan automated health monitoring.
          Layer&nbsp;1 infrastructure — bukan kompetitor, tapi{" "}
          <em className="italic">data supplier</em> untuk ekosistem.
        </p>

        {/* Stats row */}
        <div
          className="flex overflow-hidden rounded-xl border border-[var(--g300)] max-w-[540px] transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transitionDelay: "240ms",
          }}
        >
          <StatBlock label="Total" value={total} />
          <StatBlock label="Active" value={active} color="var(--olive)" />
          <StatBlock label="Dead" value={dead} color="var(--g500)" />
          <StatBlock label="Monitored" value={monitored} color="#5B8FB9" />
        </div>
      </div>
    </header>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || value === 0) { setCount(value); return; }
    started.current = true;
    let cur = 0;
    const duration = 700;
    const steps = Math.max(1, value);
    const interval = Math.max(16, Math.floor(duration / steps));
    const timer = setInterval(() => {
      cur += 1;
      setCount(cur);
      if (cur >= value) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex-1 bg-[var(--g100)] px-5 py-4 text-center border-r border-[var(--g300)] last:border-r-0">
      <div
        className="font-mono text-[28px] font-bold leading-none tabular-nums"
        style={{ color: color ?? "var(--slate)" }}
      >
        {count}
      </div>
      <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--g500)]">
        {label}
      </div>
    </div>
  );
}
