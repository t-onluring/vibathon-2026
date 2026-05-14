"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RunState = "idle" | "playing" | "done";

type NodeDef = {
  id: string;
  label: string;
  sub?: string;
  xDesktop: number;
  yDesktop: number;
  xMobile: number;
  yMobile: number;
};

type EdgeDef = {
  from: string;
  to: string;
  phase: number;
  accent?: "clay" | "olive";
};

type StepDef = { title: string; detail: string; durationMs: number };

const NODES: NodeDef[] = [
  {
    id: "sources",
    label: "Source Channels",
    sub: "Telegram · Instagram ·\nFacebook · WhatsApp · Web",
    xDesktop: 380,
    yDesktop: 40,
    xMobile: 200,
    yMobile: 40,
  },
  {
    id: "registry",
    label: "Open Registry",
    sub: "Source metadata + health status",
    xDesktop: 380,
    yDesktop: 130,
    xMobile: 200,
    yMobile: 130,
  },
  {
    id: "monitor",
    label: "Reliability Monitoring",
    sub: "Automated freshness scoring",
    xDesktop: 380,
    yDesktop: 220,
    xMobile: 200,
    yMobile: 220,
  },
  {
    id: "dataset",
    label: "Dataset / API Output",
    sub: "latest.json + historical snapshots",
    xDesktop: 380,
    yDesktop: 310,
    xMobile: 200,
    yMobile: 310,
  },
  {
    id: "consumers",
    label: "Aggregator & Consumer Apps",
    sub: "Layer 2 / Layer 3 ecosystem",
    xDesktop: 380,
    yDesktop: 400,
    xMobile: 200,
    yMobile: 400,
  },
];

const EDGES: EdgeDef[] = [
  { from: "sources", to: "registry", phase: 0, accent: "clay" },
  { from: "registry", to: "monitor", phase: 1, accent: "clay" },
  { from: "monitor", to: "dataset", phase: 2, accent: "olive" },
  { from: "dataset", to: "consumers", phase: 3, accent: "olive" },
  { from: "registry", to: "dataset", phase: 4, accent: "olive" },
];

const STEPS: StepDef[] = [
  { title: "Fase A", detail: "Source platforms dikonsolidasikan ke open registry", durationMs: 2000 },
  { title: "Fase B", detail: "Monitoring otomatis menghitung reliability score", durationMs: 2000 },
  { title: "Fase C", detail: "Output menjadi dataset/API untuk ecosystem", durationMs: 2000 },
  { title: "Layering", detail: "Aggregator & consumer app consume data yang sama", durationMs: 2000 },
  { title: "Positioning", detail: "Kita data supplier, bukan kompetitor existing player", durationMs: 2000 },
];

const BOX_W = 220;
const BOX_H = 64;

export function ArchitectureTab() {
  const [runState, setRunState] = useState<RunState>("idle");
  const [phase, setPhase] = useState(-1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timerRefs = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReduced = () => setReducedMotion(mql.matches);
    const updateMobile = () => setIsMobile(window.innerWidth <= 640);

    updateReduced();
    updateMobile();

    mql.addEventListener("change", updateReduced);
    window.addEventListener("resize", updateMobile);

    return () => {
      mql.removeEventListener("change", updateReduced);
      window.removeEventListener("resize", updateMobile);
      clearTimers();
    };
  }, []);

  const phaseText = phase >= 0 ? STEPS[Math.min(phase, STEPS.length - 1)] : null;

  const nodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; label: string; sub?: string }>();
    for (const n of NODES) {
      map.set(n.id, {
        x: isMobile ? n.xMobile : n.xDesktop,
        y: isMobile ? n.yMobile : n.yDesktop,
        label: n.label,
        sub: n.sub,
      });
    }
    return map;
  }, [isMobile]);

  function clearTimers() {
    for (const t of timerRefs.current) window.clearTimeout(t);
    timerRefs.current = [];
  }

  function onPlay() {
    if (runState === "playing") return;

    clearTimers();
    if (reducedMotion) {
      setPhase(STEPS.length - 1);
      setRunState("done");
      return;
    }

    setPhase(-1);
    setRunState("playing");

    let delay = 120;
    for (let i = 0; i < STEPS.length; i++) {
      const timer = window.setTimeout(() => {
        setPhase(i);
        if (i === STEPS.length - 1) setRunState("done");
      }, delay);
      timerRefs.current.push(timer);
      delay += STEPS[i].durationMs;
    }
  }

  function onReset() {
    clearTimers();
    setPhase(-1);
    setRunState("idle");
  }

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-10">
      <section className="mb-6 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-6">
        <p className="eyebrow mb-3">Architecture Story · Layer 1</p>
        <h2 className="font-serif text-[clamp(28px,3.2vw,40px)] leading-tight text-[var(--slate)] max-w-[24ch]">
          Open registry sumber kajian dengan automated reliability monitoring.
        </h2>
        <p className="mt-3 max-w-[840px] text-[14px] text-[var(--g700)] leading-relaxed">
          Layer 1 infrastructure agar siapapun bisa membangun aggregator atau aplikasi konsumen di atasnya.
          <strong className="text-[var(--clay-d)]"> Bukan kompetitor existing player, tapi data supplier.</strong>
        </p>
      </section>

      <section className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5">
        <svg viewBox="0 0 760 470" className="w-full h-auto" role="img" aria-label="Layer 1 architecture flow animation">
          <defs>
            <marker id="arrow-muted" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="8.8" refY="5" orient="auto">
              <path d="M0,0 L0,10 L10,5 z" fill="var(--g300)" />
            </marker>
            <marker id="arrow-clay" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="8.8" refY="5" orient="auto">
              <path d="M0,0 L0,10 L10,5 z" fill="var(--clay)" />
            </marker>
            <marker id="arrow-olive" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="8.8" refY="5" orient="auto">
              <path d="M0,0 L0,10 L10,5 z" fill="var(--olive)" />
            </marker>
          </defs>

          {EDGES.map((edge) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const active = phase >= edge.phase;
            const color = edge.accent === "olive" ? "var(--olive)" : "var(--clay)";

            const fromCenterX = from.x;
            const fromCenterY = from.y + BOX_H / 2;
            const toCenterX = to.x;
            const toCenterY = to.y + BOX_H / 2;

            const vertical = Math.abs(toCenterY - fromCenterY) >= Math.abs(toCenterX - fromCenterX);

            const x1 = vertical ? fromCenterX : fromCenterX + BOX_W / 2 - 14;
            const y1 = vertical ? from.y + BOX_H : fromCenterY;
            const x2 = vertical ? toCenterX : toCenterX - BOX_W / 2 + 14;
            const y2 = vertical ? to.y : toCenterY;

            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={active ? color : "var(--g300)"}
                strokeWidth={active ? 2.5 : 1.8}
                markerEnd={`url(#${active ? (edge.accent === "olive" ? "arrow-olive" : "arrow-clay") : "arrow-muted"})`}
              />
            );
          })}

          {NODES.map((n) => {
            const node = nodeMap.get(n.id);
            if (!node) return null;
            const active = phase >= Math.max(0, NODES.findIndex((x) => x.id === n.id) - 1);
            return (
              <g key={n.id}>
                <rect
                  x={node.x - BOX_W / 2}
                  y={node.y}
                  width={BOX_W}
                  height={BOX_H}
                  rx={10}
                  fill={active ? "var(--ivory)" : "var(--paper)"}
                  stroke={active ? "var(--clay)" : "var(--g300)"}
                  strokeWidth={active ? 2 : 1.5}
                />
                <text x={node.x} y={node.y + 25} textAnchor="middle" className="fill-[var(--slate)]" style={{ fontSize: 13, fontWeight: 600 }}>
                  {node.label}
                </text>
                <text x={node.x} y={node.y + 41} textAnchor="middle" className="fill-[var(--g500)]" style={{ fontSize: 10 }}>
                  {(node.sub ?? "").split("\n").map((line, idx) => (
                    <tspan key={`${n.id}-${idx}`} x={node.x} dy={idx === 0 ? 0 : 12}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-4 rounded-md border border-[var(--g200)] bg-[var(--ivory)] p-3">
          {phaseText ? (
            <p className="text-[13px] text-[var(--g700)]">
              <span className="font-mono text-[11px] text-[var(--clay-d)] mr-2">{phaseText.title}</span>
              {phaseText.detail}
            </p>
          ) : (
            <p className="text-[13px] text-[var(--g500)]">Klik Play untuk mulai narasi arsitektur.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {STEPS.map((s, idx) => (
            <span
              key={s.title}
              className={[
                "rounded-full border px-2.5 py-1 text-[11px] font-mono",
                phase === idx
                  ? "border-[var(--clay)] bg-[var(--clay)]/10 text-[var(--clay-d)]"
                  : phase > idx
                    ? "border-[var(--olive)] bg-[var(--olive)]/10 text-[var(--olive)]"
                    : "border-[var(--g300)] text-[var(--g500)]",
              ].join(" ")}
            >
              {phase > idx ? "✓" : idx + 1} {s.title}
            </span>
          ))}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onPlay}
            disabled={runState === "playing"}
            className="rounded-md bg-[var(--slate)] px-4 py-2 text-[13px] font-medium text-[var(--ivory)] disabled:opacity-50"
          >
            {runState === "playing" ? "Playing..." : runState === "done" ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-[var(--g300)] bg-[var(--paper)] px-4 py-2 text-[13px] font-medium text-[var(--g700)]"
          >
            Reset
          </button>
          {reducedMotion && (
            <span className="text-[11px] text-[var(--g500)]">
              Reduced motion aktif, animasi ditampilkan sebagai state final.
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
