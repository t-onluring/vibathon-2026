"use client";

import { useState } from "react";

const REPO = "t-onluring/vibathon-2026";
const WORKFLOW_FILE = "health-check.yml";
const ACTIONS_URL = `https://github.com/${REPO}/actions/workflows/${WORKFLOW_FILE}`;
const YAML_EDIT_URL = `https://github.com/${REPO}/edit/main/.github/workflows/${WORKFLOW_FILE}`;
const DISPATCH_URL = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
const PAT_STORAGE_KEY = "kajian.gh_pat";
const SCHED_STORAGE_KEY = "kajian.cron_schedule_wib";

type Mode = "manual" | "automatic";
type DispatchStatus = "idle" | "loading" | "ok" | "err";

export function CronPanel({ lastRunAt }: { lastRunAt: string | null }) {
  const [mode, setMode] = useState<Mode>("manual");

  // Hydrate PAT from localStorage with lazy initializer (SSR-safe, no useEffect)
  const [pat, setPat] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(PAT_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  const [savePat, setSavePat] = useState(false);
  const [showPatField, setShowPatField] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<DispatchStatus>("idle");
  const [dispatchMsg, setDispatchMsg] = useState<string>("");

  // Schedule editor (WIB) — hydrate from localStorage with lazy initializer
  const [hourWib, setHourWib] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const sched = localStorage.getItem(SCHED_STORAGE_KEY);
      if (sched) {
        const [h] = sched.split(":").map(Number);
        if (Number.isFinite(h)) return h;
      }
    } catch {
      /* ignore */
    }
    return 0;
  });

  const [minuteWib, setMinuteWib] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const sched = localStorage.getItem(SCHED_STORAGE_KEY);
      if (sched) {
        const [, m] = sched.split(":").map(Number);
        if (Number.isFinite(m)) return m;
      }
    } catch {
      /* ignore */
    }
    return 1;
  });

  const [copied, setCopied] = useState(false);

  const cronUtc = wibToCronUtc(hourWib, minuteWib);

  async function triggerDispatch() {
    if (!pat) {
      setDispatchStatus("err");
      setDispatchMsg("Token kosong. Generate PAT dulu di GitHub Settings.");
      return;
    }
    setDispatchStatus("loading");
    setDispatchMsg("");
    try {
      const res = await fetch(DISPATCH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ ref: "main" }),
      });
      if (res.status === 204) {
        setDispatchStatus("ok");
        setDispatchMsg("Workflow dipicu. Cek progress di GitHub Actions tab.");
        if (savePat) {
          try {
            localStorage.setItem(PAT_STORAGE_KEY, pat);
          } catch {}
        }
      } else {
        const body = await res.text();
        setDispatchStatus("err");
        setDispatchMsg(`HTTP ${res.status}: ${body.slice(0, 160)}`);
      }
    } catch (e) {
      setDispatchStatus("err");
      setDispatchMsg(e instanceof Error ? e.message : String(e));
    }
  }

  function persistSchedule(h: number, m: number) {
    try {
      localStorage.setItem(SCHED_STORAGE_KEY, `${h}:${m}`);
    } catch {}
  }

  async function copyCron() {
    try {
      await navigator.clipboard.writeText(`    - cron: "${cronUtc}"`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5 mb-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="eyebrow !text-[10.5px] mb-2">Cron Trigger</p>
          <h3 className="font-serif text-[20px] text-[var(--slate)]">
            Health check on demand or on schedule
          </h3>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10.5px] text-[var(--g500)] uppercase">last run</div>
          <div className="text-[13px] text-[var(--g700)]">
            {lastRunAt ? formatWib(lastRunAt) : "—"}
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex rounded-full border border-[var(--g300)] p-0.5 mb-5">
        <ModeBtn active={mode === "manual"} onClick={() => setMode("manual")}>
          Manual
        </ModeBtn>
        <ModeBtn active={mode === "automatic"} onClick={() => setMode("automatic")}>
          Automatic (custom jam)
        </ModeBtn>
      </div>

      {mode === "manual" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={ACTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--slate)] px-4 py-2 text-[13px] font-medium text-[var(--ivory)] hover:bg-[var(--g700)] transition"
            >
              ▶ Trigger via GitHub UI
              <span className="text-[var(--g300)]">↗</span>
            </a>
            <button
              type="button"
              onClick={() => setShowPatField((v) => !v)}
              className="text-[13px] text-[var(--g700)] hover:text-[var(--clay)] underline decoration-[var(--oat)] underline-offset-4"
            >
              {showPatField ? "Hide instant trigger" : "Or trigger instantly with PAT →"}
            </button>
          </div>

          {showPatField && (
            <div className="rounded-md border border-dashed border-[var(--g300)] bg-[var(--g100)] p-4 space-y-3">
              <p className="text-[12.5px] text-[var(--g700)] leading-relaxed">
                Buat <strong>fine-grained PAT</strong> di{" "}
                <a
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--clay)] underline decoration-[var(--oat)]"
                >
                  GitHub Settings
                </a>{" "}
                — scope: <code className="bg-[var(--paper)] px-1 rounded">Actions: Read &amp; Write</code> di repo <code>{REPO}</code>.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="password"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="github_pat_..."
                  className="flex-1 min-w-[260px] rounded-md border border-[var(--g300)] bg-[var(--paper)] px-3 py-2 text-[13px] font-mono"
                />
                <button
                  type="button"
                  onClick={triggerDispatch}
                  disabled={dispatchStatus === "loading"}
                  className="rounded-md bg-[var(--clay)] px-4 py-2 text-[13px] font-medium text-[var(--paper)] hover:bg-[var(--clay-d)] disabled:opacity-50 transition"
                >
                  {dispatchStatus === "loading" ? "Triggering..." : "Trigger now"}
                </button>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-[var(--g500)]">
                <input
                  type="checkbox"
                  checked={savePat}
                  onChange={(e) => setSavePat(e.target.checked)}
                />
                Simpan token di browser (localStorage). Jangan centang di komputer publik.
              </label>
              {dispatchStatus !== "idle" && dispatchMsg && (
                <p
                  className={`text-[12.5px] mt-2 ${
                    dispatchStatus === "ok" ? "text-[var(--olive)]" : "text-[var(--clay-d)]"
                  }`}
                >
                  {dispatchMsg}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--g700)]">
            Pilih jam (WIB) untuk daily run. Cron expression akan ter-generate dalam UTC. Salin ke{" "}
            <code className="bg-[var(--g100)] px-1 rounded text-[12px]">
              .github/workflows/{WORKFLOW_FILE}
            </code>{" "}
            lalu push.
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <NumberPicker
              label="Hour (WIB)"
              value={hourWib}
              max={23}
              onChange={(v) => {
                setHourWib(v);
                persistSchedule(v, minuteWib);
              }}
            />
            <NumberPicker
              label="Minute"
              value={minuteWib}
              max={59}
              onChange={(v) => {
                setMinuteWib(v);
                persistSchedule(hourWib, v);
              }}
            />
            <div className="flex-1 min-w-[200px]">
              <div className="font-mono text-[10.5px] text-[var(--g500)] uppercase mb-1">
                Generated cron (UTC)
              </div>
              <code className="block bg-[var(--slate)] text-[var(--ivory)] px-3 py-2 rounded-md text-[13px]">
                - cron: &quot;{cronUtc}&quot;
              </code>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyCron}
              className="rounded-md bg-[var(--clay)] px-4 py-2 text-[13px] font-medium text-[var(--paper)] hover:bg-[var(--clay-d)] transition"
            >
              {copied ? "✓ Copied" : "Copy cron line"}
            </button>
            <a
              href={YAML_EDIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[var(--g300)] bg-[var(--paper)] px-4 py-2 text-[13px] font-medium text-[var(--g700)] hover:border-[var(--slate)] transition"
            >
              Edit YAML on GitHub ↗
            </a>
            <a
              href={ACTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[var(--g300)] bg-[var(--paper)] px-4 py-2 text-[13px] font-medium text-[var(--g700)] hover:border-[var(--slate)] transition"
            >
              View runs ↗
            </a>
          </div>

          <p className="text-[11.5px] text-[var(--g500)] italic mt-2">
            Catatan: GitHub Actions cron didefinisikan di YAML (commit-time), bukan runtime.
            UI ini bantu generate cron expression — perlu push ulang YAML untuk apply schedule baru.
          </p>
        </div>
      )}
    </section>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-1.5 rounded-full text-[12.5px] font-medium transition",
        active
          ? "bg-[var(--slate)] text-[var(--ivory)]"
          : "text-[var(--g700)] hover:text-[var(--slate)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function NumberPicker({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10.5px] text-[var(--g500)] uppercase">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(0, v)));
        }}
        className="w-20 rounded-md border border-[var(--g300)] bg-[var(--paper)] px-3 py-2 text-[14px] font-mono text-center"
      />
    </label>
  );
}

function wibToCronUtc(hourWib: number, minuteWib: number): string {
  // WIB = UTC+7 → UTC = WIB - 7 (mod 24)
  const utcHour = (hourWib - 7 + 24) % 24;
  return `${minuteWib} ${utcHour} * * *`;
}

function formatWib(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(iso)) + " WIB";
  } catch {
    return iso;
  }
}
