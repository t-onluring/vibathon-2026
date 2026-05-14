export type Platform = "telegram" | "instagram" | "facebook" | "whatsapp" | "website" | "youtube";

export type Priority = "high" | "medium" | "low" | "archived";

export type HealthStatus = "active" | "stale" | "dead" | "blocked" | "error" | "unmonitored";

export interface Source {
  id: string;
  name: string;
  platform: Platform;
  url: string;
  handle: string;
  category: string[];
  region: string;
  language: string;
  priority: Priority;
  tags: string[];
  verified: boolean;
  added_at: string;
  notes?: string;
  partnership_status?: string;
  has_api?: boolean;
  monitor_status?: "not_yet_monitored";
}
