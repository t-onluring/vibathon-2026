"use client";

import { useState } from "react";
import {
  buildGithubNewFileUrl,
  buildMailto,
  MAINTAINER_EMAIL,
  NETLIFY_FORM_NAME,
  NETLIFY_FORMS_ENABLED,
  PRIMARY_SITE_URL,
  type IntakeItem,
} from "../lib/contribution-intake";

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-semibold transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed";

type NetlifyState = "idle" | "sending" | "ok" | "error";

export function DeliveryButtons({
  json,
  slug,
  item,
  errors,
}: {
  json: string;
  slug: string;
  item: IntakeItem;
  errors: string[];
}) {
  const disabled = errors.length > 0;
  const [announce, setAnnounce] = useState("");
  const [copied, setCopied] = useState(false);
  const [githubBlocked, setGithubBlocked] = useState(false);
  const [netlify, setNetlify] = useState<NetlifyState>("idle");

  const githubUrl = buildGithubNewFileUrl(slug, json);

  function openGithub() {
    setGithubBlocked(false);
    const win = window.open(githubUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      setGithubBlocked(true);
      setAnnounce("Popup diblokir. Pakai tautan manual yang muncul.");
    } else {
      setAnnounce("Membuka GitHub. Commit di sana untuk membuat Pull Request.");
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setAnnounce("JSON disalin ke clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setAnnounce("Gagal menyalin otomatis. Pilih teks JSON di preview lalu salin manual.");
    }
  }

  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "source"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setAnnounce("File JSON diunduh.");
  }

  async function submitNetlify() {
    setNetlify("sending");
    try {
      const body = new URLSearchParams({
        "form-name": NETLIFY_FORM_NAME,
        "bot-field": "",
        name: item.name,
        submitted_by: item.submitted_by,
        payload: json,
      });

      const submit = (url: string) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

      // Netlify detects this form from public/__forms.html. Posting directly to
      // that static stub is more reliable for client-rendered Next.js forms than
      // posting to the app root, especially when a framework adapter handles `/`.
      let res = await submit("/__forms.html");
      if (!res.ok && res.status === 404) res = await submit("/");
      if (!res.ok) throw new Error(`status ${res.status}`);

      setNetlify("ok");
      setAnnounce("Terkirim ke maintainer. Review maksimal 48 jam.");
    } catch {
      setNetlify("error");
      setAnnounce("Gagal mengirim. Coba Salin JSON lalu kirim manual ke maintainer.");
    }
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Lane 1 — GitHub */}
      <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4">
        <div className="mb-1 text-[13.5px] font-semibold text-[var(--slate)]">Punya akun GitHub?</div>
        <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--g500)]">
          Buka editor GitHub dengan file sudah terisi, lalu commit untuk membuat Pull Request.
        </p>
        <button
          type="button"
          onClick={openGithub}
          disabled={disabled}
          className={`${BTN} w-full bg-[var(--slate)] text-[var(--ivory)] hover:opacity-85`}
        >
          Buka di GitHub
        </button>
        {githubBlocked && (
          <p className="mt-2 text-[12px] text-[var(--g700)]">
            Popup diblokir.{" "}
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--clay)] underline">
              Klik di sini untuk membuka manual
            </a>
            .
          </p>
        )}
      </div>

      {/* Lane 2 — Maintainer */}
      <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4">
        <div className="mb-1 text-[13.5px] font-semibold text-[var(--slate)]">Tidak punya akun GitHub?</div>
        <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--g500)]">
          Kirim ke maintainer. Kami yang akan memasukkannya ke registry.
        </p>
        <div className="flex flex-wrap gap-2">
          {NETLIFY_FORMS_ENABLED ? (
            <button
              type="button"
              onClick={submitNetlify}
              disabled={disabled || netlify === "sending"}
              className={`${BTN} bg-[var(--clay)] text-white hover:opacity-85`}
            >
              {netlify === "sending" ? "Mengirim…" : netlify === "ok" ? "Terkirim ✓" : "Kirim ke maintainer"}
            </button>
          ) : PRIMARY_SITE_URL ? (
            <a
              href={disabled ? undefined : PRIMARY_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={disabled}
              className={`${BTN} bg-[var(--clay)] text-white no-underline hover:opacity-85 ${
                disabled ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Buka form online di situs utama
            </a>
          ) : null}
          <button
            type="button"
            onClick={copyJson}
            disabled={disabled}
            className={`${BTN} border border-[var(--g300)] bg-[var(--g100)] text-[var(--g700)] hover:border-[var(--clay)] hover:text-[var(--clay)]`}
          >
            {copied ? "Disalin ✓" : "Salin JSON"}
          </button>
          <button
            type="button"
            onClick={downloadJson}
            disabled={disabled}
            className={`${BTN} border border-[var(--g300)] bg-[var(--g100)] text-[var(--g700)] hover:border-[var(--clay)] hover:text-[var(--clay)]`}
          >
            Download JSON
          </button>
          {MAINTAINER_EMAIL && (
            <a
              href={disabled ? undefined : buildMailto(item, json)}
              aria-disabled={disabled}
              className={`${BTN} border border-[var(--g300)] bg-[var(--g100)] text-[var(--g700)] no-underline hover:border-[var(--clay)] hover:text-[var(--clay)] ${
                disabled ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Email ke maintainer
            </a>
          )}
        </div>
        {netlify === "error" && (
          <p className="mt-2 text-[12px] text-[#B4493B]">
            Gagal mengirim. Coba Salin JSON lalu kirim manual.
          </p>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
}
