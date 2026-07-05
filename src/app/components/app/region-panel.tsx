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
  getRegionLabel,
  INTERNATIONAL_REGION_KEYS,
  REGION_GEO_POINTS,
  REGION_TONE_STYLES,
  warnMissingGeoPoints,
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

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    warnMissingGeoPoints(summaries.map((s) => s.regionKey));
  }, [summaries]);
  const selectedSummary = summaries.find((summary) => summary.regionKey === selectedRegion) ?? null;
  const activeSummary = selectedSummary ?? summaries.find((summary) => summary.regionKey === hoveredRegion) ?? null;
  const allSummary = useMemo(() => buildAllRegionSummary(summaries), [summaries]);
  const detailSummary = activeSummary ?? allSummary;
  const internationalRegionLabels = summaries
    .filter((summary) => INTERNATIONAL_REGION_KEYS.has(summary.regionKey))
    .map((summary) => getRegionLabel(summary.regionKey));

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
        <div className="space-y-4">
          {/* Map: full width */}
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
            {internationalRegionLabels.length > 0 && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g500)]">
                Default peta fokus Indonesia. Region internasional: {internationalRegionLabels.join(", ")}.
              </p>
            )}
          </div>

          {/* Legend panel: below map, full width, 3 blocks */}
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
        center: [-6.9, 110.5],
        zoom: 7,
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
        window.setTimeout(() => mapRef.current?.flyTo([point.lat, point.lng], 7, { duration: 0.45 }), 0);
      } else if (mapSummaries.length > 0) {
        const indonesiaSummaries = mapSummaries.filter((summary) => {
          const point = REGION_GEO_POINTS[summary.regionKey];
          return point != null && !INTERNATIONAL_REGION_KEYS.has(summary.regionKey) && summary.regionKey !== "unknown";
        });
        const boundsSummaries = indonesiaSummaries.length > 0 ? indonesiaSummaries : mapSummaries;
        const bounds = L.latLngBounds(boundsSummaries.map((summary) => {
          const point = REGION_GEO_POINTS[summary.regionKey] ?? REGION_GEO_POINTS.unknown;
          return [point.lat, point.lng];
        }));
        window.setTimeout(() => mapRef.current?.fitBounds(bounds, { padding: [36, 36], maxZoom: 6 }), 0);
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

  const operationalRows: Array<{ status: HealthStatus; value: number }> = [
    { status: "active", value: summary.active },
    { status: "stale", value: summary.stale },
    { status: "dead", value: summary.dead },
    { status: "blocked", value: summary.blocked },
    { status: "error", value: summary.error },
  ];

  const tierRows: Array<{ tier: Tier; value: number }> = [
    { tier: "high", value: summary.tierHigh },
    { tier: "mid", value: summary.tierMid },
    { tier: "low", value: summary.tierLow },
    { tier: "no-data", value: summary.tierNoData },
  ];

  return (
    <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4 border-b border-[var(--g200)]">
        <div>
          <p className="eyebrow mb-1">{selected ? "Region terpilih" : "Semua region"}</p>
          <h4 className="font-semibold text-[17px] text-[var(--slate)]">{summary.regionLabel}</h4>
          <p className="mt-0.5 font-mono text-[11px] text-[var(--g500)]">
            {summary.total} source · {summary.monitored} dipantau
          </p>
        </div>
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white"
          style={{ background: style.fill }}
        >
          {tone === "risk" ? "Perlu perhatian" : style.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="flex flex-wrap gap-7 py-4 border-b border-[var(--g200)]">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--g500)]">Skor rata-rata</div>
          <div className="mt-1 font-display text-[28px] leading-none text-[var(--slate)]">{formatRegionScore(summary)}</div>
        </div>
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--g500)]">Rasio aktif</div>
          <div className="mt-1 font-display text-[28px] leading-none text-[var(--slate)]">{formatRegionRatio(summary).replace(" aktif", "")}</div>
        </div>
      </div>

      {/* 3 legend blocks: horizontal grid matching legend-redesign.html */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[var(--g200)] pt-4">

        {/* Block 1: Status Operasional */}
        <div className="pb-4 sm:pb-0 sm:pr-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g500)] mb-3 flex flex-wrap items-center gap-2">
            Status operasional
            <span className="font-mono text-[10px] text-[var(--clay)]">- hanya yang termonitor</span>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {operationalRows.map((row) => (
              <LegendStatusItem key={row.status} status={row.status} value={row.value} />
            ))}
          </div>
        </div>

        {/* Block 2: Cakupan Platform */}
        <div className="py-4 sm:py-0 sm:px-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g500)] mb-3 flex flex-wrap items-center gap-2">
            Cakupan platform
            <span className="font-mono text-[10px] text-[var(--clay)]">- siapa yang punya checker</span>
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--g700)]">
            <span className="inline-flex items-center gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--jade)] border border-[var(--jade)] rounded px-2 py-0.5 bg-[var(--ivory)]">
                tg
              </span>
              <span className="font-mono text-[12.5px] font-semibold text-[var(--slate)]">{summary.monitored}</span>
              <span>dipantau</span>
            </span>
            <span className="text-[var(--g300)]">|</span>
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {["wa", "ig", "yt", "web"].map((p) => (
                <span
                  key={p}
                  className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--g500)] border border-[var(--g300)] rounded px-2 py-0.5 bg-[var(--ivory)]"
                >
                  {p}
                </span>
              ))}
              <span className="font-mono text-[12.5px] font-semibold text-[var(--slate)] ml-0.5">{summary.unmonitored}</span>
              <span>belum dipantau</span>
            </span>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--g500)]">
            &ldquo;Belum dipantau&rdquo; berarti platform ini belum punya checker, bukan berarti sumbernya rusak.
          </p>
        </div>

        {/* Block 3: Tier Konfidensial */}
        <div className="pt-4 sm:pt-0 sm:pl-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g500)] mb-3 flex flex-wrap items-center gap-2">
            Tier konfidensial
            <span className="font-mono text-[10px] text-[var(--clay)]">- konsisten dgn confidence_score</span>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {tierRows.map((row) => (
              <LegendTierItem key={row.tier} tier={row.tier} value={row.value} />
            ))}
          </div>
        </div>
      </div>

      {selected ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 w-full rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2 text-[12px] font-medium text-[var(--slate)] transition-colors hover:border-[var(--g500)]"
        >
          Hapus filter region
        </button>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed border-[var(--g300)] bg-[var(--paper)] px-3 py-2 text-[12px] leading-relaxed text-[var(--g600)]">
          Pilih bubble kota/region untuk memfilter daftar source. Detail ini tetap muncul di mobile tanpa bergantung pada hover.
        </p>
      )}
    </div>
  );
}

function LegendStatusItem({ status, value }: { status: HealthStatus; value: number }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--g700)]">
      <span className={`size-2.5 shrink-0 rounded-full ${meta.dot}`} />
      {meta.label}
      <span className="font-mono text-[12.5px] font-semibold text-[var(--slate)] ml-0.5">{value}</span>
    </span>
  );
}

function LegendTierItem({ tier, value }: { tier: Tier; value: number }) {
  const meta = TIER_META[tier];
  return (
    <span className="inline-flex items-center gap-2 text-[13.5px] text-[var(--g700)]">
      <span className="w-1 h-[22px] shrink-0 rounded-sm" style={{ background: meta.bar }} />
      <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--g700)]">{meta.label}</span>
      <span className="font-mono text-[10.5px] text-[var(--g500)]">{meta.threshold}</span>
      <span className="font-mono text-[13px] font-semibold text-[var(--slate)] ml-1">{value}</span>
    </span>
  );
}
