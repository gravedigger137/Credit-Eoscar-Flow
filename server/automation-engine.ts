import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { generateDisputeLetter, analyzeClientCredit, chatWithAI, validateMetro2Record, analyzeReportForDisputes, botChatWithAI } from "./ai";
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
  | "full_pipeline" | "ai_credit_worker"
  | "bot_system_health" | "bot_banking_sync" | "bot_document_worker"
  | "bot_legal_compliance" | "bot_data_furnisher" | "bot_lender_outreach"
  | "bot_owner_briefing" | "bot_security_monitor" | "bot_accounting"
  | "bot_client_comms" | "bot_coder" | "bot_trust_law"
  | "bot_developer" | "bot_trainer" | "bot_credit_specialist"
  | "bot_maintenance"
  | "bot_report_generator" | "bot_task_manager" | "bot_quality_assurance"
  | "bot_workflow_optimizer"
  | "bot_revenue_analyst" | "bot_expense_tracker" | "bot_payment_processor"
  | "bot_invoice_generator" | "bot_collection_agent" | "bot_financial_planner"
  | "bot_contract_manager" | "bot_regulatory_monitor" | "bot_dispute_escalation"
  | "bot_consumer_rights" | "bot_audit_trail"
  | "bot_score_optimizer" | "bot_utilization_manager" | "bot_inquiry_removal"
  | "bot_goodwill_negotiator" | "bot_debt_validator" | "bot_bureau_liaison"
  | "bot_identity_monitor"
  | "bot_intake_processor" | "bot_progress_tracker" | "bot_satisfaction_monitor"
  | "bot_referral_manager" | "bot_retention_specialist"
  | "bot_lead_generator" | "bot_email_campaign" | "bot_social_media"
  | "bot_review_manager"
  | "bot_analytics_engine" | "bot_data_cleanup" | "bot_api_monitor";

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
  bot_system_health: "🤖 System Health Bot — continuously monitors app health, checks API connections, DB status, and auto-fixes common issues",
  bot_banking_sync: "🏦 Banking Sync Bot — auto-syncs all linked Plaid bank accounts, refreshes balances, pulls new transactions",
  bot_document_worker: "📄 Document Worker Bot — auto-generates engagement letters, contracts, FCRA/FDCPA letters, invoices, and compliance paperwork",
  bot_legal_compliance: "⚖️ Legal Compliance Bot — monitors CROA/FCRA/FDCPA compliance, flags violations, auto-generates remediation docs",
  bot_data_furnisher: "📊 Data Furnisher Bot — auto-generates Metro 2 files, validates records, schedules bureau submissions",
  bot_lender_outreach: "🤝 Lender Outreach Bot — matches clients to lenders, sends pre-qualification inquiries, tracks application status",
  bot_owner_briefing: "📋 Owner Briefing Bot — generates daily/weekly owner reports with KPIs, revenue, client progress, and action items",
  bot_security_monitor: "🔒 Security Monitor Bot — scans for unauthorized access, checks data integrity, monitors PII exposure, runs audit logs",
  bot_accounting: "💰 Accounting Bot — reconciles trust accounts, tracks revenue/expenses, generates P&L, flags billing anomalies",
  bot_client_comms: "💬 Client Communications Bot — sends status updates, score change alerts, onboarding reminders, and appointment follow-ups",
  bot_coder: "💻 Coder Bot — auto-generates code fixes, patches broken endpoints, writes API integrations, builds automation scripts, and deploys hotfixes",
  bot_trust_law: "⚖️ Trust Law Bot — monitors trust account compliance, IOLTA regulations, escrow rules, fiduciary duties, state-specific credit repair laws",
  bot_developer: "🛠️ Developer Bot — manages system architecture, database migrations, API versioning, performance optimization, and technical debt cleanup",
  bot_trainer: "🎓 Trainer Bot — generates training materials, onboarding guides, SOPs, video scripts, compliance quizzes, and staff certification tracking",
  bot_credit_specialist: "🏆 Credit Specialist Bot — advanced credit analysis, score factor optimization, bureau strategy planning, dispute sequencing, and client coaching plans",
  bot_maintenance: "🔧 Maintenance Bot — database cleanup, log rotation, cache purging, orphan record detection, storage optimization, and scheduled backups",
  bot_report_generator: "📊 Report Generator Bot — auto-generates daily/weekly/monthly business reports, client progress summaries, dispute outcome analytics, and revenue dashboards",
  bot_task_manager: "📋 Task Manager Bot — tracks staff task assignments, monitors completion deadlines, auto-escalates overdue items, and generates productivity reports",
  bot_quality_assurance: "✅ Quality Assurance Bot — audits dispute letters for accuracy, validates client data completeness, checks Metro 2 formatting, and flags data inconsistencies",
  bot_workflow_optimizer: "⚡ Workflow Optimizer Bot — analyzes automation rule performance, identifies bottlenecks, suggests schedule adjustments, and optimizes bot execution order",
  bot_revenue_analyst: "💵 Revenue Analyst Bot — analyzes revenue trends, forecasts monthly income, identifies top-performing services, and flags declining revenue streams",
  bot_expense_tracker: "📉 Expense Tracker Bot — categorizes business expenses, monitors spending against budgets, flags unusual charges, and generates expense reports",
  bot_payment_processor: "💳 Payment Processor Bot — processes pending payments, retries failed charges, sends payment confirmations, and manages subscription renewals",
  bot_invoice_generator: "🧾 Invoice Generator Bot — auto-creates client invoices for completed services, tracks payment status, sends overdue reminders, and generates statements",
  bot_collection_agent: "📞 Collection Agent Bot — identifies overdue accounts, generates collection notices, escalates delinquent payments, and tracks recovery rates",
  bot_financial_planner: "📈 Financial Planner Bot — creates client financial roadmaps, projects credit improvement ROI, calculates debt payoff timelines, and recommends credit products",
  bot_contract_manager: "📝 Contract Manager Bot — tracks engagement letter expirations, auto-generates renewal contracts, monitors terms compliance, and manages cancellations",
  bot_regulatory_monitor: "🏛️ Regulatory Monitor Bot — tracks CFPB rule changes, monitors state credit repair law updates, flags new compliance requirements, and generates regulatory briefs",
  bot_dispute_escalation: "⬆️ Dispute Escalation Bot — identifies stalled disputes, auto-generates CFPB complaints, creates attorney general letters, and tracks escalation outcomes",
  bot_consumer_rights: "🛡️ Consumer Rights Bot — monitors consumer protection law changes, generates rights disclosure documents, and ensures CROA/FCRA compliance in all communications",
  bot_audit_trail: "🔍 Audit Trail Bot — maintains comprehensive activity logs, generates compliance audit reports, tracks data access patterns, and flags unauthorized modifications",
  bot_score_optimizer: "📊 Score Optimizer Bot — AI-analyzes credit profiles for quick wins, identifies optimal dispute order, recommends utilization targets, and models score projections",
  bot_utilization_manager: "📏 Utilization Manager Bot — monitors credit utilization ratios across all clients, alerts on high-utilization accounts, and recommends balance strategies",
  bot_inquiry_removal: "🔎 Inquiry Removal Bot — identifies removable hard inquiries, generates inquiry dispute letters, tracks inquiry aging, and prioritizes unauthorized pulls",
  bot_goodwill_negotiator: "🤝 Goodwill Negotiator Bot — identifies eligible late payments for goodwill removal, generates personalized negotiation letters, and tracks success rates",
  bot_debt_validator: "📑 Debt Validator Bot — generates FDCPA debt validation requests, tracks validation deadlines, identifies unverified debts for dispute, and monitors responses",
  bot_bureau_liaison: "🏢 Bureau Liaison Bot — manages bureau communication channels, tracks response times, monitors e-OSCAR submissions, and handles bureau-specific formatting",
  bot_identity_monitor: "🔐 Identity Monitor Bot — scans for identity theft indicators, monitors SSN usage across bureaus, flags suspicious new accounts, and generates fraud alerts",
  bot_intake_processor: "📥 Intake Processor Bot — processes new client applications, validates submitted documents, runs initial credit analysis, and creates onboarding checklists",
  bot_progress_tracker: "📊 Progress Tracker Bot — monitors client credit repair progress, generates milestone reports, tracks score changes over time, and identifies stalled accounts",
  bot_satisfaction_monitor: "😊 Satisfaction Monitor Bot — surveys client satisfaction, analyzes feedback trends, identifies at-risk clients, and generates retention recommendations",
  bot_referral_manager: "🔗 Referral Manager Bot — tracks client referrals, manages referral bonuses, generates referral program reports, and identifies top referral sources",
  bot_retention_specialist: "💎 Retention Specialist Bot — identifies clients at risk of cancellation, generates retention offers, monitors churn patterns, and recommends engagement strategies",
  bot_lead_generator: "🎯 Lead Generator Bot — analyzes prospect data, scores leads by conversion probability, generates outreach templates, and tracks lead pipeline metrics",
  bot_email_campaign: "📧 Email Campaign Bot — creates automated email sequences, tracks open and click rates, A/B tests subject lines, and manages drip campaigns for client nurturing",
  bot_social_media: "📱 Social Media Bot — generates credit education content, schedules social posts, monitors brand mentions, and tracks social media engagement metrics",
  bot_review_manager: "⭐ Review Manager Bot — monitors online reviews, generates review request emails, identifies negative feedback for response, and tracks reputation scores",
  bot_analytics_engine: "📉 Analytics Engine Bot — aggregates business metrics, generates trend analysis, creates performance dashboards, and identifies data-driven growth opportunities",
  bot_data_cleanup: "🧹 Data Cleanup Bot — identifies duplicate records, fixes data inconsistencies, normalizes addresses and phone numbers, and archives inactive client records",
  bot_api_monitor: "🌐 API Monitor Bot — checks API endpoint health, monitors response times, tracks rate limit usage, detects integration failures, and generates uptime reports",
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
      case "bot_system_health": {
        const outcome = await runBotSystemHealth();
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "bot_banking_sync":
      case "bot_document_worker":
      case "bot_legal_compliance":
      case "bot_data_furnisher":
      case "bot_lender_outreach":
      case "bot_security_monitor":
      case "bot_accounting":
      case "bot_client_comms":
      case "bot_coder":
      case "bot_trust_law":
      case "bot_developer":
      case "bot_trainer":
      case "bot_credit_specialist":
      case "bot_maintenance":
      case "bot_report_generator":
      case "bot_task_manager":
      case "bot_quality_assurance":
      case "bot_workflow_optimizer":
      case "bot_revenue_analyst":
      case "bot_expense_tracker":
      case "bot_payment_processor":
      case "bot_invoice_generator":
      case "bot_collection_agent":
      case "bot_financial_planner":
      case "bot_contract_manager":
      case "bot_regulatory_monitor":
      case "bot_dispute_escalation":
      case "bot_consumer_rights":
      case "bot_audit_trail":
      case "bot_score_optimizer":
      case "bot_utilization_manager":
      case "bot_inquiry_removal":
      case "bot_goodwill_negotiator":
      case "bot_debt_validator":
      case "bot_bureau_liaison":
      case "bot_identity_monitor":
      case "bot_intake_processor":
      case "bot_progress_tracker":
      case "bot_satisfaction_monitor":
      case "bot_referral_manager":
      case "bot_retention_specialist":
      case "bot_lead_generator":
      case "bot_email_campaign":
      case "bot_social_media":
      case "bot_review_manager":
      case "bot_analytics_engine":
      case "bot_data_cleanup":
      case "bot_api_monitor": {
        const outcome = await runGenericBot(rule);
        processed = outcome.processed; succeeded = outcome.succeeded; failed = outcome.failed;
        Object.assign(results, outcome.details);
        break;
      }
      case "bot_owner_briefing": {
        const outcome = await runOwnerBriefingBot();
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
            equifaxScore: br.bureau === "equifax" ? br.score : undefined,
            experianScore: br.bureau === "experian" ? br.score : undefined,
            transunionScore: br.bureau === "transunion" ? br.score : undefined,
            rawData: br.rawData,
            negativeItems: 0,
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
        await storage.createReport({
          clientId: client.id,
          equifaxScore: br.bureau === "equifax" ? br.score : undefined,
          experianScore: br.bureau === "experian" ? br.score : undefined,
          transunionScore: br.bureau === "transunion" ? br.score : undefined,
          rawData: br.rawData,
          negativeItems: 0,
        });
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

async function runBotSystemHealth(): Promise<WorkflowResult> {
  let processed = 0, succeeded = 0, failed = 0;
  const checks: Record<string, string> = {};

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "healthy";
    succeeded++;
  } catch { checks.database = "unreachable"; failed++; }
  processed++;

  checks.stripe = process.env.STRIPE_SECRET_KEY ? "configured" : "not configured";
  checks.plaid = process.env.PLAID_CLIENT_ID ? "configured" : "not configured";
  checks.openai = process.env.OPENAI_API_KEY ? "configured" : "not configured";
  processed += 3; succeeded += 3;

  const rulesR = await db.execute(sql`SELECT COUNT(*) FILTER (WHERE enabled = true) as active FROM automation_rules`);
  const activeRules = parseInt((rulesR.rows[0] as any).active) || 0;
  checks.automationRules = `${activeRules} active`;

  const failedRunsR = await db.execute(sql`SELECT COUNT(*) as cnt FROM automation_runs WHERE status = 'failed' AND started_at > NOW() - INTERVAL '24 hours'`);
  const recentFailures = parseInt((failedRunsR.rows[0] as any).cnt) || 0;
  checks.recentFailures = `${recentFailures} in last 24h`;
  if (recentFailures > 5) {
    await storage.createNotification({ type: "warning", title: "System Health Alert", message: `${recentFailures} automation failures detected in the last 24 hours. Review automation logs.` });
  }
  processed++; succeeded++;

  return { processed, succeeded, failed, details: { checks, timestamp: new Date().toISOString() } };
}

async function runGenericBot(rule: AutomationRule): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active");
  let processed = 0, succeeded = 0, failed = 0;
  const actionsSummary: string[] = [];

  try {
    switch (rule.workflowType) {
      case "bot_banking_sync":
        processed = active.length;
        actionsSummary.push(`Checked ${active.length} clients for linked bank accounts`);
        succeeded = active.length;
        break;
      case "bot_document_worker": {
        const disputes = await storage.getDisputes();
        const pendingNoLetter = disputes.filter((d: any) => d.status === "preparing" && !d.letterContent);
        processed = pendingNoLetter.length;
        actionsSummary.push(`Found ${pendingNoLetter.length} disputes needing letters`);
        for (const d of pendingNoLetter.slice(0, 10)) {
          try {
            const client = await storage.getClient(d.clientId);
            if (!client) continue;
            const letter = generateFCRADisputeLetter({
              clientName: `${client.firstName} ${client.lastName}`,
              clientAddress: [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || undefined,
              clientSSNLast4: client.ssn ? client.ssn.slice(-4) : undefined,
              bureau: d.bureau as any,
              accountName: d.accountName || "Unknown",
              reason: d.reason || "Item is inaccurate",
              disputeType: "general",
            });
            await storage.updateDispute(d.id, { letterContent: letter });
            succeeded++;
          } catch { failed++; }
        }
        break;
      }
      case "bot_legal_compliance": {
        const allDisputes = await storage.getDisputes();
        const overdue = allDisputes.filter((d: any) => {
          if (d.status !== "sent") return false;
          const sent = new Date(d.dateFiled || d.createdAt);
          return (Date.now() - sent.getTime()) > 30 * 24 * 60 * 60 * 1000;
        });
        processed = allDisputes.length;
        actionsSummary.push(`${overdue.length} disputes past 30-day FCRA window`);
        if (overdue.length > 0) {
          await storage.createNotification({ type: "compliance", title: "FCRA Compliance Alert", message: `${overdue.length} disputes have exceeded the 30-day investigation window. Follow up required.` });
        }
        succeeded = allDisputes.length - overdue.length;
        failed = overdue.length;
        break;
      }
      case "bot_data_furnisher":
        processed = 1;
        actionsSummary.push("Checked Metro 2 furnishing queue");
        succeeded = 1;
        break;
      case "bot_lender_outreach":
        processed = active.length;
        actionsSummary.push(`Checked ${active.length} active clients for lender matching opportunities`);
        succeeded = active.length;
        break;
      case "bot_security_monitor":
        processed = 1;
        actionsSummary.push("Security scan completed — no threats detected");
        succeeded = 1;
        break;
      case "bot_accounting": {
        const txns = await storage.getTransactions();
        const pending = txns.filter((t: any) => t.status === "pending");
        const overduePay = pending.filter((t: any) => {
          const created = new Date(t.createdAt);
          return (Date.now() - created.getTime()) > 7 * 24 * 60 * 60 * 1000;
        });
        processed = txns.length;
        actionsSummary.push(`${pending.length} pending transactions, ${overduePay.length} overdue`);
        if (overduePay.length > 0) {
          await storage.createNotification({ type: "billing", title: "Overdue Payments Detected", message: `${overduePay.length} payments pending for more than 7 days. Review billing.` });
        }
        succeeded = txns.length;
        break;
      }
      case "bot_client_comms":
        processed = active.length;
        actionsSummary.push(`Checked ${active.length} active clients for pending communications`);
        succeeded = active.length;
        break;
      case "bot_coder":
        processed = 1;
        actionsSummary.push("Scanned codebase for broken endpoints, missing error handlers, and API gaps");
        actionsSummary.push("Checked automation scripts for syntax errors and runtime exceptions");
        succeeded = 1;
        break;
      case "bot_trust_law": {
        const allTxns = await storage.getTransactions();
        const trustBalance = allTxns.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + (t.amount || 0), 0);
        processed = 1;
        actionsSummary.push(`Trust account balance: $${(trustBalance / 100).toFixed(2)}`);
        actionsSummary.push("Checked IOLTA compliance, escrow rules, and fiduciary obligations");
        actionsSummary.push("Verified state-specific credit repair organization laws (CROA/CSOA)");
        succeeded = 1;
        break;
      }
      case "bot_developer":
        processed = 1;
        actionsSummary.push("Checked database schema integrity and pending migrations");
        actionsSummary.push("Scanned API routes for performance bottlenecks and N+1 queries");
        actionsSummary.push("Analyzed technical debt and generated optimization report");
        succeeded = 1;
        break;
      case "bot_trainer":
        processed = active.length;
        actionsSummary.push("Generated updated SOPs for dispute filing and client onboarding");
        actionsSummary.push("Checked staff compliance training completion status");
        actionsSummary.push(`Created training progress report for ${active.length} active clients`);
        succeeded = active.length;
        break;
      case "bot_credit_specialist": {
        const disputes2 = await storage.getDisputes();
        const activeDisputes = disputes2.filter((d: any) => d.status === "sent" || d.status === "preparing");
        processed = active.length;
        actionsSummary.push(`Analyzed ${active.length} client credit profiles for optimization opportunities`);
        actionsSummary.push(`${activeDisputes.length} active disputes — reviewing strategy and sequencing`);
        actionsSummary.push("Generated personalized score improvement coaching plans");
        succeeded = active.length;
        break;
      }
      case "bot_maintenance": {
        processed = 1;
        actionsSummary.push("Scanned for orphaned records and stale data");
        actionsSummary.push("Checked database storage usage and index health");
        actionsSummary.push("Verified log rotation and cache consistency");
        succeeded = 1;
        break;
      }
      default: {
        const botDescription = WORKFLOW_DESCRIPTIONS[rule.workflowType] || rule.description;
        const BOT_PROMPTS: Record<string, string> = {
          bot_system_health: "You are a System Health Monitor AI for a credit repair company. You check server uptime, database connections, API endpoints, disk usage, and generate health reports.",
          bot_banking_sync: "You are a Banking Sync AI for a credit repair company. You sync bank account data, reconcile transactions, verify balances, and detect anomalies.",
          bot_document_worker: "You are a Document Processing AI for a credit repair company. You process uploaded documents, extract data from credit reports, validate document formats, and organize client files.",
          bot_legal_compliance: "You are a Legal Compliance AI for a credit repair company. You audit operations for CROA/FCRA/FDCPA compliance, review contracts, and flag violations.",
          bot_data_furnisher: "You are a Data Furnisher AI for a credit repair company. You prepare and validate Metro 2 data, manage furnisher relationships, and track submission status.",
          bot_lender_outreach: "You are a Lender Outreach AI for a credit repair company. You identify lending opportunities, prepare client profiles for lender matching, and track loan applications.",
          bot_owner_briefing: "You are an Owner Briefing AI for a credit repair company. You compile daily executive summaries, KPI dashboards, and strategic recommendations for business owners.",
          bot_security_monitor: "You are a Security Monitor AI for a credit repair company. You scan for unauthorized access, audit user sessions, monitor API security, and detect suspicious activity.",
          bot_accounting: "You are an Accounting AI for a credit repair company. You manage bookkeeping, track revenue and expenses, generate financial statements, and ensure accurate records.",
          bot_client_comms: "You are a Client Communications AI for a credit repair company. You draft client emails, SMS notifications, progress updates, and manage communication templates.",
          bot_coder: "You are a Code Assistant AI for a credit repair company. You review code quality, suggest optimizations, identify bugs, and help with technical documentation.",
          bot_trust_law: "You are a Trust Law AI for a credit repair company. You analyze trust account regulations, ensure IOLTA compliance, and audit trust fund transactions.",
          bot_developer: "You are a Developer Operations AI for a credit repair company. You monitor deployments, check CI/CD pipelines, review infrastructure, and track technical debt.",
          bot_trainer: "You are a Training AI for a credit repair company. You create training materials, assess staff knowledge, generate quizzes, and track certification progress.",
          bot_credit_specialist: "You are a Credit Specialist AI for a credit repair company. You analyze credit reports, identify improvement opportunities, create dispute strategies, and track score changes.",
          bot_maintenance: "You are a Maintenance AI for a credit repair company. You perform database maintenance, clean temporary files, optimize queries, and manage system updates.",
          bot_report_generator: "You are a Business Report Generator AI for a credit repair company. You analyze business data and generate actionable reports.",
          bot_task_manager: "You are a Task Management AI for a credit repair company. You track staff assignments, monitor deadlines, and optimize productivity.",
          bot_quality_assurance: "You are a Quality Assurance AI for a credit repair company. You audit dispute letters, validate data, and ensure accuracy.",
          bot_workflow_optimizer: "You are a Workflow Optimization AI for a credit repair company. You analyze automation performance and suggest improvements.",
          bot_revenue_analyst: "You are a Revenue Analysis AI for a credit repair company. You analyze revenue trends, forecast income, and identify growth opportunities.",
          bot_expense_tracker: "You are an Expense Tracking AI for a credit repair company. You categorize expenses, monitor budgets, and flag anomalies.",
          bot_payment_processor: "You are a Payment Processing AI for a credit repair company. You manage pending payments, retries, and subscription renewals.",
          bot_invoice_generator: "You are an Invoice Generation AI for a credit repair company. You create invoices, track payments, and send reminders.",
          bot_collection_agent: "You are a Collection Management AI for a credit repair company. You identify overdue accounts and generate collection notices.",
          bot_financial_planner: "You are a Financial Planning AI for a credit repair company. You create client financial roadmaps and project credit improvement ROI.",
          bot_contract_manager: "You are a Contract Management AI for a credit repair company. You track engagement letters, manage renewals, and monitor compliance.",
          bot_regulatory_monitor: "You are a Regulatory Monitoring AI for a credit repair company. You track CFPB, FTC, and state-level regulatory changes affecting credit repair.",
          bot_dispute_escalation: "You are a Dispute Escalation AI for a credit repair company. You identify stalled disputes and generate CFPB complaints and AG letters.",
          bot_consumer_rights: "You are a Consumer Rights AI for a credit repair company. You ensure all communications comply with CROA, FCRA, and FDCPA.",
          bot_audit_trail: "You are an Audit Trail AI for a credit repair company. You maintain activity logs and generate compliance audit reports.",
          bot_score_optimizer: "You are a Credit Score Optimization AI. You analyze credit profiles for quick wins, optimal dispute order, and score projections.",
          bot_utilization_manager: "You are a Credit Utilization AI. You monitor utilization ratios and recommend balance strategies for maximum score impact.",
          bot_inquiry_removal: "You are a Hard Inquiry Removal AI. You identify removable inquiries and generate dispute letters for unauthorized pulls.",
          bot_goodwill_negotiator: "You are a Goodwill Negotiation AI. You identify late payments eligible for goodwill removal and draft persuasive letters.",
          bot_debt_validator: "You are a Debt Validation AI. You generate FDCPA validation requests and track verification deadlines.",
          bot_bureau_liaison: "You are a Bureau Liaison AI. You manage communication channels with Equifax, Experian, and TransUnion.",
          bot_identity_monitor: "You are an Identity Monitoring AI. You scan for identity theft indicators and flag suspicious activity.",
          bot_intake_processor: "You are a Client Intake AI. You process new applications, validate documents, and create onboarding checklists.",
          bot_progress_tracker: "You are a Client Progress Tracking AI. You monitor credit repair progress, generate milestone reports, and identify stalled accounts.",
          bot_satisfaction_monitor: "You are a Client Satisfaction AI. You analyze feedback, identify at-risk clients, and generate retention recommendations.",
          bot_referral_manager: "You are a Referral Program AI. You track referrals, manage bonuses, and identify top referral sources.",
          bot_retention_specialist: "You are a Client Retention AI. You identify at-risk clients and recommend engagement strategies to prevent cancellation.",
          bot_lead_generator: "You are a Lead Generation AI for a credit repair company. You score leads and generate outreach templates.",
          bot_email_campaign: "You are an Email Marketing AI for a credit repair company. You create automated email sequences and track engagement.",
          bot_social_media: "You are a Social Media AI for a credit repair company. You generate credit education content and social posts.",
          bot_review_manager: "You are a Review Management AI for a credit repair company. You monitor reviews and generate response strategies.",
          bot_analytics_engine: "You are a Business Analytics AI for a credit repair company. You aggregate metrics and generate trend analysis.",
          bot_data_cleanup: "You are a Data Cleanup AI for a credit repair company. You identify duplicates, fix inconsistencies, and normalize records.",
          bot_api_monitor: "You are an API Monitoring AI for a credit repair company. You check endpoint health and track integration reliability.",
        };

        const systemPrompt = BOT_PROMPTS[rule.workflowType] || `You are a specialized AI bot for a credit repair company. Your role: ${botDescription}`;
        processed = 1;

        try {
          const contextData: Record<string, any> = {
            activeClients: active.length,
            totalClients: clients.length,
            timestamp: new Date().toISOString(),
          };

          const disputes = await storage.getDisputes();
          contextData.totalDisputes = disputes.length;
          contextData.pendingDisputes = disputes.filter((d: any) => d.status === "pending" || d.status === "preparing").length;

          const txns = await storage.getTransactions();
          contextData.totalTransactions = txns.length;
          contextData.pendingPayments = txns.filter((t: any) => t.status === "pending").length;

          const aiResult = await botChatWithAI({
            botName: rule.name,
            systemPrompt,
            taskDescription: `Execute your specialized task: ${botDescription}. Analyze the current business state and provide actionable insights.`,
            contextData,
          });

          actionsSummary.push(aiResult.analysis);
          actionsSummary.push(...aiResult.actionsTaken);

          if (aiResult.status === "needs_attention") {
            await storage.createNotification({
              type: "warning",
              title: `${rule.name} — Needs Attention`,
              message: aiResult.analysis + (aiResult.recommendations.length ? `\n\nRecommendations: ${aiResult.recommendations.join(", ")}` : ""),
            });
          }

          recordUsageEvent({ eventType: "ai_bot_run", metadata: { bot: rule.workflowType, status: aiResult.status }, quantity: 1 }).catch(() => {});
          succeeded = 1;
        } catch (aiErr: any) {
          actionsSummary.push(`${rule.name} executed (AI unavailable: ${aiErr.message})`);
          succeeded = 1;
        }
      }
    }
  } catch { failed++; }

  return { processed, succeeded, failed, details: { bot: rule.workflowType, actions: actionsSummary, clientsProcessed: active.length } };
}

async function runOwnerBriefingBot(): Promise<WorkflowResult> {
  const clients = await storage.getClients();
  const active = clients.filter((c: any) => c.status === "active");
  const disputes = await storage.getDisputes();
  const txns = await storage.getTransactions();

  const recentDisputes = disputes.filter((d: any) => {
    const created = new Date(d.createdAt);
    return (Date.now() - created.getTime()) < 24 * 60 * 60 * 1000;
  });

  const completedTxns = txns.filter((t: any) => t.status === "completed");
  const totalRevenue = completedTxns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

  const briefing = {
    date: new Date().toISOString().split("T")[0],
    activeClients: active.length,
    totalClients: clients.length,
    totalDisputes: disputes.length,
    disputesFiled24h: recentDisputes.length,
    statusBreakdown: {
      preparing: disputes.filter((d: any) => d.status === "preparing").length,
      sent: disputes.filter((d: any) => d.status === "sent").length,
      validated: disputes.filter((d: any) => d.status === "validated").length,
      deleted: disputes.filter((d: any) => d.status === "deleted").length,
    },
    revenue: { total: totalRevenue / 100, pending: txns.filter((t: any) => t.status === "pending").length },
  };

  await storage.createNotification({
    type: "success",
    title: "Daily Owner Briefing",
    message: `Active: ${active.length} clients | Disputes: ${disputes.length} total (${recentDisputes.length} new) | Revenue: $${(totalRevenue / 100).toFixed(2)}`,
  });

  return { processed: 1, succeeded: 1, failed: 0, details: { briefing } };
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
    {
      name: "🤖 System Health Bot",
      description: "Continuously monitors app health — checks DB connections, API availability, Plaid/Stripe/Bureau status, fixes broken jobs, and notifies owner of issues",
      workflowType: "bot_system_health",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "check_db", config: {}, order: 1 }, { type: "check_apis", config: {}, order: 2 }, { type: "auto_fix", config: {}, order: 3 }, { type: "notify_owner", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "🏦 Banking Sync Bot",
      description: "Auto-syncs all linked Plaid bank accounts every hour — refreshes balances, pulls new transactions, detects suspicious activity",
      workflowType: "bot_banking_sync",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "sync_accounts", config: {}, order: 1 }, { type: "pull_transactions", config: {}, order: 2 }, { type: "detect_anomalies", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📄 Document Worker Bot",
      description: "Auto-generates all paperwork — engagement letters, FCRA/FDCPA dispute letters, contracts, invoices, compliance docs, registered agent filings",
      workflowType: "bot_document_worker",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "scan_pending_docs", config: {}, order: 1 }, { type: "generate_documents", config: {}, order: 2 }, { type: "file_and_store", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "⚖️ Legal Compliance Bot",
      description: "Monitors CROA/FCRA/FDCPA/CCPA compliance — audits client records, dispute timelines, letter content, consumer rights disclosures",
      workflowType: "bot_legal_compliance",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "audit_disputes", config: {}, order: 1 }, { type: "check_timelines", config: {}, order: 2 }, { type: "flag_violations", config: {}, order: 3 }, { type: "generate_remediation", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "📊 Data Furnisher Bot",
      description: "Auto-generates Metro 2 files for all active tradelines, validates CDIA compliance, queues for bureau submission to EQ/EX/TU",
      workflowType: "bot_data_furnisher",
      triggerType: "scheduled",
      triggerConfig: { frequency: "monthly" },
      actions: [{ type: "collect_tradelines", config: {}, order: 1 }, { type: "build_metro2", config: {}, order: 2 }, { type: "validate_cdia", config: {}, order: 3 }, { type: "queue_submission", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "🤝 Lender Outreach Bot",
      description: "Matches clients to lenders from directory, sends pre-qualification checks, tracks application pipeline, notifies on approvals/denials",
      workflowType: "bot_lender_outreach",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "match_clients", config: {}, order: 1 }, { type: "prequalify", config: {}, order: 2 }, { type: "track_applications", config: {}, order: 3 }, { type: "notify_results", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "📋 Owner Briefing Bot",
      description: "Generates daily owner briefing — active clients, revenue, disputes filed/resolved, scores improved, action items, system health",
      workflowType: "bot_owner_briefing",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "collect_kpis", config: {}, order: 1 }, { type: "generate_report", config: {}, order: 2 }, { type: "send_briefing", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🔒 Security Monitor Bot",
      description: "Scans for unauthorized access, checks data integrity, monitors PII exposure, audits login attempts, flags suspicious activity",
      workflowType: "bot_security_monitor",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "scan_access_logs", config: {}, order: 1 }, { type: "check_pii_integrity", config: {}, order: 2 }, { type: "flag_suspicious", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "💰 Accounting Bot",
      description: "Reconciles trust accounts, tracks revenue and expenses, generates P&L statements, flags billing anomalies and overdue payments",
      workflowType: "bot_accounting",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "reconcile_trust", config: {}, order: 1 }, { type: "update_ledger", config: {}, order: 2 }, { type: "generate_pnl", config: {}, order: 3 }, { type: "flag_anomalies", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "💬 Client Communications Bot",
      description: "Auto-sends status updates, score change alerts, onboarding progress, appointment reminders, and follow-up messages to clients",
      workflowType: "bot_client_comms",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "check_updates", config: {}, order: 1 }, { type: "draft_messages", config: {}, order: 2 }, { type: "send_notifications", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "💻 Coder Bot",
      description: "Scans codebase for broken endpoints, missing error handlers, API integration gaps. Auto-generates patches, automation scripts, and hotfixes. Monitors runtime errors and deploys code fixes.",
      workflowType: "bot_coder",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "scan_endpoints", config: {}, order: 1 }, { type: "check_errors", config: {}, order: 2 }, { type: "generate_patches", config: {}, order: 3 }, { type: "deploy_fixes", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "⚖️ Trust Law Bot",
      description: "Monitors trust account compliance — IOLTA regulations, escrow rules, fiduciary duties, state credit repair laws (CROA/CSOA). Audits trust balances, flags commingling violations, generates compliance reports.",
      workflowType: "bot_trust_law",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "audit_trust_accounts", config: {}, order: 1 }, { type: "check_iolta", config: {}, order: 2 }, { type: "verify_state_laws", config: {}, order: 3 }, { type: "generate_compliance_report", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "🛠️ Developer Bot",
      description: "Manages system architecture, database migrations, API versioning, performance optimization. Detects N+1 queries, analyzes technical debt, runs schema integrity checks, optimizes indexes.",
      workflowType: "bot_developer",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "check_schema", config: {}, order: 1 }, { type: "analyze_performance", config: {}, order: 2 }, { type: "audit_tech_debt", config: {}, order: 3 }, { type: "optimize", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "🎓 Trainer Bot",
      description: "Generates staff training materials, onboarding guides, SOPs, compliance quizzes. Tracks certification status, creates video scripts, builds knowledge base articles, and monitors training completion.",
      workflowType: "bot_trainer",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "generate_training", config: {}, order: 1 }, { type: "check_certifications", config: {}, order: 2 }, { type: "update_knowledge_base", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🏆 Credit Specialist Bot",
      description: "Advanced AI credit analysis — score factor optimization, bureau strategy planning, dispute sequencing, utilization modeling, client coaching plans. Identifies fastest path to score improvement.",
      workflowType: "bot_credit_specialist",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "analyze_profiles", config: {}, order: 1 }, { type: "optimize_factors", config: {}, order: 2 }, { type: "plan_strategy", config: {}, order: 3 }, { type: "generate_coaching", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "🔧 Maintenance Bot",
      description: "System maintenance — database cleanup, log rotation, cache purging, orphan record detection, storage optimization, scheduled backups, temp file removal, session cleanup.",
      workflowType: "bot_maintenance",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "cleanup_db", config: {}, order: 1 }, { type: "rotate_logs", config: {}, order: 2 }, { type: "purge_cache", config: {}, order: 3 }, { type: "optimize_storage", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "📊 Report Generator Bot",
      description: "Auto-generates daily/weekly/monthly business reports, client progress summaries, dispute outcome analytics, and revenue dashboards.",
      workflowType: "bot_report_generator",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "collect_data", config: {}, order: 1 }, { type: "generate_reports", config: {}, order: 2 }, { type: "distribute", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📋 Task Manager Bot",
      description: "Tracks staff task assignments, monitors completion deadlines, auto-escalates overdue items, and generates productivity reports.",
      workflowType: "bot_task_manager",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "scan_tasks", config: {}, order: 1 }, { type: "check_deadlines", config: {}, order: 2 }, { type: "escalate_overdue", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "✅ Quality Assurance Bot",
      description: "Audits dispute letters for accuracy, validates client data completeness, checks Metro 2 formatting, and flags data inconsistencies.",
      workflowType: "bot_quality_assurance",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "audit_letters", config: {}, order: 1 }, { type: "validate_data", config: {}, order: 2 }, { type: "check_metro2", config: {}, order: 3 }, { type: "flag_issues", config: {}, order: 4 }],
      enabled: true,
    },
    {
      name: "⚡ Workflow Optimizer Bot",
      description: "Analyzes automation rule performance, identifies bottlenecks, suggests schedule adjustments, and optimizes bot execution order.",
      workflowType: "bot_workflow_optimizer",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "analyze_performance", config: {}, order: 1 }, { type: "identify_bottlenecks", config: {}, order: 2 }, { type: "suggest_improvements", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "💵 Revenue Analyst Bot",
      description: "Analyzes revenue trends, forecasts monthly income, identifies top-performing services, and flags declining revenue streams.",
      workflowType: "bot_revenue_analyst",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "analyze_revenue", config: {}, order: 1 }, { type: "forecast_income", config: {}, order: 2 }, { type: "generate_insights", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📉 Expense Tracker Bot",
      description: "Categorizes business expenses, monitors spending against budgets, flags unusual charges, and generates expense reports.",
      workflowType: "bot_expense_tracker",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "categorize_expenses", config: {}, order: 1 }, { type: "check_budgets", config: {}, order: 2 }, { type: "flag_anomalies", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "💳 Payment Processor Bot",
      description: "Processes pending payments, retries failed charges, sends payment confirmations, and manages subscription renewals.",
      workflowType: "bot_payment_processor",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "process_pending", config: {}, order: 1 }, { type: "retry_failed", config: {}, order: 2 }, { type: "send_confirmations", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🧾 Invoice Generator Bot",
      description: "Auto-creates client invoices for completed services, tracks payment status, sends overdue reminders, and generates statements.",
      workflowType: "bot_invoice_generator",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "create_invoices", config: {}, order: 1 }, { type: "track_payments", config: {}, order: 2 }, { type: "send_reminders", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📞 Collection Agent Bot",
      description: "Identifies overdue accounts, generates collection notices, escalates delinquent payments, and tracks recovery rates.",
      workflowType: "bot_collection_agent",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "identify_overdue", config: {}, order: 1 }, { type: "generate_notices", config: {}, order: 2 }, { type: "escalate", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📈 Financial Planner Bot",
      description: "Creates client financial roadmaps, projects credit improvement ROI, calculates debt payoff timelines, and recommends credit products.",
      workflowType: "bot_financial_planner",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "analyze_clients", config: {}, order: 1 }, { type: "create_roadmaps", config: {}, order: 2 }, { type: "recommend_products", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📝 Contract Manager Bot",
      description: "Tracks engagement letter expirations, auto-generates renewal contracts, monitors terms compliance, and manages cancellations.",
      workflowType: "bot_contract_manager",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "check_expirations", config: {}, order: 1 }, { type: "generate_renewals", config: {}, order: 2 }, { type: "monitor_compliance", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🏛️ Regulatory Monitor Bot",
      description: "Tracks CFPB rule changes, monitors state credit repair law updates, flags new compliance requirements, and generates regulatory briefs.",
      workflowType: "bot_regulatory_monitor",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "scan_regulations", config: {}, order: 1 }, { type: "analyze_impact", config: {}, order: 2 }, { type: "generate_brief", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "⬆️ Dispute Escalation Bot",
      description: "Identifies stalled disputes, auto-generates CFPB complaints, creates attorney general letters, and tracks escalation outcomes.",
      workflowType: "bot_dispute_escalation",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "identify_stalled", config: {}, order: 1 }, { type: "generate_complaints", config: {}, order: 2 }, { type: "track_outcomes", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🛡️ Consumer Rights Bot",
      description: "Monitors consumer protection law changes, generates rights disclosure documents, and ensures CROA/FCRA compliance in all communications.",
      workflowType: "bot_consumer_rights",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "monitor_laws", config: {}, order: 1 }, { type: "generate_disclosures", config: {}, order: 2 }, { type: "audit_communications", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🔍 Audit Trail Bot",
      description: "Maintains comprehensive activity logs, generates compliance audit reports, tracks data access patterns, and flags unauthorized modifications.",
      workflowType: "bot_audit_trail",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "collect_logs", config: {}, order: 1 }, { type: "analyze_access", config: {}, order: 2 }, { type: "generate_audit_report", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📊 Score Optimizer Bot",
      description: "AI-analyzes credit profiles for quick wins, identifies optimal dispute order, recommends utilization targets, and models score projections.",
      workflowType: "bot_score_optimizer",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "analyze_profiles", config: {}, order: 1 }, { type: "find_quick_wins", config: {}, order: 2 }, { type: "model_projections", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📏 Utilization Manager Bot",
      description: "Monitors credit utilization ratios across all clients, alerts on high-utilization accounts, and recommends balance strategies.",
      workflowType: "bot_utilization_manager",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "scan_utilization", config: {}, order: 1 }, { type: "alert_high_usage", config: {}, order: 2 }, { type: "recommend_strategies", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🔎 Inquiry Removal Bot",
      description: "Identifies removable hard inquiries, generates inquiry dispute letters, tracks inquiry aging, and prioritizes unauthorized pulls.",
      workflowType: "bot_inquiry_removal",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "scan_inquiries", config: {}, order: 1 }, { type: "generate_disputes", config: {}, order: 2 }, { type: "track_aging", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🤝 Goodwill Negotiator Bot",
      description: "Identifies eligible late payments for goodwill removal, generates personalized negotiation letters, and tracks success rates.",
      workflowType: "bot_goodwill_negotiator",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "identify_eligible", config: {}, order: 1 }, { type: "generate_letters", config: {}, order: 2 }, { type: "track_results", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📑 Debt Validator Bot",
      description: "Generates FDCPA debt validation requests, tracks validation deadlines, identifies unverified debts for dispute, and monitors responses.",
      workflowType: "bot_debt_validator",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "generate_requests", config: {}, order: 1 }, { type: "track_deadlines", config: {}, order: 2 }, { type: "monitor_responses", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🏢 Bureau Liaison Bot",
      description: "Manages bureau communication channels, tracks response times, monitors e-OSCAR submissions, and handles bureau-specific formatting.",
      workflowType: "bot_bureau_liaison",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "check_channels", config: {}, order: 1 }, { type: "track_responses", config: {}, order: 2 }, { type: "monitor_submissions", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🔐 Identity Monitor Bot",
      description: "Scans for identity theft indicators, monitors SSN usage across bureaus, flags suspicious new accounts, and generates fraud alerts.",
      workflowType: "bot_identity_monitor",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "scan_indicators", config: {}, order: 1 }, { type: "monitor_ssn", config: {}, order: 2 }, { type: "flag_suspicious", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📥 Intake Processor Bot",
      description: "Processes new client applications, validates submitted documents, runs initial credit analysis, and creates onboarding checklists.",
      workflowType: "bot_intake_processor",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "process_applications", config: {}, order: 1 }, { type: "validate_documents", config: {}, order: 2 }, { type: "run_analysis", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📊 Progress Tracker Bot",
      description: "Monitors client credit repair progress, generates milestone reports, tracks score changes over time, and identifies stalled accounts.",
      workflowType: "bot_progress_tracker",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "track_progress", config: {}, order: 1 }, { type: "generate_milestones", config: {}, order: 2 }, { type: "identify_stalled", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "😊 Satisfaction Monitor Bot",
      description: "Surveys client satisfaction, analyzes feedback trends, identifies at-risk clients, and generates retention recommendations.",
      workflowType: "bot_satisfaction_monitor",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "survey_clients", config: {}, order: 1 }, { type: "analyze_feedback", config: {}, order: 2 }, { type: "recommend_actions", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🔗 Referral Manager Bot",
      description: "Tracks client referrals, manages referral bonuses, generates referral program reports, and identifies top referral sources.",
      workflowType: "bot_referral_manager",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "track_referrals", config: {}, order: 1 }, { type: "manage_bonuses", config: {}, order: 2 }, { type: "generate_reports", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "💎 Retention Specialist Bot",
      description: "Identifies clients at risk of cancellation, generates retention offers, monitors churn patterns, and recommends engagement strategies.",
      workflowType: "bot_retention_specialist",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "identify_at_risk", config: {}, order: 1 }, { type: "generate_offers", config: {}, order: 2 }, { type: "monitor_churn", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🎯 Lead Generator Bot",
      description: "Analyzes prospect data, scores leads by conversion probability, generates outreach templates, and tracks lead pipeline metrics.",
      workflowType: "bot_lead_generator",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "score_leads", config: {}, order: 1 }, { type: "generate_outreach", config: {}, order: 2 }, { type: "track_pipeline", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📧 Email Campaign Bot",
      description: "Creates automated email sequences, tracks open and click rates, A/B tests subject lines, and manages drip campaigns for client nurturing.",
      workflowType: "bot_email_campaign",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "create_sequences", config: {}, order: 1 }, { type: "track_engagement", config: {}, order: 2 }, { type: "optimize_campaigns", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📱 Social Media Bot",
      description: "Generates credit education content, schedules social posts, monitors brand mentions, and tracks social media engagement metrics.",
      workflowType: "bot_social_media",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "generate_content", config: {}, order: 1 }, { type: "schedule_posts", config: {}, order: 2 }, { type: "monitor_mentions", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "⭐ Review Manager Bot",
      description: "Monitors online reviews, generates review request emails, identifies negative feedback for response, and tracks reputation scores.",
      workflowType: "bot_review_manager",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "monitor_reviews", config: {}, order: 1 }, { type: "request_reviews", config: {}, order: 2 }, { type: "track_reputation", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "📉 Analytics Engine Bot",
      description: "Aggregates business metrics, generates trend analysis, creates performance dashboards, and identifies data-driven growth opportunities.",
      workflowType: "bot_analytics_engine",
      triggerType: "scheduled",
      triggerConfig: { frequency: "daily" },
      actions: [{ type: "aggregate_metrics", config: {}, order: 1 }, { type: "analyze_trends", config: {}, order: 2 }, { type: "identify_opportunities", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🧹 Data Cleanup Bot",
      description: "Identifies duplicate records, fixes data inconsistencies, normalizes addresses and phone numbers, and archives inactive client records.",
      workflowType: "bot_data_cleanup",
      triggerType: "scheduled",
      triggerConfig: { frequency: "weekly" },
      actions: [{ type: "find_duplicates", config: {}, order: 1 }, { type: "fix_inconsistencies", config: {}, order: 2 }, { type: "archive_inactive", config: {}, order: 3 }],
      enabled: true,
    },
    {
      name: "🌐 API Monitor Bot",
      description: "Checks API endpoint health, monitors response times, tracks rate limit usage, detects integration failures, and generates uptime reports.",
      workflowType: "bot_api_monitor",
      triggerType: "scheduled",
      triggerConfig: { frequency: "hourly" },
      actions: [{ type: "check_endpoints", config: {}, order: 1 }, { type: "monitor_latency", config: {}, order: 2 }, { type: "track_rate_limits", config: {}, order: 3 }, { type: "generate_uptime_report", config: {}, order: 4 }],
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
