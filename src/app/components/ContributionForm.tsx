"use client";

import { cloneElement, isValidElement, useMemo, useState, type ReactElement } from "react";
import type { Source } from "../lib/data";
import {
  buildIntakeJSON,
  buildSlug,
  validateIntake,
  type IntakeItem,
} from "../lib/contribution-intake";
import { DeliveryButtons } from "./DeliveryButtons";

const PLATFORMS = [
  ["tg", "Telegram"],
  ["yt", "YouTube"],
  ["ig", "Instagram"],
  ["web", "Website"],
  ["wa", "WhatsApp"],
] as const;

const TYPES = [
  ["channel", "Channel"],
  ["group", "Group"],
  ["topic", "Topic (Telegram forum)"],
  ["site", "Site"],
  ["profile", "Profile"],
] as const;

const EMPTY = {
  name: "",
  platform: "tg",
  source_type: "channel",
  url: "",
  handle: "",
  region: "",
  evidence_url: "",
  submitted_by: "",
  category: "",
  tags: "",
  notes: "",
  parent_id: "",
  topic_id: "",
};

type FormState = typeof EMPTY;

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toItem(f: FormState): IntakeItem {
  const item: IntakeItem = {
    name: f.name.trim(),
    platform: f.platform,
    source_type: f.source_type,
    url: f.url.trim(),
    handle: f.handle.trim(),
    region: f.region.trim(),
    evidence_url: f.evidence_url.trim(),
    submitted_by: f.submitted_by.trim(),
  };
  const category = splitList(f.category);
  const tags = splitList(f.tags);
  if (category.length) item.category = category;
  if (tags.length) item.tags = tags;
  if (f.notes.trim()) item.notes = f.notes.trim();
  if (f.source_type === "topic") {
    if (f.parent_id.trim()) item.parent_id = f.parent_id.trim();
    if (f.topic_id.trim()) item.topic_id = f.topic_id.trim();
  }
  return item;
}

// Assign each generic error message to a field key when possible.
function fieldOf(message: string): string {
  const missing = message.match(/missing required field '(\w+)'/);
  if (missing) return missing[1];
  const first = message.split(/[ .']/)[0];
  return first;
}

export function ContributionForm({ sources }: { sources: Source[] }) {
  const [f, setF] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [showJson, setShowJson] = useState(false);

  const tgParents = useMemo(
    () => sources.filter((s) => s.platform === "tg" && s.source_type !== "topic"),
    [sources]
  );

  const item = useMemo(() => toItem(f), [f]);
  const { errors, warnings } = useMemo(() => validateIntake(item, { sources }), [item, sources]);
  const json = useMemo(() => buildIntakeJSON(item), [item]);
  const slug = useMemo(() => buildSlug(item), [item]);

  const fieldErrors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const msg of errors) {
      const key = fieldOf(msg);
      if (touched[key as keyof FormState] && !map[key]) map[key] = msg;
    }
    return map;
  }, [errors, touched]);

  const hasTouchedFields = Object.keys(touched).length > 0;

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setF((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const isTopic = f.source_type === "topic";

  return (
    <div className="rounded-2xl border border-[var(--g300)] bg-white p-6 md:p-8 shadow-sm">
      <p className="eyebrow mb-3">Form intake</p>
      <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-[var(--slate)] mb-2">
        Usulkan source lewat form
      </h3>
      <p className="text-[14px] leading-relaxed text-[var(--g700)] mb-6 max-w-2xl">
        Isi form, lalu pilih jalur pengiriman di bawah. Form otomatis menyusun file intake
        yang valid; maintainer mereview sebelum masuk registry.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="cf-name" label="Nama source" error={fieldErrors.name}>
          <input id="cf-name" value={f.name} onChange={set("name")} className={inputCls(fieldErrors.name)} placeholder="Kajian Kota Contoh" />
        </Field>

        <Field id="cf-submitted_by" label="Diusulkan oleh (nama / username)" error={fieldErrors.submitted_by}>
          <input id="cf-submitted_by" value={f.submitted_by} onChange={set("submitted_by")} className={inputCls(fieldErrors.submitted_by)} placeholder="github-username atau nama" />
        </Field>

        <Field id="cf-platform" label="Platform" error={fieldErrors.platform}>
          <select id="cf-platform" value={f.platform} onChange={set("platform")} className={inputCls(fieldErrors.platform)}>
            {PLATFORMS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field id="cf-source_type" label="Tipe source" error={fieldErrors.source_type}>
          <select id="cf-source_type" value={f.source_type} onChange={set("source_type")} className={inputCls(fieldErrors.source_type)}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field id="cf-url" label="URL" error={fieldErrors.url}>
          <input id="cf-url" value={f.url} onChange={set("url")} inputMode="url" className={inputCls(fieldErrors.url)} placeholder="https://t.me/kajiancontoh" />
        </Field>

        <Field id="cf-handle" label="Handle" error={fieldErrors.handle}>
          <input id="cf-handle" value={f.handle} onChange={set("handle")} className={inputCls(fieldErrors.handle)} placeholder="kajiancontoh" />
        </Field>

        <Field id="cf-region" label="Region" error={fieldErrors.region}>
          <input id="cf-region" value={f.region} onChange={set("region")} className={inputCls(fieldErrors.region)} placeholder="jakarta / nasional" />
        </Field>

        <Field id="cf-evidence_url" label="URL bukti (source aktif)" error={fieldErrors.evidence_url}>
          <input id="cf-evidence_url" value={f.evidence_url} onChange={set("evidence_url")} inputMode="url" className={inputCls(fieldErrors.evidence_url)} placeholder="https://t.me/kajiancontoh" />
        </Field>

        {isTopic && (
          <>
            <Field id="cf-parent_id" label="Parent source (Telegram)" error={fieldErrors.parent_id}>
              <select id="cf-parent_id" value={f.parent_id} onChange={set("parent_id")} className={inputCls(fieldErrors.parent_id)}>
                <option value="">— pilih parent —</option>
                {tgParents.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
            </Field>

            <Field id="cf-topic_id" label="Topic ID (angka)" error={fieldErrors.topic_id}>
              <input id="cf-topic_id" value={f.topic_id} onChange={set("topic_id")} inputMode="numeric" className={inputCls(fieldErrors.topic_id)} placeholder="201" />
            </Field>
          </>
        )}

        <Field id="cf-category" label="Kategori (pisahkan dengan koma)" error={fieldErrors.category}>
          <input id="cf-category" value={f.category} onChange={set("category")} className={inputCls(fieldErrors.category)} placeholder="kajian, jadwal" />
        </Field>

        <Field id="cf-tags" label="Tags (pisahkan dengan koma)" error={fieldErrors.tags}>
          <input id="cf-tags" value={f.tags} onChange={set("tags")} className={inputCls(fieldErrors.tags)} placeholder="kajian, jadwal" />
        </Field>
      </div>

      <div className="mt-4">
        <label htmlFor="cf-notes" className="mb-1 block text-[12.5px] font-medium text-[var(--g700)]">
          Catatan (opsional)
        </label>
        <textarea id="cf-notes" value={f.notes} onChange={set("notes")} rows={2} className={inputCls(undefined)} placeholder="Akun publik aktif harian." />
      </div>

      {warnings.length > 0 && (
        <div role="status" className="mt-4 rounded-lg border border-[#C9A227]/40 bg-[#C9A227]/10 px-4 py-3 text-[13px] text-[var(--g700)]">
          {warnings.map((w) => (
            <div key={w}>⚠️ {w}. Tetap bisa dikirim, maintainer akan memutuskan.</div>
          ))}
        </div>
      )}

      {hasTouchedFields && errors.length > 0 && (
        <div aria-live="polite" className="mt-4 text-[12.5px] text-[#B4493B]">
          Lengkapi {errors.length} kolom yang belum valid sebelum mengirim.
        </div>
      )}

      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          aria-expanded={showJson}
          className="text-[12.5px] font-medium text-[var(--clay)] hover:opacity-70"
        >
          {showJson ? "▾ Sembunyikan JSON" : "▸ Lihat JSON yang akan dibuat"}
        </button>
        {showJson && (
          <pre className="mt-2 overflow-auto rounded-lg border border-[var(--g300)] bg-[var(--g100)] p-3 font-mono text-[11.5px] leading-relaxed text-[var(--g700)]">
            {`data/contributions/pending/${slug || "<slug>"}.json\n\n${json}`}
          </pre>
        )}
      </div>

      <DeliveryButtons json={json} slug={slug} item={item} errors={errors} />
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const control =
    isValidElement(children) && error
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-invalid": true,
          "aria-describedby": `${id}-error`,
        })
      : children;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12.5px] font-medium text-[var(--g700)]">
        {label}
      </label>
      {control}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[11.5px] text-[#B4493B]">
          {error}
        </p>
      )}
    </div>
  );
}

function inputCls(error?: string): string {
  return [
    "w-full rounded-lg border bg-[var(--paper)] px-3 py-2.5 text-[13.5px] text-[var(--slate)] min-h-[44px]",
    "focus-visible:border-[var(--clay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clay)]/20",
    error ? "border-[#B4493B]" : "border-[var(--g300)]",
  ].join(" ");
}
