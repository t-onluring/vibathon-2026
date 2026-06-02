export type Platform = "tg" | "yt" | "ig" | "web" | "wa";

export type Priority = number;

export type HealthStatus = "active" | "stale" | "dead" | "blocked" | "error" | "unmonitored";

export interface Source {
  id: string;
  name: string;
  platform: Platform;
  source_type: string;
  url: string;
  handle: string;
  category?: string[];
  region: string;
  language: string;
  priority: Priority;
  tags?: string[];
  verified?: boolean;
  added_at: string;
  parent_id?: string;
  topic_id?: string;
  notes?: string;
  partnership_status?: string;
  has_api?: boolean;
  monitor_status?: "not_yet_monitored";
}
