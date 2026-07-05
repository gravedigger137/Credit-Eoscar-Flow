import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import {
  auditEvents,
  collateralAssets,
  documentRoomItems,
  equityBonusRecords,
  facilityReadinessChecklist,
  legalInstruments,
  receivableReadinessRecords,
  type InsertAuditEvent,
  type InsertCollateralAsset,
  type InsertDocumentRoomItem,
  type InsertEquityBonusRecord,
  type InsertFacilityReadinessChecklist,
  type InsertLegalInstrument,
  type InsertReceivableReadinessRecord,
} from "@shared/schema";
import { mapAuditLoggedToPlatformEvent, safelyPublishPlatformEvent } from "./platform";

type Actor = { userId?: string | null };
type Confirmable = { confirmationText?: string; reason?: string };

const HIGH_RISK_CONFIRMATION = "I understand this requires professional review";

function isHighRiskChange(data: Record<string, unknown>) {
  return (
    data.lenderVisible === true ||
    data.lenderEligible === true ||
    data.status === "approved" ||
    data.eligibilityStatus === "approved" ||
    data.eligibilityStatus === "issued" ||
    typeof data.sharesApproved === "number" ||
    data.certificateStatus === "issued" ||
    data.agreementStatus === "signed" ||
    typeof data.capTableReference === "string" ||
    data.valuationStatus === "appraised" ||
    typeof data.estimatedValue === "number"
  );
}

function requireConfirmation(data: Record<string, unknown>, confirmationText?: string) {
  if (isHighRiskChange(data) && confirmationText !== HIGH_RISK_CONFIRMATION) {
    const error = new Error(`High-risk change requires confirmation: ${HIGH_RISK_CONFIRMATION}`);
    (error as any).status = 409;
    throw error;
  }
}

async function recordAudit(event: InsertAuditEvent) {
  const [audit] = await db.insert(auditEvents).values(event as typeof auditEvents.$inferInsert).returning();
  safelyPublishPlatformEvent(mapAuditLoggedToPlatformEvent({
    auditId: audit.id,
    action: audit.action,
    entityType: audit.entityType,
    entityId: audit.entityId ?? "",
    ...(audit.createdAt === null ? {} : { createdAt: audit.createdAt ?? undefined }),
  }));
  return audit;
}

async function auditedCreate<T extends Record<string, unknown>, R>(
  entityType: string,
  action: string,
  values: T,
  create: () => Promise<R & { id: string }>,
  actor: Actor,
  options: Confirmable = {},
) {
  requireConfirmation(values, options.confirmationText);
  const created = await create();
  await recordAudit({
    actorUserId: actor.userId || null,
    action,
    entityType,
    entityId: created.id,
    beforeValue: null,
    afterValue: created as Record<string, unknown>,
    relatedDocumentId: (created as any).documentRoomItemId || (created as any).supportingDocumentId || (entityType === "document_room_item" ? created.id : null),
    reason: options.reason,
    highRisk: isHighRiskChange(values),
    confirmationText: options.confirmationText,
  });
  return created;
}

async function auditedUpdate<T extends Record<string, unknown>, R extends { id: string }>(
  entityType: string,
  action: string,
  before: R | undefined,
  values: T,
  update: () => Promise<R>,
  actor: Actor,
  options: Confirmable = {},
) {
  if (!before) {
    const error = new Error(`${entityType} not found`);
    (error as any).status = 404;
    throw error;
  }
  requireConfirmation(values, options.confirmationText);
  const updated = await update();
  await recordAudit({
    actorUserId: actor.userId || null,
    action,
    entityType,
    entityId: updated.id,
    beforeValue: before as Record<string, unknown>,
    afterValue: updated as Record<string, unknown>,
    relatedDocumentId: (updated as any).documentRoomItemId || (updated as any).supportingDocumentId || (entityType === "document_room_item" ? updated.id : null),
    reason: options.reason,
    highRisk: isHighRiskChange(values),
    confirmationText: options.confirmationText,
  });
  return updated;
}

export const highRiskConfirmationText = HIGH_RISK_CONFIRMATION;

export const agentDefinitions = [
  ["Chief Admin Agent", "Administration", "A", "Coordinates daily operating queues and executive summaries."],
  ["Legal Workflow Agent", "Legal", "A", "Organizes draft legal workflow items for professional review."],
  ["Legal Review Queue Agent", "Legal", "B", "Performs second-pass QA on legal workflow queues."],
  ["Accounting Workflow Agent", "Accounting", "A", "Routes invoice, receivable, and trust-accounting review tasks."],
  ["Accounting Review Queue Agent", "Accounting", "B", "Reviews accounting exceptions before human approval."],
  ["Customer Onboarding Agent", "Onboarding", "A", "Tracks onboarding readiness tasks and missing evidence."],
  ["Customer Onboarding QA Agent", "Onboarding", "B", "Checks onboarding completion and exception queues."],
  ["Compliance Workflow Agent", "Compliance", "A", "Monitors compliance tasks, disclosures, and evidence gaps."],
  ["Compliance Escalation Agent", "Compliance", "B", "Escalates high-risk compliance items for human review."],
  ["Credit Workflow Agent", "Credit Operations", "A", "Prioritizes credit workflow tasks using internal platform metrics."],
  ["Credit Review Agent", "Credit Operations", "B", "Reviews credit workflow exceptions and manual gates."],
  ["Bureau Integration Monitor Agent", "Bureau Operations", "A", "Checks sandbox/live configuration status without exposing secrets."],
  ["Metro 2 Workflow Agent", "Bureau Operations", "A", "Queues Metro 2 draft workflow tasks for review."],
  ["e-OSCAR Workflow Agent", "Bureau Operations", "B", "Monitors e-OSCAR readiness and prevents unauthorized production claims."],
  ["Receivables Readiness Agent", "Finance", "A", "Checks receivable evidence completeness for manual review."],
  ["Document Room Agent", "Governance", "A", "Tracks binder documents, versions, and review status."],
  ["Asset Register Agent", "Governance", "B", "Checks asset-register completeness and review flags."],
  ["Trust Accounting Agent", "Accounting", "A", "Monitors trust-accounting metadata and reconciliation tasks."],
  ["Billing Agent", "Revenue", "A", "Routes billing and revenue workflow items."],
  ["Collections Workflow Agent", "Revenue", "B", "Queues collections workflow tasks subject to legal review."],
  ["Support Inbox Agent", "Support", "A", "Routes support inbox items and customer follow-ups."],
  ["Engineering Agent", "Engineering", "A", "Tracks implementation and maintenance tasks."],
  ["Code Review Agent", "Engineering", "B", "Reviews code-change risk and deployment readiness."],
  ["DevOps Agent", "Infrastructure", "A", "Monitors deployment, build, and environment-readiness tasks."],
  ["Cloud Infrastructure Agent", "Infrastructure", "B", "Checks Cloudflare, Render, Vercel, Neon, and DNS readiness."],
  ["Security Monitor Agent", "Security", "A", "Monitors security posture and secret/config readiness."],
  ["Incident Response Agent", "Security", "B", "Coordinates incident triage and post-incident review tasks."],
  ["Data Quality Agent", "Data", "A", "Checks missing, inconsistent, or stale operational records."],
  ["API Monitor Agent", "Engineering", "B", "Monitors API health, ready, status, and route checks."],
  ["Automation Scheduler Agent", "Automation", "A", "Reviews automation schedules, retries, and failure queues."],
  ["Executive Summary Agent", "Executive", "A", "Summarizes operating status for officers and leadership."],
  ["Officer Task Agent", "Governance", "A", "Tracks officer approvals, resolutions, and board tasks."],
  ["Board/Resolution Drafting Agent", "Governance", "B", "Creates draft resolution workflow packets for attorney review."],
  ["Vendor Management Agent", "Operations", "A", "Tracks vendor agreements, renewals, and review queues."],
  ["Sales/CRM Agent", "Revenue", "A", "Tracks leads, customer readiness, and CRM handoff tasks."],
  ["Marketing Operations Agent", "Marketing", "A", "Tracks content, campaign, social, SEO, and channel operations without implying platform approvals."],
  ["Social Media Review Agent", "Marketing", "B", "Reviews social content for brand, compliance, and disclosure issues."],
  ["Affiliate Program Agent", "Affiliate Marketing", "A", "Tracks affiliate applications, restrictions, payout references, and approval status."],
  ["Equity Program Workflow Agent", "Internal Audit", "B", "Tracks optional customer shareholder bonus workflow gates without issuing shares."],
  ["Smart Contract Architect Agent", "Engineering", "A", "Drafts smart-contract architecture and simulation plans for professional review."],
  ["Smart Contract Security Auditor Agent", "Security", "B", "Reviews smart-contract risks and readiness checklists without deploying contracts."],
].map(([agentName, department, team, purpose]) => ({
  agentName,
  department,
  team,
  purpose,
  allowedActions: ["summarize", "route_task", "create_draft", "check_status", "flag_exception"],
  prohibitedActions: ["provide_legal_advice", "approve_financial_claims", "transmit_live_bureau_data", "approve_lender_visibility", "change_secrets", "delete_evidence"],
  requiredHumanReview: ["legal", "tax", "accounting", "banking", "securities", "credit", "insurance", "lender_visible", "receivable_eligible"],
  escalationRules: ["Escalate high-risk changes to an admin and qualified professional review queue."],
  auditLogRequirements: ["Log actor, action, before/after values, reason, and confirmation text where required."],
  dataAccessScope: ["metadata_only", "least_privilege", "no_secret_values"],
  schedule: team === "A" ? "business_hours_and_scheduled_checks" : "second_review_after_hours_and_exceptions",
  relatedRoutes: ["/api/document-room/*", "/api/status/agents", "/api/status/automation"],
  relatedTables: ["document_room_items", "audit_events", "facility_readiness_checklist"],
  relatedDocs: ["docs/AI-Agent-Teams.md", "docs/Agent-Permission-Model.md"],
}));

export async function getDocumentRoomSummary() {
  const [documents] = await db.select({ count: sql<number>`count(*)` }).from(documentRoomItems);
  const [ready] = await db.select({ count: sql<number>`count(*)` }).from(documentRoomItems).where(eq(documentRoomItems.status, "approved"));
  const [attorney] = await db.select({ count: sql<number>`count(*)` }).from(documentRoomItems).where(eq(documentRoomItems.attorneyReviewRequired, true));
  const [accountant] = await db.select({ count: sql<number>`count(*)` }).from(documentRoomItems).where(eq(documentRoomItems.accountantReviewRequired, true));
  const [lenderVisible] = await db.select({ count: sql<number>`count(*)` }).from(documentRoomItems).where(eq(documentRoomItems.lenderVisible, true));
  const [receivableEligible] = await db.select({ count: sql<number>`count(*)` }).from(receivableReadinessRecords).where(and(eq(receivableReadinessRecords.lenderEligible, true), eq(receivableReadinessRecords.manualReviewCompleted, true)));
  const checklist = await db.select().from(facilityReadinessChecklist);
  const complete = checklist.filter((item) => item.status === "complete").length;

  return {
    totalDocuments: Number(documents.count),
    documentsReady: Number(ready.count),
    attorneyReviewRequired: Number(attorney.count),
    accountantReviewRequired: Number(accountant.count),
    lenderVisibleDocuments: Number(lenderVisible.count),
    receivablesEligible: Number(receivableEligible.count),
    facilityReadinessPercentage: checklist.length ? Math.round((complete / checklist.length) * 100) : 0,
    requiredConfirmationText: HIGH_RISK_CONFIRMATION,
  };
}

export async function listDocumentRoomItems() {
  return db.select().from(documentRoomItems).orderBy(desc(documentRoomItems.updatedAt));
}

export async function createDocumentRoomItem(values: InsertDocumentRoomItem, actor: Actor, options?: Confirmable) {
  return auditedCreate("document_room_item", "DocumentRoomItemCreated", values, async () => {
    const [created] = await db.insert(documentRoomItems).values(values).returning();
    return created;
  }, actor, options);
}

export async function updateDocumentRoomItem(id: string, values: Partial<InsertDocumentRoomItem>, actor: Actor, options?: Confirmable) {
  const [before] = await db.select().from(documentRoomItems).where(eq(documentRoomItems.id, id));
  return auditedUpdate("document_room_item", "DocumentRoomItemUpdated", before, values, async () => {
    const [updated] = await db.update(documentRoomItems).set({ ...values, updatedAt: new Date() }).where(eq(documentRoomItems.id, id)).returning();
    return updated;
  }, actor, options);
}

export async function listLegalInstruments() {
  return db.select().from(legalInstruments).orderBy(desc(legalInstruments.updatedAt));
}

export async function createLegalInstrument(values: InsertLegalInstrument, actor: Actor, options?: Confirmable) {
  return auditedCreate("legal_instrument", "LegalInstrumentCreated", values, async () => {
    const [created] = await db.insert(legalInstruments).values(values).returning();
    return created;
  }, actor, options);
}

export async function listCollateralAssets() {
  return db.select().from(collateralAssets).orderBy(desc(collateralAssets.updatedAt));
}

export async function createCollateralAsset(values: InsertCollateralAsset, actor: Actor, options?: Confirmable) {
  return auditedCreate("collateral_asset", "CollateralAssetCreated", values, async () => {
    const [created] = await db.insert(collateralAssets).values(values).returning();
    return created;
  }, actor, options);
}

export async function updateCollateralAsset(id: string, values: Partial<InsertCollateralAsset>, actor: Actor, options?: Confirmable) {
  const [before] = await db.select().from(collateralAssets).where(eq(collateralAssets.id, id));
  return auditedUpdate("collateral_asset", "CollateralAssetUpdated", before, values, async () => {
    const [updated] = await db.update(collateralAssets).set({ ...values, updatedAt: new Date() }).where(eq(collateralAssets.id, id)).returning();
    return updated;
  }, actor, options);
}

export async function listReceivableReadinessRecords() {
  return db.select().from(receivableReadinessRecords).orderBy(desc(receivableReadinessRecords.updatedAt));
}

export async function createReceivableReadinessRecord(values: InsertReceivableReadinessRecord, actor: Actor, options?: Confirmable) {
  return auditedCreate("receivable_readiness_record", "ReceivableReadinessCreated", values, async () => {
    const [created] = await db.insert(receivableReadinessRecords).values(values).returning();
    return created;
  }, actor, options);
}

export async function updateReceivableReadinessRecord(id: string, values: Partial<InsertReceivableReadinessRecord>, actor: Actor, options?: Confirmable) {
  const [before] = await db.select().from(receivableReadinessRecords).where(eq(receivableReadinessRecords.id, id));
  return auditedUpdate("receivable_readiness_record", "ReceivableReadinessUpdated", before, values, async () => {
    const [updated] = await db.update(receivableReadinessRecords).set({ ...values, updatedAt: new Date() }).where(eq(receivableReadinessRecords.id, id)).returning();
    return updated;
  }, actor, options);
}

export async function listFacilityChecklist() {
  return db.select().from(facilityReadinessChecklist).orderBy(desc(facilityReadinessChecklist.createdAt));
}

export async function createFacilityChecklistItem(values: InsertFacilityReadinessChecklist, actor: Actor, options?: Confirmable) {
  return auditedCreate("facility_readiness_checklist", "FacilityChecklistItemCreated", values, async () => {
    const [created] = await db.insert(facilityReadinessChecklist).values(values).returning();
    return created;
  }, actor, options);
}

export async function listAuditEvents() {
  return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(100);
}

export async function listEquityBonusRecords() {
  return db.select().from(equityBonusRecords).orderBy(desc(equityBonusRecords.updatedAt));
}

export async function createEquityBonusRecord(values: InsertEquityBonusRecord, actor: Actor, options?: Confirmable) {
  return auditedCreate("equity_bonus_record", "EquityBonusRecordCreated", values, async () => {
    const [created] = await db.insert(equityBonusRecords).values(values).returning();
    return created;
  }, actor, options);
}

export async function updateEquityBonusRecord(id: string, values: Partial<InsertEquityBonusRecord>, actor: Actor, options?: Confirmable) {
  const [before] = await db.select().from(equityBonusRecords).where(eq(equityBonusRecords.id, id));
  return auditedUpdate("equity_bonus_record", "EquityBonusRecordUpdated", before, values, async () => {
    const [updated] = await db.update(equityBonusRecords).set({ ...values, updatedAt: new Date() }).where(eq(equityBonusRecords.id, id)).returning();
    return updated;
  }, actor, options);
}
