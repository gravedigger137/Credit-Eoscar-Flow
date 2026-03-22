/**
 * Usage Metering & Event Tracking Engine
 * Based on openmeterio/openmeter patterns
 * Tracks billable events: bureau pulls, disputes filed, reports parsed, AI calls
 * Enables usage-based billing for credit repair services
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

export type EventType =
  | "bureau_pull" | "dispute_filed" | "dispute_letter_generated"
  | "report_parsed" | "ai_chat" | "ai_letter" | "ai_analysis"
  | "score_simulation" | "credit_prediction" | "document_upload"
  | "tradeline_placed" | "metro2_filing" | "payment_processed";

export interface UsageEvent {
  id?: string;
  eventType: EventType;
  clientId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  quantity: number;
  createdAt?: string;
}

export interface UsageSummary {
  eventType: EventType;
  totalCount: number;
  totalQuantity: number;
  lastOccurrence: string | null;
}

export interface UsageReport {
  period: string;
  startDate: string;
  endDate: string;
  events: UsageSummary[];
  totalEvents: number;
  estimatedCost: number;
  breakdown: { eventType: EventType; count: number; unitPrice: number; total: number }[];
}

const DEFAULT_PRICING: Record<EventType, number> = {
  bureau_pull: 2500,
  dispute_filed: 500,
  dispute_letter_generated: 200,
  report_parsed: 300,
  ai_chat: 50,
  ai_letter: 150,
  ai_analysis: 100,
  score_simulation: 0,
  credit_prediction: 0,
  document_upload: 0,
  tradeline_placed: 1500,
  metro2_filing: 1000,
  payment_processed: 100,
};

export async function ensureUsageTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS usage_events (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      event_type VARCHAR(40) NOT NULL,
      client_id VARCHAR(36),
      user_id VARCHAR(36),
      metadata JSONB DEFAULT '{}',
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_usage_type ON usage_events(event_type)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_usage_client ON usage_events(client_id)`);
}

export async function recordUsageEvent(event: Omit<UsageEvent, "id" | "createdAt">): Promise<UsageEvent> {
  await ensureUsageTables();
  const result = await db.execute(sql`
    INSERT INTO usage_events (event_type, client_id, user_id, metadata, quantity)
    VALUES (${event.eventType}, ${event.clientId || null}, ${event.userId || null}, ${JSON.stringify(event.metadata || {})}, ${event.quantity || 1})
    RETURNING *
  `);
  const row = result.rows[0] as any;
  return {
    id: row.id,
    eventType: row.event_type,
    clientId: row.client_id,
    userId: row.user_id,
    metadata: row.metadata,
    quantity: row.quantity,
    createdAt: row.created_at,
  };
}

export async function getUsageSummary(startDate?: string, endDate?: string): Promise<UsageSummary[]> {
  await ensureUsageTables();
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  const result = await db.execute(sql`
    SELECT
      event_type,
      COUNT(*)::int as total_count,
      SUM(quantity)::int as total_quantity,
      MAX(created_at) as last_occurrence
    FROM usage_events
    WHERE created_at >= ${start} AND created_at <= ${end}
    GROUP BY event_type
    ORDER BY total_count DESC
  `);

  return result.rows.map((r: any) => ({
    eventType: r.event_type,
    totalCount: r.total_count,
    totalQuantity: r.total_quantity,
    lastOccurrence: r.last_occurrence,
  }));
}

export async function getUsageReport(period: "daily" | "weekly" | "monthly" = "monthly"): Promise<UsageReport> {
  await ensureUsageTables();
  const now = new Date();
  let startDate: Date;

  if (period === "daily") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "weekly") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const events = await getUsageSummary(startDate.toISOString(), now.toISOString());

  const breakdown = events.map(e => ({
    eventType: e.eventType as EventType,
    count: e.totalQuantity,
    unitPrice: DEFAULT_PRICING[e.eventType as EventType] || 0,
    total: e.totalQuantity * (DEFAULT_PRICING[e.eventType as EventType] || 0),
  }));

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    events,
    totalEvents: events.reduce((s, e) => s + e.totalCount, 0),
    estimatedCost: breakdown.reduce((s, b) => s + b.total, 0),
    breakdown,
  };
}

export async function getClientUsage(clientId: string, limit: number = 50): Promise<UsageEvent[]> {
  await ensureUsageTables();
  const result = await db.execute(sql`
    SELECT * FROM usage_events
    WHERE client_id = ${clientId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return result.rows.map((r: any) => ({
    id: r.id,
    eventType: r.event_type,
    clientId: r.client_id,
    userId: r.user_id,
    metadata: r.metadata,
    quantity: r.quantity,
    createdAt: r.created_at,
  }));
}

export async function getRecentEvents(limit: number = 50): Promise<UsageEvent[]> {
  await ensureUsageTables();
  const result = await db.execute(sql`
    SELECT * FROM usage_events
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return result.rows.map((r: any) => ({
    id: r.id,
    eventType: r.event_type,
    clientId: r.client_id,
    userId: r.user_id,
    metadata: r.metadata,
    quantity: r.quantity,
    createdAt: r.created_at,
  }));
}

export function getPricing(): Record<EventType, number> {
  return { ...DEFAULT_PRICING };
}
