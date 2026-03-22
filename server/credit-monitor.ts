/**
 * Automated Credit Monitoring & Alert System
 * Based on iiSmitty/serper-credit-monitor + sivanbecker/creditParserV3 patterns
 * Tracks score changes, generates alerts, monitors credit factors over time
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";

export interface CreditAlert {
  clientId: string;
  clientName: string;
  alertType: "score_drop" | "score_increase" | "new_inquiry" | "new_collection" | "utilization_spike" | "payment_missed" | "account_opened" | "derogatory_added";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  previousValue?: number;
  currentValue?: number;
  createdAt: string;
}

export interface MonitoringConfig {
  scoreDropThreshold: number;
  scoreIncreaseThreshold: number;
  utilizationAlertPercent: number;
  autoMonitorEnabled: boolean;
  alertEmailEnabled: boolean;
  monitoringFrequency: "daily" | "weekly" | "monthly";
}

const DEFAULT_CONFIG: MonitoringConfig = {
  scoreDropThreshold: 10,
  scoreIncreaseThreshold: 20,
  utilizationAlertPercent: 50,
  autoMonitorEnabled: true,
  alertEmailEnabled: false,
  monitoringFrequency: "weekly",
};

export async function getMonitoringConfig(): Promise<MonitoringConfig> {
  const stored = await storage.getApiConfig("credit_monitoring_config");
  if (stored) {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }; } catch { return DEFAULT_CONFIG; }
  }
  return DEFAULT_CONFIG;
}

export async function setMonitoringConfig(config: Partial<MonitoringConfig>): Promise<MonitoringConfig> {
  const current = await getMonitoringConfig();
  const updated = { ...current, ...config };
  await storage.setApiConfig("credit_monitoring_config", JSON.stringify(updated));
  return updated;
}

export async function detectScoreChanges(): Promise<CreditAlert[]> {
  const alerts: CreditAlert[] = [];
  const config = await getMonitoringConfig();

  const clientsResult = await db.execute(sql`
    SELECT id, first_name, last_name, equifax_score, experian_score, transunion_score
    FROM clients WHERE status = 'active'
  `);

  for (const client of clientsResult.rows as any[]) {
    const historyResult = await db.execute(sql`
      SELECT overall_score, credit_card_utilization, derogatory_marks, hard_inquiries, collections_count, snapshot_date
      FROM credit_factors
      WHERE client_id = ${client.id}
      ORDER BY snapshot_date DESC
      LIMIT 2
    `);

    const snapshots = historyResult.rows as any[];
    if (snapshots.length < 2) continue;

    const current = snapshots[0];
    const previous = snapshots[1];
    const clientName = `${client.first_name} ${client.last_name}`;

    if (current.overall_score && previous.overall_score) {
      const diff = current.overall_score - previous.overall_score;
      if (diff <= -config.scoreDropThreshold) {
        alerts.push({
          clientId: client.id, clientName,
          alertType: "score_drop", severity: diff <= -30 ? "critical" : "warning",
          title: `Score Drop: ${clientName}`,
          message: `Credit score dropped ${Math.abs(diff)} points (${previous.overall_score} → ${current.overall_score}). Review recent changes and consider dispute actions.`,
          previousValue: previous.overall_score, currentValue: current.overall_score,
          createdAt: new Date().toISOString(),
        });
      }
      if (diff >= config.scoreIncreaseThreshold) {
        alerts.push({
          clientId: client.id, clientName,
          alertType: "score_increase", severity: "info",
          title: `Score Increase: ${clientName}`,
          message: `Credit score increased ${diff} points (${previous.overall_score} → ${current.overall_score}). Repair actions are working!`,
          previousValue: previous.overall_score, currentValue: current.overall_score,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (current.hard_inquiries > previous.hard_inquiries) {
      alerts.push({
        clientId: client.id, clientName,
        alertType: "new_inquiry", severity: "warning",
        title: `New Hard Inquiry: ${clientName}`,
        message: `${current.hard_inquiries - previous.hard_inquiries} new hard inquiry(ies) detected. Total: ${current.hard_inquiries}. Investigate if unauthorized.`,
        previousValue: previous.hard_inquiries, currentValue: current.hard_inquiries,
        createdAt: new Date().toISOString(),
      });
    }

    if (current.collections_count > previous.collections_count) {
      alerts.push({
        clientId: client.id, clientName,
        alertType: "new_collection", severity: "critical",
        title: `New Collection: ${clientName}`,
        message: `${current.collections_count - previous.collections_count} new collection(s) appeared. Total: ${current.collections_count}. Initiate dispute immediately.`,
        previousValue: previous.collections_count, currentValue: current.collections_count,
        createdAt: new Date().toISOString(),
      });
    }

    if (current.credit_card_utilization > config.utilizationAlertPercent && previous.credit_card_utilization <= config.utilizationAlertPercent) {
      alerts.push({
        clientId: client.id, clientName,
        alertType: "utilization_spike", severity: "warning",
        title: `High Utilization: ${clientName}`,
        message: `Credit utilization spiked to ${current.credit_card_utilization}% (was ${previous.credit_card_utilization}%). Advise client to pay down balances.`,
        previousValue: previous.credit_card_utilization, currentValue: current.credit_card_utilization,
        createdAt: new Date().toISOString(),
      });
    }

    if (current.derogatory_marks > previous.derogatory_marks) {
      alerts.push({
        clientId: client.id, clientName,
        alertType: "derogatory_added", severity: "critical",
        title: `New Derogatory Mark: ${clientName}`,
        message: `${current.derogatory_marks - previous.derogatory_marks} new derogatory mark(s). Total: ${current.derogatory_marks}. Review and dispute if inaccurate.`,
        previousValue: previous.derogatory_marks, currentValue: current.derogatory_marks,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

export async function createAlertsAsNotifications(alerts: CreditAlert[]): Promise<number> {
  let created = 0;
  const existing = await db.execute(sql`
    SELECT title FROM notifications
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `);
  const recentTitles = new Set((existing.rows as any[]).map(r => r.title));

  for (const alert of alerts) {
    if (recentTitles.has(alert.title)) continue;
    const type = alert.severity === "critical" ? "warning" : alert.severity === "warning" ? "compliance" : "success";
    await storage.createNotification({
      type: type as any,
      title: alert.title,
      message: alert.message,
      clientId: alert.clientId,
    });
    created++;
  }
  return created;
}

export async function getClientScoreHistory(clientId: string): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT 
      overall_score, predicted_score_30d, predicted_score_90d, predicted_score_180d,
      credit_card_utilization, payment_history_score, derogatory_marks,
      hard_inquiries, collections_count, total_accounts, total_balance, total_credit_limit,
      snapshot_date
    FROM credit_factors
    WHERE client_id = ${clientId}
    ORDER BY snapshot_date ASC
  `);
  return result.rows;
}

export function parseXMLCreditReport(xmlContent: string): any {
  const extractTag = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
    return match ? match[1].trim() : "";
  };

  const extractAttr = (xml: string, tag: string, attr: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i"));
    return match ? match[1].trim() : "";
  };

  const extractAll = (xml: string, tag: string): string[] => {
    const matches = xml.match(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi"));
    return matches || [];
  };

  const score = extractTag(xmlContent, "score") || extractAttr(xmlContent, "CREDIT_SCORE", "_Value");
  const firstName = extractTag(xmlContent, "first") || extractAttr(xmlContent, "BORROWER", "_FirstName");
  const lastName = extractTag(xmlContent, "last") || extractAttr(xmlContent, "BORROWER", "_LastName");

  const tradelineBlocks = extractAll(xmlContent, "CREDIT_LIABILITY") 
    .concat(extractAll(xmlContent, "tradeline"))
    .concat(extractAll(xmlContent, "account"));

  const accounts = tradelineBlocks.map((block) => ({
    creditorName: extractAttr(block, "CREDIT_LIABILITY", "_Name") 
      || extractTag(block, "creditorName") 
      || extractTag(block, "subscriberName") 
      || "Unknown",
    accountNumber: extractAttr(block, "CREDIT_LIABILITY", "_AccountIdentifier")
      || extractTag(block, "accountNumber") || "",
    balance: parseInt(extractAttr(block, "CREDIT_LIABILITY", "_UnpaidBalanceAmount")
      || extractTag(block, "currentBalance") || "0") || 0,
    creditLimit: parseInt(extractAttr(block, "CREDIT_LIABILITY", "_HighCreditAmount")
      || extractTag(block, "creditLimit") || extractTag(block, "highCredit") || "0") || 0,
    status: extractAttr(block, "CREDIT_LIABILITY", "_PaymentPatternData")
      || extractTag(block, "accountStatus") || "Unknown",
    type: extractAttr(block, "CREDIT_LIABILITY", "_AccountType")
      || extractTag(block, "accountType") || "Unknown",
    dateOpened: extractAttr(block, "CREDIT_LIABILITY", "_AccountOpenedDate")
      || extractTag(block, "dateOpened") || "",
    isNegative: /delinquent|collection|charge.?off|late|past.?due/i.test(block),
  }));

  const inquiryBlocks = extractAll(xmlContent, "CREDIT_INQUIRY")
    .concat(extractAll(xmlContent, "inquiry"));

  const inquiries = inquiryBlocks.map((block) => ({
    creditor: extractAttr(block, "CREDIT_INQUIRY", "_Name") || extractTag(block, "subscriberName") || "Unknown",
    date: extractAttr(block, "CREDIT_INQUIRY", "_Date") || extractTag(block, "inquiryDate") || "",
    type: extractAttr(block, "CREDIT_INQUIRY", "_Type") || "Hard",
  }));

  return {
    score: score ? parseInt(score) : null,
    personalInfo: { firstName, lastName },
    accounts,
    inquiries,
    totalAccounts: accounts.length,
    negativeAccounts: accounts.filter(a => a.isNegative).length,
    totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
    totalCreditLimit: accounts.reduce((s, a) => s + a.creditLimit, 0),
    totalInquiries: inquiries.length,
  };
}
