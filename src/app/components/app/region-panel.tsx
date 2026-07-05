"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DivIcon, LayerGroup, Map as LeafletMap } from "leaflet";
import type { HealthStatus, Tier } from "../../lib/data";
import { STATUS_META, TIER_META } from "./status-config";
import {
  buildAllRegionSummary,
  getBubbleRadius,
  getRegionHealthTone,
  formatRegionRatio,
  formatRegionScore,
  REGION_GEO_POINTS,
  REGION_TONE_STYLES,
  type RegionHealthSummary,
  type RegionHealthTone,
} from "./region-config";

export function RegionHealthPanel({
  summaries,
  selectedRegion,
  onSelectRegion,
  hasSnapshot,
}: {
  summaries: RegionHealthSummary[];
  selectedRegion: string;
  onSelectRegion: (regionKey: string) => void;
  hasSnapshot: boolean;
}) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const totalRegions = summaries.length;
  const selectedSummary = summaries.find((summary) => summary.regionKey === selectedRegion) ?? null;
  const activeSummary = selectedSummary ?? summaries.find((summary) => summary.regionKey === hoveredRegion) ?? null;
  const allSummary = useMemo(() => buildAllRegionSummary(summaries), [summaries]);
  const detailSummary = activeSummary ?? allSummary;

  return (
    <section className="mb-8 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Kota / Region Health</p>
          <h3 className="font-semibold text-[16px] text-[var(--slate)]">Peta health source kajian</h3>
          <p className="mt-1 max-w-[700px] text-[12.5px] leading-relaxed text-[var(--g700)]">
            Bubble menunjukkan jumlah source per kota/region. Warna menunjukkan kondisi health; klik/tap bubble untuk memfilter daftar source di bawah.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--g300)] bg-[var(--ivory)] px-3 py-2 text-right">
          <div className="font-display text-[24px] leading-none text-[var(--slate)]">{totalRegions}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g500)]">region</div>
        </div>
      </div>

      {!hasSnapshot && summaries.length > 0 && (
        <div className="mb-4 rounded-lg border border-dashed border-[var(--g300)] bg-[var(--g100)] px-4 py-3 text-[12.5px] text-[var(--g700)]">
          Belum ada snapshot health. Region ditampilkan sebagai unmonitored.
        </div>
      )}

      {summaries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--g300)] bg-[var(--g100)] px-4 py-3 text-[12.5px] text-[var(--g700)]">
          Belum ada source untuk dirangkum.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-xl border border-[var(--g300)] bg-[var(--ivory)] p-4">
            <LeafletRegionMap
              summaries={summaries}
              selectedRegion={selectedRegion}
              onSelectRegion={onSelectRegion}
              onHoverRegion={setHoveredRegion}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--g600)]">
              <div className="flex flex-wrap items-center gap-3">
                <LegendDot tone="healthy" />
                <LegendDot tone="risk" />
                <LegendDot tone="unknown" />
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g500)]">
                <span>Size = jumlah source</span>
                <span className="inline-block size-3 rounded-full bg-[var(--g300)]" />
                <span className="inline-block size-5 rounded-full bg-[var(--g300)]" />
                <span className="inline-block size-7 rounded-full bg-[var(--g300)]" />
              </div>
            </div>
          </div>

          <RegionSummaryPanel
            summary={detailSummary}
            selected={Boolean(selectedSummary)}
            onClear={() => onSelectRegion("all")}
          />
        </div>
      )}
    </section>
  );
}

function LeafletRegionMap({
  summaries,
  selectedRegion,
  onSelectRegion,
  onHoverRegion,
}: {
  summaries: RegionHealthSummary[];
  selectedRegion: string;
  onSelectRegion: (regionKey: string) => void;
  onHoverRegion: (regionKey: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let tileFallbackTimer: number | null = null;

    async function initMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const mapContainer = containerRef.current;
      const map = L.map(mapContainer, {
        // Centered on the Java cluster — most region points sit on/around
        // Java, so the initial frame already shows the densest cluster
        // before fitBounds refines it. Tighter than the old [−5.5, 110.5]/z5
        // view so points read clearly without waiting for fitBounds.
        center: [-6.9, 110.5],
        zoom: 6,
        minZoom: 4,
        maxZoom: 10,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      const markTilesReady = () => {
        if (tileFallbackTimer) {
          window.clearTimeout(tileFallbackTimer);
          tileFallbackTimer = null;
        }
        setTilesReady(true);
      };

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      })
        .on("loading", () => {
          setTilesReady(false);
          if (tileFallbackTimer) window.clearTimeout(tileFallbackTimer);
          tileFallbackTimer = window.setTimeout(markTilesReady, 3_000);
        })
        .on("load", markTilesReady)
        .addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const refreshSize = () => {
        map.invalidateSize({ pan: false });
      };
      requestAnimationFrame(refreshSize);
      window.setTimeout(refreshSize, 150);
      resizeObserver = new ResizeObserver(refreshSize);
      resizeObserver.observe(mapContainer);

      setMapReady(true);
      tileFallbackTimer = window.setTimeout(markTilesReady, 3_000);
    }

    initMap();

    return () => {
      cancelled = true;
      if (tileFallbackTimer) window.clearTimeout(tileFallbackTimer);
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderMarkers() {
      const L = await import("leaflet");
      if (cancelled || !mapReady || !mapRef.current || !markerLayerRef.current) return;

      markerLayerRef.current.clearLayers();
      const mapSummaries = summaries.filter((summary) => summary.regionKey !== "nasional");

      for (const summary of mapSummaries) {
        const point = REGION_GEO_POINTS[summary.regionKey] ?? REGION_GEO_POINTS.unknown;
        const tone = getRegionHealthTone(summary);
        const style = REGION_TONE_STYLES[tone];
        const selected = selectedRegion === summary.regionKey;
        const size = Math.max(24, getBubbleRadius(summary.total) * 2);
        const icon = createRegionDivIcon(L, summary, size, style, selected);

        const marker = L.marker([point.lat, point.lng], {
          icon,
          keyboard: true,
          zIndexOffset: selected ? 1000 : 0,
        })
          .bindTooltip(getRegionTooltipHtml(summary), {
            direction: "top",
            offset: [0, -Math.round(size / 2)],
            opacity: 0.98,
            className: "region-leaflet-tooltip",
          })
          .on("click", () => onSelectRegion(summary.regionKey))
          .on("mouseover", () => onHoverRegion(summary.regionKey))
          .on("mouseout", () => onHoverRegion(null))
          .on("focus", () => onHoverRegion(summary.regionKey))
          .on("blur", () => onHoverRegion(null));

        marker.addTo(markerLayerRef.current);
      }

      mapRef.current.invalidateSize({ pan: false });

      const selectedSummary = mapSummaries.find((summary) => summary.regionKey === selectedRegion);
      if (selectedSummary) {
        const point = REGION_GEO_POINTS[selectedSummary.regionKey] ?? REGION_GEO_POINTS.unknown;
        window.setTimeout(() => mapRef.current?.flyTo([point.lat, point.lng], 8, { duration: 0.45 }), 0);
      } else if (mapSummaries.length > 0) {
        const bounds = L.latLngBounds(mapSummaries.map((summary) => {
          const point = REGION_GEO_POINTS[summary.regionKey] ?? REGION_GEO_POINTS.unknown;
          return [point.lat, point.lng];
        }));
        // Tighter fit: maxZoom 8 (up from 6) + padding [20,20] (down from
        // [28,28]) keeps the Java cluster framed so all bubble points stay
        // visible without being shrunk to dots. minZoom/fitBounds together
        // ensure the box is filled rather than letterboxed.
        window.setTimeout(() => mapRef.current?.fitBounds(bounds, { padding: [20, 20], maxZoom: 8 }), 0);
      }
    }

    renderMarkers();

    return () => {
      cancelled = true;
    };
  }, [mapReady, summaries, selectedRegion, onSelectRegion, onHoverRegion]);

  return (
    <div className="region-leaflet-shell relative isolate overflow-hidden rounded-lg border border-[var(--g300)] bg-[var(--g100)]">
      <div ref={containerRef} className="h-[280px] w-full sm:h-[340px]" aria-label="Peta Leaflet health source kajian per region Indonesia" />
      {(!mapReady || !tilesReady) && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[var(--paper)]/80 backdrop-blur-[1px]">
          <div className="rounded-full border border-[var(--g300)] bg-[var(--ivory)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--g600)] shadow-sm">
            Loading map…
          </div>
        </div>
      )}
    </div>
  );
}

function createRegionDivIcon(
  L: typeof import("leaflet"),
  summary: RegionHealthSummary,
  size: number,
  style: { fill: string; stroke: string; text: string; label: string },
  selected: boolean,
): DivIcon {
  const aggregate = summary.regionKey === "nasional" ? '<em class="region-leaflet-aggregate">aggregate</em>' : "";
  return L.divIcon({
    className: "region-leaflet-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="region-leaflet-marker${selected ? " is-selected" : ""}" style="--marker-size:${size}px;--marker-fill:${style.fill};--marker-stroke:${selected ? "var(--slate)" : style.stroke};">
        <span>${summary.total}</span>
        ${aggregate}
      </div>
    `,
  });
}

function getRegionTooltipHtml(summary: RegionHealthSummary): string {
  const m = STATUS_META;
  return `
    <strong>${summary.regionLabel}</strong>
    <span>${summary.total} source · ${summary.monitored} dipantau</span>
    <span>${m.active.label} ${summary.active} · ${m.dead.label} ${summary.dead} · ${m.unmonitored.label} ${summary.unmonitored}</span>
    <span>Skor ${formatRegionScore(summary)} · ${formatRegionRatio(summary)}</span>
  `;
}

function LegendDot({ tone }: { tone: RegionHealthTone }) {
  const style = REGION_TONE_STYLES[tone];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g600)]">
      <span className="size-2.5 rounded-full" style={{ background: style.fill, border: `1px solid ${style.stroke}` }} />
      {style.text}
    </span>
  );
}

function RegionSummaryPanel({
  summary,
  selected,
  onClear,
}: {
  summary: RegionHealthSummary;
  selected: boolean;
  onClear: () => void;
}) {
  const tone = getRegionHealthTone(summary);
  const style = REGION_TONE_STYLES[tone];
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Operational status — always visible. Order = priority for the reader:
  // aktif → kurang → tidak aktif → terbatas → gagal dicek.
  const operationalRows: Array<{ status: HealthStatus; value: number }> = [
    { status: "active", value: summary.active },
    { status: "stale", value: summary.stale },
    { status: "dead", value: summary.dead },
    { status: "blocked", value: summary.blocked },
    { status: "error", value: summary.error },
  ];

  // Coverage — the "Belum dipantau" row. Kept separate from operational
  // because unmonitored ≠ failure: it means no checker exists yet for that
  // platform. Showing it under operational status would imply the source
  // is broken, when really we just haven't measured it.
  const coverageRows: Array<{ status: HealthStatus; value: number }> = [
    { status: "unmonitored", value: summary.unmonitored },
  ];

  // Confidence tier — the graded-quality dimension. Parallel to status
  // but answers a different question ("seberapa andal sinyal datanya?")
  const tierRows: Array<{ tier: Tier; value: number }> = [
    { tier: "high", value: summary.tierHigh },
    { tier: "mid", value: summary.tierMid },
    { tier: "low", value: summary.tierLow },
    { tier: "no-data", value: summary.tierNoData },
  ];

  return (
    <aside className="rounded-xl border border-[var(--g300)] bg-[var(--ivory)] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">{selected ? "Region terpilih" : "Semua region"}</p>
          <h4 className="font-semibold text-[17px] text-[var(--slate)]">{summary.regionLabel}</h4>
          <p className="mt-1 font-mono text-[11px] text-[var(--g500)]">
            {summary.total} source · {summary.monitored} dipantau
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white" style={{ background: style.fill }}>
          {tone === "risk" ? "Perlu perhatian" : style.label}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--g500)]">Skor rata-rata</div>
          <div className="mt-1 font-display text-[26px] leading-none text-[var(--slate)]">{formatRegionScore(summary)}</div>
        </div>
        <div className="rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--g500)]">Rasio aktif</div>
          <div className="mt-1 font-display text-[26px] leading-none text-[var(--slate)]">{formatRegionRatio(summary).replace(" aktif", "")}</div>
        </div>
      </div>

      {/* Status operasional — primary hierarchy, always visible */}
      <div className="mb-3">
        <p className="eyebrow mb-2 !text-[9.5px]">Status operasional</p>
        <div className="space-y-2 font-mono text-[11px] text-[var(--g600)]">
          {operationalRows.map((row) => (
            <StatusCount key={row.status} status={row.status} value={row.value} />
          ))}
        </div>
      </div>

      {/* Coverage + Tier — secondary. On mobile they collapse into an
          accordion so the panel stays compact; on ≥sm they stay open. */}
      <div className="border-t border-[var(--g300)] pt-3">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
          className="sm:hidden flex w-full items-center justify-between rounded-md px-1 py-1 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g600)] hover:bg-[var(--g100)]"
        >
          <span>Cakupan & tier konfidensial</span>
          <span className={`transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`} aria-hidden>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <div className={`${detailsOpen ? "block" : "hidden"} sm:block`}>
          <div className="mb-3 mt-2 sm:mt-0">
            <p className="eyebrow mb-2 !text-[9.5px]">Cakupan platform</p>
            <div className="space-y-2 font-mono text-[11px] text-[var(--g600)]">
              {coverageRows.map((row) => (
                <StatusCount key={row.status} status={row.status} value={row.value} />
              ))}
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--g500)]">
              &ldquo;Belum dipantau&rdquo; berarti platform ini belum punya checker, bukan berarti sumbernya rusak.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-2 !text-[9.5px]">Tier konfidensial</p>
            <div className="space-y-2 font-mono text-[11px] text-[var(--g600)]">
              {tierRows.map((row) => (
                <TierCount key={row.tier} tier={row.tier} value={row.value} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 w-full rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2 text-[12px] font-medium text-[var(--slate)] transition-colors hover:border-[var(--g500)]"
        >
          Hapus filter region
        </button>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--g300)] bg-[var(--paper)] px-3 py-2 text-[12px] leading-relaxed text-[var(--g600)]">
          Pilih bubble kota/region untuk memfilter daftar source. Detail ini tetap muncul di mobile tanpa bergantung pada hover.
        </p>
      )}
    </aside>
  );
}

function StatusCount({ status, value }: { status: HealthStatus; value: number }) {
  const meta = STATUS_META[status];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      <span className="font-semibold text-[var(--slate)]">{value}</span>
    </div>
  );
}

function TierCount({ tier, value }: { tier: Tier; value: number }) {
  const meta = TIER_META[tier];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-3 rounded-full" style={{ background: meta.bar }} />
        {meta.label}
      </span>
      <span className="font-semibold text-[var(--slate)]">{value}</span>
    </div>
  );
}
