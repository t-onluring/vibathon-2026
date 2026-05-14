import * as cheerio from "cheerio";
import type { TelegramMetrics } from "./types.js";

const TG_PREVIEW_BASE = "https://t.me/s/";
const USER_AGENT = "Mozilla/5.0 (compatible; KajianSourceListBot/0.1; +https://github.com/)";
const FETCH_TIMEOUT_MS = 15_000;

export async function fetchTelegramChannel(
  handle: string,
  attempts = 3
): Promise<TelegramMetrics> {
  const url = `${TG_PREVIEW_BASE}${encodeURIComponent(handle)}`;
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${handle}`);
      const html = await res.text();
      return parseTelegramHtml(html);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        const backoffMs = 2_000 * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export function parseTelegramHtml(html: string): TelegramMetrics {
  const $ = cheerio.load(html);

  const subscribers = parseSubscribers($);
  const lastPostAt = parseLastPostDate($);
  const lastPostAgeHours = lastPostAt
    ? (Date.now() - new Date(lastPostAt).getTime()) / 3_600_000
    : null;

  return {
    subscribers,
    last_post_at: lastPostAt,
    last_post_age_hours: lastPostAgeHours === null ? null : Math.round(lastPostAgeHours * 10) / 10,
  };
}

function parseSubscribers($: cheerio.CheerioAPI): number | null {
  const counters = $(".tgme_channel_info_counter, .tgme_header_counter").toArray();
  for (const el of counters) {
    const $el = $(el);
    const value = $el.find(".counter_value").text().trim() || $el.text().trim();
    const type = $el.find(".counter_type").text().trim().toLowerCase();
    if (type === "subscribers" || type === "members") {
      return parseHumanNumber(value);
    }
  }
  const fallback = $.html().match(/([\d.,KkMm]+)\s+(?:subscribers|members)/);
  return fallback ? parseHumanNumber(fallback[1]) : null;
}

function parseLastPostDate($: cheerio.CheerioAPI): string | null {
  const datetimes = $(".tgme_widget_message_date time[datetime]")
    .toArray()
    .map((el) => $(el).attr("datetime"))
    .filter((v): v is string => Boolean(v));

  if (datetimes.length === 0) return null;

  const latest = datetimes
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return latest ? latest.toISOString() : null;
}

function parseHumanNumber(input: string): number | null {
  const cleaned = input.replace(/[\s,]/g, "").toLowerCase();
  const match = cleaned.match(/^([\d.]+)([km]?)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;
  const mult = match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : 1;
  return Math.round(num * mult);
}
