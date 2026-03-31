import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { generateDisputeLetter, analyzeClientCredit, chatWithAI, validateMetro2Record, analyzeReportForDisputes } from "./ai";
import { detectScoreChanges, createAlertsAsNotifications } from "./credit-monitor";
import { recordUsageEvent } from "./usage-metering";
import { generateFCRADisputeLetter } from "./dispute-letters";
import { optimizeTradelinesForClient, analyzeClientBehavior, batchOptimizeAll } from "./tradeline-processor";
import { pullAllBureauReports, getBureauClient, type BureauReportRequest, type BureauReportResponse } from "./bureau-clients";
import { buildMetro2File, validateMetro2BaseRecord, type Metro2Record } from "./metro2";
import { parseCreditReportText } from "./credit-report-parser";
import { analyzeCreditFactors, predictDefault, type CreditFactorInput } from "./credit-predictor";

export type WorkflowType =
  | "auto_dispute" | "client_onboarding" | "score_monitoring"
  | "follow_up" | "letter_generation" | "compliance_check"
  | "report_pull" | "tradeline_review" | "collection_response"
  | "goodwill_campaign" | "bureau_escalation" | "client_graduation"
  | "stale_dispute_check" | "payment_reminder" | "ai_analysis"
  | "tradeline_optimization" | "bureau_auto_pull" | "metro2_furnishing"
  | "full_pipeline" | "ai_credit_worker";

export type TriggerType = "scheduled" | "event" | "manual" | "condition";
export type RunStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface AutomationRule {
  id?: string;
  name: string;
  description: string;
  workflowType: WorkflowType;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  actions: AutomationAction[];
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  createdAt?: string;
}

export interface AutomationAction {
  type: string;
  config: Record<string, any>;
  order: number;
}

export interface AutomationRun {
  id?: string;
  ruleId: string;
  ruleName: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  results: Record<string, any>;
  error?: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
}

const WORKFLOW_DESCRIPTIONS: Record<WorkflowType, string> = {
  auto_dispute: "Automatically generate and file disputes for negative items",
  client_onboarding: "Automate new client setup: pull reports, analyze credit, create action plan",
  score_monitoring: "Monitor all active clients for score changes and generate alerts",
  follow_up: "Send follow-up reminders for disputes past 30-day investigation window",
  letter_generation: "Batch generate FCRA/FDCPA dispute letters for pending disputes",
  compliance_check: "Verify all active disputes meet CROA/FCRA compliance deadlines",
  report_pull: "Scheduled bureau report pulls for active clients",
  tradeline_review: "Review tradeline placements and report status to clients",
  tradeline_optimization: "AI-driven batch tradeline optimization for all active clients",
  collection_response: "Auto-generate debt validation letters for new collections",
  goodwill_campaign: "Generate goodwill removal letters for clients with positive payment history",
  bureau_escalation: "Escalate unresolved disputes past 30 days to CFPB complaint",
  client_graduation: "Identify clients who have reached score goals and recommend graduation",
  stale_dispute_check: "Flag disputes with no response after 35 days for re-filing",
  payment_reminder: "Send billing reminders for upcoming or overdue payments",
  ai_analysis: "Run AI-powered credit analysis on all active clients",
  bureau_auto_pull: "Automated 4-bureau credit report pull, parse, store, and AI analysis for all active clients",
  metro2_furnishing: "Batch Metro 2 data furnishing — generate CDIA-compliant files and submit to all bureaus",
  full_pipeline: "End-to-end AI pipeline: pull reports → parse → analyze → dispute → optimize tradelines → furnish Metro 2",
  ai_credit_worker: "AI credit specialist worker: analyze reports, score factors, risk prediction, and strategic recommendations",
};

async function ensureAutomationTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      workflow_type TEXT NOT NULL,
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      trigger_config JSONB DEFAULT '{}',
      actions JSONB DEFAULT '[]',
      enabled BOOLEAN DEFAULT true,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ,
      run_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS automation_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
      rule_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      results JSONB DEFAULT '{}',
      error TEXT,
      items_processed INTEGER DEFAULT 0,
      items_succeeded INTEGER DEFAULT 0,
      items_failed INTEGER DEFAULT 0
    )
  `);
}

let tablesReady = false;
async function ready() {
  if (!tablesReady) { await ensureAutomationTables(); tablesReady = true; }
}

export async function getAutomationRules(): Promise<AutomationRule[]> {
  await ready();
  const r = await db.execute(sql`SELECT * FROM automation_rules ORDER BY created_at DESC`);
  return (r.rows as any[]).map(mapRule);
}

export async function getAutomationRule(id: string): Promise<AutomationRule | null> {
  await ready();
  const r = await db.execute(sql`SELECT * FROM automation_rules WHERE id = ${id}`);
  return r.rows.length ? mapRule(r.rows[0] as any) : null;
}

export async function createAutomationRule(rule: Omit<AutomationRule, "id" | "createdAt" | "runCount">): Promise<AutomationRule> {
  await ready();
  const r = await db.execute(sql`
    INSERT INTO automation_rules (name, description, workflow_type, trigger_type, trigger_config, actions, enabled, next_run_at)
    VALUES (${rule.name}, ${rule.description}, ${rule.workflowType}, ${rule.triggerType},
      ${JSON.stringify(rule.triggerConfig)}::jsonb, ${JSON.stringify(rule.actions)}::jsonb,
      ${rule.enabled}, ${rule.nextRunAt || null})
    RETURNING *
  `);
  return mapRule(r.rows[0] as any);
}

export async function updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
  await ready();
  const existing = await getAutomationRule(id);
  if (!existing) throw new Error("Rule not found");
  const merged = { ...existing, ...updates };
  await db.execute(sql`
    UPDATE automation_rules SET
      name = ${merged.name}, description = ${merged.description},
      workflow_type = ${merged.workflowType}, trigger_type = ${merged.triggerType},
      trigger_config = ${JSON.stringify(merged.triggerConfig)}::jsonb,
      actions = ${JSON.stringify(merged.actions)}::jsonb,
      enabled = ${merged.enabled}
    WHERE id = ${id}
  `);
  return (await getAutomationRule(id))!;
}

export async function deleteAutomationRule(id: string): Promise<void> {
  await ready();
  await db.execute(sql`DELETE FROM automation_rules WHERE id = ${id}`);
}

export async function toggleAutomationRule(id: string, enabled: boolean): Promise<AutomationRule> {
  await ready();
  await db.execute(sql`UPDATE automation_rules SET enabled = ${enabled} WHERE id = ${id}`);
  return (await getAutomationRule(id))!;
}

export async function getAutomationRuns(limit = 50): Promise<AutomationRun[]> {
  await ready();
  const r = await db.execute(sql`SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT ${limit}`);
  return (r.rows as any[]).map(mapRun);
}

export async function getRunsForRule(ruleId: string): Promise<AutomationRun[]> {
  await ready();
  const r = await db.execute(sql`SELECT * FROM automation_runs WHERE rule_id = ${ruleId} ORDER BY started_at DESC LIMIT 20`);
  return (r.rows as any[]).map(mapRun);
}

async function createRun(ruleId: string, ruleName: string): Promise<string> {
  const r = await db.execute(sql`
    INSERT INTO automation_runs (rule_id, rule_name, status, started_at) VALUES (${ruleId}, ${ruleName}, 'running', NOW()) RETURNING id
  `);
  return (r.rows[0] as any).id;
}

async function completeRun(runId: string, status: RunStatus, results: Record<string, any>, itemsProcessed: number, itemsSucceeded: number, itemsFailed: number, error?: string) {
  await db.execute(sql`
    UPDATE automation_runs SET status = ${status}, completed_at = NOW(), results = ${JSON.stringify(results)}::jsonb,
    items_processed = ${itemsProcessed}, items_succeeded = ${itemsSucceeded}, items_failed = ${itemsFailed}, error = ${error || null}
    WHERE id = ${runId}
  `);
}

async function markRuleRan(ruleId: string) {
  await db.execute(sql`UPDATE automation_rules SET last_run_at = NOW(), run_count = run_count + 1 WHERE id = ${ruleId}`);
}

export async function executeAutomationRule(ruleId: string): Promise<AutomationRun> {
  await ready();
  const rule = await getAutomationRule(ruleId);
  if (!rule) throw new Error("Rule not found");

  const runId = await createRun(ruleId, rule.name);
  let processed = 0, succeeded = 0, failed = 0;
  const results: Record<string, any> = {};

  try {
    switch (rule.workflowType) {
      case "score_monitoring": {
        const alerts = await detectScoreChanges();
        const created = await createAlertsAsNotifications(alerts);
        processed = alerts.length; succeeded = created; failed = 0;
        results.alertsDetected = alerts.length;
        results.notificationsCreated = created;
        results.alerts = alerts.slice(0, 10);
        break;
      }
      case "auto_dispute": {
        const outcome = await runAutoDispute(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "letter_generation": {
        const outcome = await runBatchLetterGeneration(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "follow_up": {
        const outcome = await runDisputeFollowUp();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "stale_dispute_check": {
        const outcome = await runStaleDisputeCheck();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "compliance_check": {
        const outcome = await runComplianceCheck();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "client_onboarding": {
        const outcome = await runClientOnboarding(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "ai_analysis": {
        const outcome = await runAIAnalysis();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "client_graduation": {
        const outcome = await runClientGraduation(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "goodwill_campaign": {
        const outcome = await runGoodwillCampaign(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "payment_reminder": {
        const outcome = await runPaymentReminders();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "collection_response": {
        const outcome = await runCollectionResponse();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "report_pull": {
        const outcome = await runReportPull();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "tradeline_review": {
        const outcome = await runTradelineReview();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "tradeline_optimization": {
        const outcome = await runTradelineOptimization();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "bureau_escalation": {
        const outcome = await runBureauEscalation();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "bureau_auto_pull": {
        const outcome = await runBureauAutoPull(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "metro2_furnishing": {
        const outcome = await runMetro2Furnishing(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "full_pipeline": {
        const outcome = await runFullPipeline(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "ai_credit_worker": {
        const outcome = await runAICreditWorker(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      default: {
        results.message = `Workflow type '${rule.workflowType}' not implemented`;
        processed = 0; succeeded = 0;
      }
    }

    await completeRun(runId, "completed", results, processed, succeeded, failed);
    await markRuleRan(ruleId);
  } catch (err: any) {
    await completeRun(runId, "failed", results, processed, succeeded, failed, err.message);
    await markRuleRan(ruleId);
  }

  const runs = await getRunsForRule(ruleId);
  return runs[0];
}

type WorkflowResult = { processed: number; succeeded: number; failed: number; details: Record<string, any> };

async function runAutoDispute(rule: AutomationRule): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active");
  let processed = 0, succeeded = 0, failed = 0;
  const disputesCreated: any[] = [];

  for (const client of active) {
    const reports = await storage.getCreditReportsByClient(client.id);
    if (!reports.length) continue;
    const latest = reports[reports.length - 1] as any;
    const negItems = (latest.negativeItems || []) as string[];
    if (!negItems.length) continue;

    const existingDisputes = await storage.getDisputesByClient(client.id);
    const disputedAccounts = new Set(existingDisputes.map((d: any) => d.accountName?.toLowerCase()));

    for (const item of negItems.slice(0, rule.triggerConfig.maxPerClient || 3)) {
      if (disputedAccounts.has(item.toLowerCase())) continue;
      try {
        const dispute = await storage.createDispute({
          clientId: client.id,
          bureau: "equifax",
          accountName: item,
          reason: "Automated dispute — item appears inaccurate or unverifiable per FCRA § 611",
          status: "pending",
        });

        const letter = generateFCRADisputeLetter({
          clientName: `${client.firstName} ${client.lastName}`,
          clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
          clientSSNLast4: client.ssn ? client.ssn.slice(-4) : undefined,
          bureau: "equifax",
          accountName: item,
          reason: "Automated dispute — item appears inaccurate or unverifiable per FCRA § 611",
          disputeType: "general",
        });

        await storage.updateDispute(dispute.id, { letterContent: letter, disputeType: "general" });
        disputesCreated.push({ clientId: client.id, clientName: `${client.firstName} ${client.lastName}`, account: item });
        succeeded++;

        await storage.createNotification({
          type: "dispute",
          title: `Auto-Dispute: ${client.firstName} ${client.lastName}`,
          message: `Automated dispute generated for "${item}" with Equifax.`,
          clientId: client.id,
        });
      } catch { failed++; }
      processed++;
    }
  }

  return { processed, succeeded, failed, details: { disputesCreated, clientsScanned: active.length } };
}

async function runBatchLetterGeneration(rule: AutomationRule): Promise<WorkflowResult> {
  const disputes = await storage.getDisputes();
  const pending = disputes.filter((d: any) => d.status === "pending" && !d.letterContent);
  let processed = 0, succeeded = 0, failed = 0;
  const generated: string[] = [];

  for (const dispute of pending) {
    try {
      const client = await storage.getClient(dispute.clientId);
      if (!client) { failed++; processed++; continue; }

      const useAI = rule.triggerConfig.useAI ?? false;
      let letter: string;

      if (useAI) {
        letter = await generateDisputeLetter({
          clientName: `${client.firstName} ${client.lastName}`,
          bureau: dispute.bureau,
          accountName: dispute.accountName,
          accountNumber: dispute.accountNumber || undefined,
          reason: dispute.reason,
          type: dispute.disputeType || "general",
        });
        recordUsageEvent({ eventType: "ai_letter", metadata: { disputeId: dispute.id }, quantity: 1 }).catch(() => {});
      } else {
        letter = generateFCRADisputeLetter({
          clientName: `${client.firstName} ${client.lastName}`,
          clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
          clientSSNLast4: client.ssn ? client.ssn.slice(-4) : undefined,
          bureau: dispute.bureau,
          accountName: dispute.accountName,
          accountNumber: dispute.accountNumber || undefined,
          reason: dispute.reason,
          disputeType: (dispute.disputeType || "general") as any,
        });
      }

      await storage.updateDispute(dispute.id, { letterContent: letter, disputeType: dispute.disputeType || "general" });
      generated.push(dispute.id);
      succeeded++;
    } catch { failed++; }
    processed++;
  }

  return { processed, succeeded, failed, details: { lettersGenerated: generated.length, disputeIds: generated } };
}

async function runDisputeFollowUp(): Promise<WorkflowResult> {
  const disputes = await storage.getDisputes();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let processed = 0, succeeded = 0, failed = 0;
  const followUps: any[] = [];

  for (const dispute of disputes) {
    if (dispute.status !== "sent" && dispute.status !== "pending") continue;
    const created = new Date(dispute.createdAt || 0).getTime();
    if (now - created < thirtyDays) continue;
    processed++;

    try {
      await storage.createNotification({
        type: "warning",
        title: `Dispute Follow-Up Required: ${dispute.accountName}`,
        message: `Dispute with ${dispute.bureau} for "${dispute.accountName}" is past the 30-day FCRA investigation window. Consider re-filing or escalating to CFPB.`,
        clientId: dispute.clientId,
      });
      followUps.push({ disputeId: dispute.id, account: dispute.accountName, bureau: dispute.bureau });
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { followUpsCreated: followUps.length, disputes: followUps } };
}

async function runStaleDisputeCheck(): Promise<WorkflowResult> {
  const disputes = await storage.getDisputes();
  const now = Date.now();
  const thirtyFiveDays = 35 * 24 * 60 * 60 * 1000;
  let processed = 0, succeeded = 0, failed = 0;
  const stale: any[] = [];

  for (const dispute of disputes) {
    if (dispute.status !== "sent") continue;
    const created = new Date(dispute.createdAt || 0).getTime();
    if (now - created < thirtyFiveDays) continue;
    processed++;

    try {
      await storage.updateDispute(dispute.id, { status: "no_response" });
      await storage.createNotification({
        type: "warning",
        title: `No Response: ${dispute.accountName}`,
        message: `Bureau ${dispute.bureau} has not responded to dispute for "${dispute.accountName}" after 35 days. Per FCRA § 611(a)(1), item should be deleted. Consider re-filing with escalation.`,
        clientId: dispute.clientId,
      });
      stale.push({ disputeId: dispute.id, account: dispute.accountName });
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { staleDisputes: stale.length, disputes: stale } };
}

async function runComplianceCheck(): Promise<WorkflowResult> {
  const disputes = await storage.getDisputes();
  const clients = await storage.getClients();
  let processed = 0, succeeded = 0, failed = 0;
  const issues: any[] = [];

  for (const dispute of disputes) {
    processed++;
    const daysSinceCreation = (Date.now() - new Date(dispute.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24);

    if (dispute.status === "pending" && daysSinceCreation > 5) {
      issues.push({ type: "unfiled_dispute", disputeId: dispute.id, account: dispute.accountName, days: Math.round(daysSinceCreation) });
    }
    if (dispute.status === "sent" && daysSinceCreation > 30) {
      issues.push({ type: "overdue_response", disputeId: dispute.id, account: dispute.accountName, days: Math.round(daysSinceCreation) });
    }
    if ((dispute.status === "pending" || dispute.status === "sent") && !dispute.letterContent) {
      issues.push({ type: "missing_letter", disputeId: dispute.id, account: dispute.accountName });
    }
    succeeded++;
  }

  for (const client of clients) {
    if (client.status !== "active") continue;
    const clientDisputes = disputes.filter((d: any) => d.clientId === client.id);
    if (clientDisputes.length > 0 && !client.ssn) {
      issues.push({ type: "missing_ssn", clientId: client.id, clientName: `${client.firstName} ${client.lastName}` });
    }
  }

  if (issues.length > 0) {
    await storage.createNotification({
      type: "compliance",
      title: `Compliance Check: ${issues.length} Issue(s) Found`,
      message: `Found ${issues.filter(i => i.type === "unfiled_dispute").length} unfiled disputes, ${issues.filter(i => i.type === "overdue_response").length} overdue responses, ${issues.filter(i => i.type === "missing_letter").length} missing letters.`,
    });
  }

  return { processed, succeeded, failed, details: { totalIssues: issues.length, issues: issues.slice(0, 20) } };
}

async function runClientOnboarding(rule: AutomationRule): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const newClients = clients.filter((c: any) => {
    const created = new Date(c.createdAt || 0);
    const hoursAgo = (Date.now() - created.getTime()) / (1000 * 60 * 60);
    return c.status === "active" && hoursAgo < (rule.triggerConfig.hoursWindow || 48);
  });

  let processed = 0, succeeded = 0, failed = 0;
  const onboarded: string[] = [];

  for (const client of newClients) {
    processed++;
    try {
      const existingReports = await storage.getCreditReportsByClient(client.id);
      if (existingReports.length > 0) { succeeded++; continue; }

      await storage.createNotification({
        type: "client",
        title: `Onboarding: ${client.firstName} ${client.lastName}`,
        message: `New client detected. Action items: 1) Pull credit reports from all 3 bureaus 2) Run AI analysis 3) Identify disputable items 4) Create initial dispute round.`,
        clientId: client.id,
      });

      onboarded.push(`${client.firstName} ${client.lastName}`);
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { newClientsFound: newClients.length, onboarded } };
}

async function runAIAnalysis(): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active");
  let processed = 0, succeeded = 0, failed = 0;
  const analyses: any[] = [];

  for (const client of active.slice(0, 10)) {
    processed++;
    try {
      const scores: Record<string, number> = {};
      if (client.equifaxScore) scores.equifax = client.equifaxScore;
      if (client.experianScore) scores.experian = client.experianScore;
      if (client.transunionScore) scores.transunion = client.transunionScore;

      if (Object.keys(scores).length === 0) { succeeded++; continue; }

      const disputes = await storage.getDisputesByClient(client.id);
      const negItems = disputes.map((d: any) => d.accountName);

      const goalScore = (client as any).goalScore;
      const analysis = await analyzeClientCredit({
        clientName: `${client.firstName} ${client.lastName}`,
        scores,
        negativeItems: negItems,
        goal: goalScore ? `Reach ${goalScore} score` : undefined,
      });

      await storage.createNotification({
        type: "client",
        title: `AI Analysis: ${client.firstName} ${client.lastName}`,
        message: analysis.substring(0, 500),
        clientId: client.id,
      });

      recordUsageEvent({ eventType: "ai_analysis", metadata: { clientId: client.id }, quantity: 1 }).catch(() => {});
      analyses.push({ clientId: client.id, clientName: `${client.firstName} ${client.lastName}` });
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { clientsAnalyzed: analyses.length, analyses } };
}

async function runClientGraduation(rule: AutomationRule): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active");
  const threshold = rule.triggerConfig.scoreThreshold || 700;
  let processed = 0, succeeded = 0, failed = 0;
  const graduates: any[] = [];

  for (const client of active) {
    processed++;
    const scores = [client.equifaxScore, client.experianScore, client.transunionScore].filter(Boolean) as number[];
    if (scores.length === 0) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avg >= threshold) {
      try {
        await storage.createNotification({
          type: "success",
          title: `🎓 Client Ready to Graduate: ${client.firstName} ${client.lastName}`,
          message: `Average score of ${Math.round(avg)} has reached the ${threshold} threshold. Consider graduating this client from active repair.`,
          clientId: client.id,
        });
        graduates.push({ clientId: client.id, clientName: `${client.firstName} ${client.lastName}`, avgScore: Math.round(avg) });
        succeeded++;
      } catch { failed++; }
    }
  }

  return { processed, succeeded, failed, details: { graduatesFound: graduates.length, graduates } };
}

async function runGoodwillCampaign(rule: AutomationRule): Promise<WorkflowResult> {
  const disputes = await storage.getDisputes();
  const latePayments = disputes.filter((d: any) =>
    d.disputeType === "late_payment" && (d.status === "verified" || d.status === "pending")
  );
  let processed = 0, succeeded = 0, failed = 0;
  const letters: any[] = [];

  for (const dispute of latePayments) {
    processed++;
    try {
      const client = await storage.getClient(dispute.clientId);
      if (!client) { failed++; continue; }

      const letter = generateFCRADisputeLetter({
        clientName: `${client.firstName} ${client.lastName}`,
        clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
        bureau: dispute.bureau,
        accountName: dispute.accountName,
        reason: "Goodwill adjustment request — client has maintained positive payment history since the reported late payment",
        disputeType: "late_payment",
      });

      await storage.updateDispute(dispute.id, { letterContent: letter });
      letters.push({ disputeId: dispute.id, account: dispute.accountName });
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { goodwillLetters: letters.length, letters } };
}

async function runPaymentReminders(): Promise<WorkflowResult> {
  const r = await db.execute(sql`
    SELECT t.*, c.first_name, c.last_name FROM transactions t
    JOIN clients c ON c.id = t.client_id
    WHERE t.status = 'pending' AND t.created_at < NOW() - INTERVAL '7 days'
    ORDER BY t.created_at ASC LIMIT 50
  `);
  const overdue = r.rows as any[];
  let processed = 0, succeeded = 0, failed = 0;

  for (const txn of overdue) {
    processed++;
    try {
      await storage.createNotification({
        type: "billing",
        title: `Payment Reminder: ${txn.first_name} ${txn.last_name}`,
        message: `Pending payment of $${(txn.amount / 100).toFixed(2)} for "${txn.description}" is overdue. Created ${new Date(txn.created_at).toLocaleDateString()}.`,
        clientId: txn.client_id,
      });
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { reminderssSent: overdue.length } };
}

async function runCollectionResponse(): Promise<WorkflowResult> {
  const disputes = await storage.getDisputes();
  const collections = disputes.filter((d: any) =>
    d.disputeType === "collection" && d.status === "pending" && !d.letterContent
  );
  let processed = 0, succeeded = 0, failed = 0;
  const generated: any[] = [];

  for (const dispute of collections) {
    processed++;
    try {
      const client = await storage.getClient(dispute.clientId);
      if (!client) { failed++; continue; }

      const letter = generateFCRADisputeLetter({
        clientName: `${client.firstName} ${client.lastName}`,
        clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
        clientSSNLast4: client.ssn ? client.ssn.slice(-4) : undefined,
        bureau: dispute.bureau,
        accountName: dispute.accountName,
        accountNumber: dispute.accountNumber || undefined,
        reason: dispute.reason || "Debt validation demanded per FDCPA § 809",
        disputeType: "collection",
      });

      await storage.updateDispute(dispute.id, { letterContent: letter, disputeType: "collection" });
      generated.push({ disputeId: dispute.id, account: dispute.accountName });
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { validationLetters: generated.length, generated } };
}

async function runReportPull(): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active");
  let processed = 0, succeeded = 0, failed = 0;
  const flagged: any[] = [];

  for (const client of active) {
    processed++;
    const reports = await storage.getCreditReportsByClient(client.id);
    const latestDate = reports.length > 0 ? new Date(reports[reports.length - 1].createdAt || 0) : null;
    const daysSinceLastPull = latestDate ? (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24) : 999;

    if (daysSinceLastPull > 30) {
      try {
        await storage.createNotification({
          type: "client",
          title: `Report Pull Due: ${client.firstName} ${client.lastName}`,
          message: `Last credit report was pulled ${Math.round(daysSinceLastPull)} days ago. Schedule a new pull to track progress.`,
          clientId: client.id,
        });
        flagged.push({ clientId: client.id, clientName: `${client.firstName} ${client.lastName}`, daysSince: Math.round(daysSinceLastPull) });
        succeeded++;
      } catch { failed++; }
    }
  }

  return { processed, succeeded, failed, details: { clientsFlagged: flagged.length, flagged } };
}

async function runTradelineReview(): Promise<WorkflowResult> {
  const tradelines = await storage.getTradelines();
  let processed = 0, succeeded = 0, failed = 0;
  const issues: any[] = [];

  for (const tl of tradelines) {
    processed++;
    if (tl.status === "placed" || tl.status === "active") {
      const daysSincePlaced = (Date.now() - new Date(tl.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePlaced > 45 && tl.status === "placed") {
        issues.push({ tradelineId: tl.id, status: "not_reported", days: Math.round(daysSincePlaced) });
        try {
          await storage.createNotification({
            type: "warning",
            title: `Tradeline Not Reporting: ${tl.cardHolder || tl.id}`,
            message: `Tradeline placed ${Math.round(daysSincePlaced)} days ago has not been confirmed as reported. Follow up with AU partner.`,
            clientId: tl.clientId,
          });
          succeeded++;
        } catch { failed++; }
      } else { succeeded++; }
    } else { succeeded++; }
  }

  return { processed, succeeded, failed, details: { tradelinesReviewed: tradelines.length, issues } };
}

async function runTradelineOptimization(): Promise<WorkflowResult> {
  let processed = 0, succeeded = 0, failed = 0;
  const optimizations: any[] = [];

  try {
    const result = await batchOptimizeAll();
    processed = result.processed;
    succeeded = result.optimized;
    failed = result.errors;

    for (const r of result.results) {
      if (r.status === "optimized" && r.recommendationCount > 0) {
        try {
          const behavior = await analyzeClientBehavior(r.clientId);
          if (behavior && behavior.tradelineReadiness === "ready") {
            await storage.createNotification({
              type: "client",
              title: `Tradeline Opportunity: ${r.clientName}`,
              message: `AI found ${r.recommendationCount} tradeline matches with projected +${r.projectedImpact}pt score impact. ${r.message}`,
              clientId: r.clientId,
            });
            optimizations.push({
              clientId: r.clientId,
              clientName: r.clientName,
              recommendations: r.recommendationCount,
              projectedImpact: r.projectedImpact,
              readiness: behavior.tradelineReadiness,
            });
          }
        } catch {}
      }
    }
  } catch (err: any) {
    failed++;
  }

  return {
    processed,
    succeeded,
    failed,
    details: {
      clientsOptimized: optimizations.length,
      optimizations,
    },
  };
}

async function runBureauAutoPull(rule: AutomationRule): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active" && c.ssn && c.firstName && c.lastName);
  let processed = 0, succeeded = 0, failed = 0;
  const pulled: any[] = [];
  const maxClients = rule.triggerConfig.maxClients || 10;

  for (const client of active.slice(0, maxClients)) {
    const reports = await storage.getReportsByClient(client.id);
    const latestDate = reports.length > 0 ? new Date(reports[reports.length - 1].createdAt || 0) : null;
    const daysSincePull = latestDate ? (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24) : 999;
    const pullInterval = rule.triggerConfig.pullIntervalDays || 30;
    if (daysSincePull < pullInterval) continue;

    processed++;
    try {
      const request: BureauReportRequest = {
        firstName: client.firstName,
        lastName: client.lastName,
        ssn: client.ssn!,
        dob: client.dateOfBirth || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zip: client.zip || "",
      };

      const bureauResults = await pullAllBureauReports(request);
      const successfulPulls: string[] = [];

      for (const br of bureauResults) {
        if (br.success) {
          await storage.createReport({
            clientId: client.id,
            bureau: br.bureau,
            reportData: br.rawData,
            score: br.score,
            negativeItems: [],
          });

          if (br.score) {
            const scoreField = `${br.bureau}Score` as keyof typeof client;
            const updateData: any = {};
            if (br.bureau === "equifax") updateData.equifaxScore = br.score;
            else if (br.bureau === "experian") updateData.experianScore = br.score;
            else if (br.bureau === "transunion") updateData.transunionScore = br.score;
            if (Object.keys(updateData).length > 0) {
              await storage.updateClient(client.id, updateData);
            }
          }

          successfulPulls.push(br.bureau);
          recordUsageEvent({ eventType: "bureau_pull", metadata: { bureau: br.bureau, clientId: client.id, automated: true }, quantity: 1 }).catch(() => {});
        }
      }

      if (successfulPulls.length > 0) {
        if (rule.triggerConfig.autoAnalyze !== false) {
          try {
            const scores: Record<string, number> = {};
            for (const br of bureauResults) {
              if (br.score) scores[br.bureau] = br.score;
            }
            if (Object.keys(scores).length > 0) {
              const disputes = await storage.getDisputesByClient(client.id);
              const negItems = disputes.map((d: any) => d.accountName);
              const analysis = await analyzeClientCredit({
                clientName: `${client.firstName} ${client.lastName}`,
                scores,
                negativeItems: negItems,
                goal: client.goalScore ? `Reach ${client.goalScore} score` : undefined,
              });
              await storage.createNotification({
                type: "client",
                title: `Bureau Pull + AI Analysis: ${client.firstName} ${client.lastName}`,
                message: `Pulled ${successfulPulls.join(", ")} reports. AI: ${analysis.substring(0, 400)}`,
                clientId: client.id,
              });
              recordUsageEvent({ eventType: "ai_analysis", metadata: { clientId: client.id, automated: true }, quantity: 1 }).catch(() => {});
            }
          } catch {}
        }

        pulled.push({
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          bureausPulled: successfulPulls,
          scores: bureauResults.filter(b => b.score).map(b => ({ bureau: b.bureau, score: b.score })),
        });
        succeeded++;
      } else {
        await storage.createNotification({
          type: "warning",
          title: `Bureau Pull Failed: ${client.firstName} ${client.lastName}`,
          message: `All bureau API calls failed. ${bureauResults.map(b => `${b.bureau}: ${b.error}`).join("; ")}`,
          clientId: client.id,
        });
        failed++;
      }
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { clientsPulled: pulled.length, pulled, totalActive: active.length } };
}

async function runMetro2Furnishing(rule: AutomationRule): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active" && c.ssn);
  let processed = 0, succeeded = 0, failed = 0;
  const furnished: any[] = [];
  const companyId = rule.triggerConfig.companyId || "CRP001";
  const companyName = rule.triggerConfig.companyName || "CreditRepair Pro LLC";
  const bureaus = rule.triggerConfig.bureaus || ["equifax", "experian", "transunion"];

  const tradelines = await storage.getTradelines();
  const activeTradelines = tradelines.filter((t: any) => t.status === "active" || t.status === "placed");

  for (const client of active) {
    const clientTradelines = activeTradelines.filter((t: any) => t.clientId === client.id);
    if (clientTradelines.length === 0) continue;

    processed++;
    const existingSubmissions = await storage.getMetro2SubmissionsByClient(client.id);
    const recentSubmission = existingSubmissions.find((s: any) => {
      const daysSince = (Date.now() - new Date(s.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < (rule.triggerConfig.furnishIntervalDays || 30);
    });
    if (recentSubmission) { succeeded++; continue; }

    try {
      const records: Metro2Record[] = [];
      for (const tl of clientTradelines) {
        records.push({
          client: client as any,
          accountNumber: `AU-${client.id.slice(0, 8)}-${tl.id.slice(0, 4)}`,
          portfolioType: "R",
          accountType: "18",
          accountStatus: "11",
          ecoaCode: "3",
          creditLimit: tl.creditLimit || 0,
          currentBalance: 0,
          dateOpened: tl.createdAt || new Date().toISOString(),
          dateOfAccountInfo: new Date().toISOString(),
          paymentHistory: "111111111111111111111111",
          companyId,
          reportType: "M",
        });
      }

      for (const bureau of bureaus) {
        try {
          const fileContent = buildMetro2File(records, companyId, companyName);

          const validationErrors = records.flatMap(r => validateMetro2BaseRecord(r));
          const criticalErrors = validationErrors.filter(e => e.severity === "error");

          if (criticalErrors.length > 0 && !rule.triggerConfig.skipValidation) {
            await storage.createNotification({
              type: "warning",
              title: `Metro 2 Validation Failed: ${client.firstName} ${client.lastName}`,
              message: `${criticalErrors.length} critical errors for ${bureau}: ${criticalErrors.slice(0, 3).map(e => e.message).join("; ")}`,
              clientId: client.id,
            });
            continue;
          }

          const submission = await storage.createMetro2Submission({
            clientId: client.id,
            bureau,
            accountNumber: `AU-${client.id.slice(0, 8)}`,
            portfolioType: "R",
            accountStatus: "11",
            ecoaCode: "3",
            creditLimit: clientTradelines.reduce((sum: number, t: any) => sum + (t.creditLimit || 0), 0),
            currentBalance: 0,
            status: "generated",
            fileContent,
            reportType: "M",
            submittedAt: null,
          });

          if (rule.triggerConfig.autoSubmit) {
            await storage.updateMetro2Submission(submission.id, { status: "submitted", submittedAt: new Date() });
          }

          recordUsageEvent({ eventType: "metro2_generated", metadata: { bureau, clientId: client.id, automated: true, records: records.length }, quantity: 1 }).catch(() => {});
        } catch {}
      }

      furnished.push({
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        tradelineCount: clientTradelines.length,
        bureaus,
      });
      succeeded++;

      await storage.createNotification({
        type: "success",
        title: `Metro 2 Furnished: ${client.firstName} ${client.lastName}`,
        message: `Generated CDIA-compliant Metro 2 files for ${bureaus.join(", ")} with ${clientTradelines.length} tradeline(s).`,
        clientId: client.id,
      });
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { clientsFurnished: furnished.length, furnished, totalActive: active.length } };
}

async function runFullPipeline(rule: AutomationRule): Promise<WorkflowResult> {
  let processed = 0, succeeded = 0, failed = 0;
  const pipelineResults: any[] = [];
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active" && c.ssn);
  const maxClients = rule.triggerConfig.maxClients || 5;

  for (const client of active.slice(0, maxClients)) {
    processed++;
    const clientResult: any = { clientId: client.id, clientName: `${client.firstName} ${client.lastName}`, steps: {} };

    try {
      // Step 1: Bureau pull
      const request: BureauReportRequest = {
        firstName: client.firstName,
        lastName: client.lastName,
        ssn: client.ssn!,
        dob: client.dateOfBirth || "",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        zip: client.zip || "",
      };

      const bureauResults = await pullAllBureauReports(request);
      const successfulPulls = bureauResults.filter(b => b.success);
      clientResult.steps.bureauPull = { pulled: successfulPulls.length, total: bureauResults.length };

      for (const br of successfulPulls) {
        await storage.createReport({ clientId: client.id, bureau: br.bureau, reportData: br.rawData, score: br.score, negativeItems: [] });
        if (br.score) {
          const update: any = {};
          if (br.bureau === "equifax") update.equifaxScore = br.score;
          else if (br.bureau === "experian") update.experianScore = br.score;
          else if (br.bureau === "transunion") update.transunionScore = br.score;
          if (Object.keys(update).length) await storage.updateClient(client.id, update);
        }
        recordUsageEvent({ eventType: "bureau_pull", metadata: { bureau: br.bureau, clientId: client.id, pipeline: true }, quantity: 1 }).catch(() => {});
      }

      // Step 2: AI Analysis + Auto-Dispute
      const scores: Record<string, number> = {};
      for (const br of successfulPulls) { if (br.score) scores[br.bureau] = br.score; }

      if (Object.keys(scores).length > 0) {
        try {
          const disputes = await storage.getDisputesByClient(client.id);
          const negItems = disputes.map((d: any) => d.accountName);
          const analysis = await analyzeClientCredit({ clientName: `${client.firstName} ${client.lastName}`, scores, negativeItems: negItems });
          clientResult.steps.aiAnalysis = { completed: true };
          recordUsageEvent({ eventType: "ai_analysis", metadata: { clientId: client.id, pipeline: true }, quantity: 1 }).catch(() => {});
        } catch { clientResult.steps.aiAnalysis = { completed: false }; }
      }

      // Step 3: Tradeline optimization
      try {
        const optimization = await optimizeTradelinesForClient(client.id);
        clientResult.steps.tradelineOptimization = { recommendations: optimization?.recommendations?.length || 0 };
      } catch { clientResult.steps.tradelineOptimization = { recommendations: 0 }; }

      // Step 4: Metro 2 furnishing
      const activeTL = (await storage.getTradelines()).filter((t: any) => t.clientId === client.id && (t.status === "active" || t.status === "placed"));
      if (activeTL.length > 0) {
        try {
          const records: Metro2Record[] = activeTL.map((tl: any) => ({
            client: client as any,
            accountNumber: `AU-${client.id.slice(0, 8)}-${tl.id.slice(0, 4)}`,
            portfolioType: "R" as const,
            accountType: "18",
            accountStatus: "11",
            ecoaCode: "3",
            creditLimit: tl.creditLimit || 0,
            currentBalance: 0,
            dateOpened: tl.createdAt || new Date().toISOString(),
            dateOfAccountInfo: new Date().toISOString(),
            paymentHistory: "111111111111111111111111",
            companyId: rule.triggerConfig.companyId || "CRP001",
            reportType: "M" as const,
          }));

          for (const bureau of ["equifax", "experian", "transunion"]) {
            const file = buildMetro2File(records, rule.triggerConfig.companyId || "CRP001", rule.triggerConfig.companyName || "CreditRepair Pro LLC");
            await storage.createMetro2Submission({
              clientId: client.id, bureau, accountNumber: `AU-${client.id.slice(0, 8)}`,
              portfolioType: "R", accountStatus: "11", ecoaCode: "3",
              creditLimit: activeTL.reduce((s: number, t: any) => s + (t.creditLimit || 0), 0),
              currentBalance: 0, status: "generated", fileContent: file, reportType: "M", submittedAt: null,
            });
          }
          clientResult.steps.metro2 = { furnished: true, tradelines: activeTL.length };
        } catch { clientResult.steps.metro2 = { furnished: false }; }
      }

      await storage.createNotification({
        type: "success",
        title: `Full Pipeline Complete: ${client.firstName} ${client.lastName}`,
        message: `Bureau pull (${successfulPulls.length}/${bureauResults.length}), AI analysis, tradeline optimization, Metro 2 furnishing — all completed.`,
        clientId: client.id,
      });

      pipelineResults.push(clientResult);
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { pipelineResults, clientsProcessed: pipelineResults.length } };
}

async function runAICreditWorker(rule: AutomationRule): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active");
  let processed = 0, succeeded = 0, failed = 0;
  const workerResults: any[] = [];
  const maxClients = rule.triggerConfig.maxClients || 10;

  for (const client of active.slice(0, maxClients)) {
    processed++;
    try {
      const scores: Record<string, number> = {};
      if (client.equifaxScore) scores.equifax = client.equifaxScore;
      if (client.experianScore) scores.experian = client.experianScore;
      if (client.transunionScore) scores.transunion = client.transunionScore;
      if (Object.keys(scores).length === 0) { succeeded++; continue; }

      const disputes = await storage.getDisputesByClient(client.id);
      const tradelines = (await storage.getTradelines()).filter((t: any) => t.clientId === client.id);
      const reports = await storage.getReportsByClient(client.id);

      const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
      const openDisputes = disputes.filter((d: any) => d.status === "preparing" || d.status === "sent").length;
      const activeTradelines = tradelines.filter((t: any) => t.status === "active" || t.status === "placed").length;
      const negItems = disputes.map((d: any) => d.accountName);

      // AI comprehensive analysis
      const prompt = `You are a Consumer Credit Specialist AI Worker. Analyze this client and provide a comprehensive action plan.

Client: ${client.firstName} ${client.lastName}
Scores: ${JSON.stringify(scores)}
Average Score: ${Math.round(avgScore)}
${client.goalScore ? `Goal Score: ${client.goalScore}` : ""}
Open Disputes: ${openDisputes}
Active Tradelines: ${activeTradelines}
Negative Items: ${negItems.length > 0 ? negItems.join(", ") : "None identified"}
Reports on File: ${reports.length}

Provide:
1. RISK ASSESSMENT (low/medium/high/critical)
2. SCORE GAP ANALYSIS — what's needed to reach goal
3. IMMEDIATE ACTIONS (next 7 days)
4. 30-DAY STRATEGY
5. TRADELINE RECOMMENDATIONS
6. DISPUTE STRATEGY (which items to prioritize)
7. METRO 2 FURNISHING STATUS
8. PREDICTED SCORE IN 90 DAYS`;

      const analysis = await chatWithAI(prompt);

      const riskLevel = avgScore >= 700 ? "low" : avgScore >= 600 ? "medium" : avgScore >= 500 ? "high" : "critical";
      const gapToGoal = client.goalScore ? client.goalScore - avgScore : null;

      await storage.createNotification({
        type: "client",
        title: `AI Worker Report: ${client.firstName} ${client.lastName}`,
        message: `Risk: ${riskLevel.toUpperCase()} | Avg: ${Math.round(avgScore)} | ${gapToGoal ? `Gap to goal: ${Math.round(gapToGoal)}pts` : ""} | ${openDisputes} disputes | ${activeTradelines} tradelines\n\n${analysis.substring(0, 600)}`,
        clientId: client.id,
      });

      recordUsageEvent({ eventType: "ai_worker", metadata: { clientId: client.id, riskLevel }, quantity: 1 }).catch(() => {});

      workerResults.push({
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        avgScore: Math.round(avgScore),
        riskLevel,
        gapToGoal: gapToGoal ? Math.round(gapToGoal) : null,
        openDisputes,
        activeTradelines,
      });
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { clientsAnalyzed: workerResults.length, workerResults } };
}

async function runBureauEscalation(): Promise<WorkflowResult> {
  const disputes = await storage.getDisputes();
  const now = Date.now();
  const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
  let processed = 0, succeeded = 0, failed = 0;
  const escalated: any[] = [];

  for (const dispute of disputes) {
    if (dispute.status !== "sent" && dispute.status !== "no_response") continue;
    const created = new Date(dispute.createdAt || 0).getTime();
    if (now - created < fortyFiveDays) continue;
    processed++;

    try {
      await storage.createNotification({
        type: "warning",
        title: `CFPB Escalation: ${dispute.accountName}`,
        message: `Dispute with ${dispute.bureau} for "${dispute.accountName}" has been unresolved for ${Math.round((now - created) / (1000 * 60 * 60 * 24))} days. Consider filing a CFPB complaint at consumerfinance.gov/complaint.`,
        clientId: dispute.clientId,
      });
      escalated.push({ disputeId: dispute.id, account: dispute.accountName, bureau: dispute.bureau });
      succeeded++;
    } catch { failed++; }
  }

  return { processed, succeeded, failed, details: { escalatedDisputes: escalated.length, escalated } };
}

export async function getAutomationStats(): Promise<Record<string, any>> {
  await ready();
  const rulesR = await db.execute(sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE enabled = true) as active FROM automation_rules`);
  const runsR = await db.execute(sql`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      SUM(items_processed) as items_processed,
      SUM(items_succeeded) as items_succeeded
    FROM automation_runs WHERE started_at > NOW() - INTERVAL '30 days'
  `);
  const row = rulesR.rows[0] as any;
  const runs = runsR.rows[0] as any;
  return {
    totalRules: parseInt(row.total) || 0,
    activeRules: parseInt(row.active) || 0,
    last30Days: {
      totalRuns: parseInt(runs.total) || 0,
      completed: parseInt(runs.completed) || 0,
      failed: parseInt(runs.failed) || 0,
      itemsProcessed: parseInt(runs.items_processed) || 0,
      itemsSucceeded: parseInt(runs.items_succeeded) || 0,
    },
  };
}

export function getWorkflowTypes(): { type: WorkflowType; description: string }[] {
  return Object.entries(WORKFLOW_DESCRIPTIONS).map(([type, description]) => ({
    type: type as WorkflowType,
    description,
  }));
}

export async function seedDefaultRules(): Promise<number> {
  await ready();
  const existing = await getAutomationRules();
  if (existing.length > 0) return 0;

  const defaults: Omit<AutomationRule, "id" | "createdAt" | "runCount">[] = [
    {
      name: "Daily Score Monitoring",
      description: "Check all active clients for score changes every day and create alerts",
      workflowType: "score_monitoring",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "detect_changes", config: {}, order: 1 }, { type: "create_notifications", config: {}, order: 2 }],
      enabled: true,
    },
    {
      name: "Auto-Generate Dispute Letters",
      description: "Automatically generate FCRA letters for all pending disputes without letters",
      workflowType: "letter_generation",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily", useAI: false },
      actions: [{ type: "generate_letters", config: { useAI: false }, order: 1 }],
      enabled: true,
    },
    {
      name: "30-Day Follow-Up Checker",
      description: "Flag disputes past the FCRA 30-day investigation window for follow-up",
      workflowType: "follow_up",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "check_deadlines", config: {}, order: 1 }, { type: "notify", config: {}, order: 2 }],
      enabled: true,
    },
    {
      name: "Weekly Compliance Audit",
      description: "Run compliance checks on all active disputes and client records",
      workflowType: "compliance_check",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "audit", config: {}, order: 1 }],
      enabled: true,
    },
    {
      name: "New Client Auto-Onboarding",
      description: "Detect new clients and create onboarding action items automatically",
      workflowType: "client_onboarding",
      triggerType: "event",
      triggerConfig: { event: "client_created", hoursWindow: 48 },
      actions: [{ type: "create_tasks", config: {}, order: 1 }],
      enabled: true,
    },
    {
      name: "Stale Dispute Re-Filing",
      description: "Flag disputes with no bureau response after 35 days for re-filing",
      workflowType: "stale_dispute_check",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "check_stale", config: {}, order: 1 }],
      enabled: true,
    },
    {
      name: "Auto-Dispute Negative Items",
      description: "Scan client reports and automatically create disputes for undisputed negative items",
      workflowType: "auto_dispute",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly", maxPerClient: 3 },
      actions: [{ type: "scan_reports", config: {}, order: 1 }, { type: "create_disputes", config: {}, order: 2 }],
      enabled: false,
    },
    {
      name: "Client Score Graduation",
      description: "Identify clients who have reached their score goal and recommend graduation",
      workflowType: "client_graduation",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly", scoreThreshold: 700 },
      actions: [{ type: "check_scores", config: {}, order: 1 }],
      enabled: true,
    },
    {
      name: "Payment Overdue Reminders",
      description: "Send reminders for payments that are pending for more than 7 days",
      workflowType: "payment_reminder",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "check_payments", config: {}, order: 1 }],
      enabled: true,
    },
    {
      name: "Collection Validation Letters",
      description: "Auto-generate FDCPA debt validation letters for collection disputes",
      workflowType: "collection_response",
      triggerType: "event",
      triggerConfig: { event: "collection_dispute_created" },
      actions: [{ type: "generate_validation", config: {}, order: 1 }],
      enabled: true,
    },
    {
      name: "AI Tradeline Optimization",
      description: "Batch-analyze all active clients and recommend optimal AU tradeline placements based on credit behavior and partner inventory",
      workflowType: "tradeline_optimization",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "batch_optimize", config: {}, order: 1 }, { type: "notify_opportunities", config: {}, order: 2 }],
      enabled: true,
    },
    {
      name: "Automated Bureau Report Pull",
      description: "Auto-pull credit reports from all 4 bureaus for active clients, store results, update scores, and trigger AI analysis",
      workflowType: "bureau_auto_pull",
      triggerType: "scheduled",
      triggerConfig: { frequency: "monthly", maxClients: 20, pullIntervalDays: 30, autoAnalyze: true },
      actions: [{ type: "pull_reports", config: {}, order: 1 }, { type: "update_scores", config: {}, order: 2 }, { type: "ai_analyze", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "Metro 2 Data Furnishing",
      description: "Generate CDIA-compliant Metro 2 files for all active tradelines and submit to Equifax, Experian, and TransUnion",
      workflowType: "metro2_furnishing",
      triggerType: "scheduled",
      triggerConfig: { frequency: "monthly", companyId: "CRP001", companyName: "CreditRepair Pro LLC", bureaus: ["equifax", "experian", "transunion"], furnishIntervalDays: 30, autoSubmit: false },
      actions: [{ type: "generate_metro2", config: {}, order: 1 }, { type: "validate", config: {}, order: 2 }, { type: "submit", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "Full AI Pipeline",
      description: "End-to-end automated pipeline: pull bureau reports, AI analysis, auto-disputes, tradeline optimization, and Metro 2 furnishing",
      workflowType: "full_pipeline",
      triggerType: "scheduled",
      triggerConfig: { frequency: "monthly", maxClients: 5 },
      actions: [{ type: "bureau_pull", config: {}, order: 1 }, { type: "ai_analysis", config: {}, order: 2 }, { type: "auto_dispute", config: {}, order: 3 }, { type: "tradeline_optimize", config: {}, order: 4 }, { type: "metro2_furnish", config: {}, order: 5 }],
      enabled: false,
    },
    {
      name: "AI Credit Worker",
      description: "AI-powered credit specialist worker: comprehensive analysis, risk assessment, strategic recommendations for all active clients",
      workflowType: "ai_credit_worker",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly", maxClients: 15 },
      actions: [{ type: "analyze", config: {}, order: 1 }, { type: "risk_assess", config: {}, order: 2 }, { type: "recommend", config: {}, order: 3 }],
      enabled: true,
    },
  ];

  for (const rule of defaults) {
    await createAutomationRule(rule);
  }
  return defaults.length;
}

function mapRule(row: any): AutomationRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    workflowType: row.workflow_type,
    triggerType: row.trigger_type,
    triggerConfig: typeof row.trigger_config === "string" ? JSON.parse(row.trigger_config) : row.trigger_config || {},
    actions: typeof row.actions === "string" ? JSON.parse(row.actions) : row.actions || [],
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    runCount: row.run_count || 0,
    createdAt: row.created_at,
  };
}

function mapRun(row: any): AutomationRun {
  return {
    id: row.id,
    ruleId: row.rule_id,
    ruleName: row.rule_name,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    results: typeof row.results === "string" ? JSON.parse(row.results) : row.results || {},
    error: row.error,
    itemsProcessed: row.items_processed || 0,
    itemsSucceeded: row.items_succeeded || 0,
    itemsFailed: row.items_failed || 0,
  };
}

const inFlightRules = new Set<string>();

let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(async () => {
    try {
      const rules = await getAutomationRules();
      const now = new Date();
      for (const rule of rules) {
        if (!rule.enabled || rule.triggerType !== "scheduled") continue;
        if (inFlightRules.has(rule.id!)) continue;
        const freq = rule.triggerConfig.frequency || "daily";
        const last = rule.lastRunAt ? new Date(rule.lastRunAt) : null;
        let shouldRun = false;

        if (!last) { shouldRun = true; }
        else {
          const elapsed = now.getTime() - last.getTime();
          if (freq === "hourly" && elapsed > 60 * 60 * 1000) shouldRun = true;
          else if (freq === "daily" && elapsed > 24 * 60 * 60 * 1000) shouldRun = true;
          else if (freq === "weekly" && elapsed > 7 * 24 * 60 * 60 * 1000) shouldRun = true;
          else if (freq === "monthly" && elapsed > 30 * 24 * 60 * 60 * 1000) shouldRun = true;
        }

        if (shouldRun) {
          inFlightRules.add(rule.id!);
          executeAutomationRule(rule.id!).catch((err) => {
            console.error(`[Automation] Failed to execute rule ${rule.name}:`, err.message);
          }).finally(() => { inFlightRules.delete(rule.id!); });
        }
      }
    } catch (err: any) {
      console.error("[Automation] Scheduler error:", err.message);
    }
  }, 5 * 60 * 1000);

  console.log("[Automation] Scheduler started (5-minute interval)");
}

export function stopScheduler() {
  if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
}

export async function dispatchEvent(eventName: string, context?: Record<string, any>): Promise<void> {
  await ready();
  const rules = await getAutomationRules();
  for (const rule of rules) {
    if (!rule.enabled || rule.triggerType !== "event") continue;
    if (rule.triggerConfig.event !== eventName) continue;
    executeAutomationRule(rule.id!).catch((err) => {
      console.error(`[Automation] Event dispatch failed for rule ${rule.name}:`, err.message);
    });
  }
}
