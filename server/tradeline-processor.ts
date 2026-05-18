import { storage } from "./storage";
import { recordUsageEvent } from "./usage-metering";
import { aiProvider } from "./services/ai.service";

export interface TradelineMatch {
  partnerId: string;
  partnerName: string;
  bankName: string;
  cardName: string;
  creditLimit: number;
  historyYears: number;
  reportingBureaus: string[];
  availableSlots: number;
  pricePerSlot: number;
  matchScore: number;
  matchReasons: string[];
  projectedScoreImpact: number;
  utilizationImpact: number;
  ageImpact: number;
  riskLevel: "low" | "medium" | "high";
}

export interface TradelineOptimizationPlan {
  clientId: string;
  clientName: string;
  currentScores: { equifax: number | null; experian: number | null; transunion: number | null };
  currentUtilization: number;
  currentAvgAge: number;
  recommendations: TradelineMatch[];
  totalProjectedImpact: number;
  totalCost: number;
  strategy: string;
  timeline: string;
  riskAssessment: string;
}

export interface BatchProcessResult {
  totalClients: number;
  processed: number;
  optimized: number;
  errors: number;
  results: {
    clientId: string;
    clientName: string;
    status: "optimized" | "skipped" | "error";
    recommendationCount: number;
    projectedImpact: number;
    message: string;
  }[];
  processingTimeMs: number;
}

export interface TradelineBehaviorProfile {
  clientId: string;
  clientName: string;
  riskSegment: "low" | "medium" | "high" | "critical";
  riskScore: number;
  behaviorIndicators: {
    paymentConsistency: number;
    utilizationTrend: "improving" | "stable" | "declining";
    accountDiversity: number;
    creditAgeStrength: number;
    inquiryDensity: number;
    negativeItemRatio: number;
  };
  tradelineReadiness: "ready" | "conditional" | "not_ready";
  readinessReason: string;
  optimalTradelineProfile: {
    minCreditLimit: number;
    minHistoryYears: number;
    preferredBureaus: string[];
    maxUtilization: number;
    recommendedCount: number;
  };
  behaviorRecommendations: string[];
}

function calculateUtilizationImpact(
  currentLimit: number,
  currentBalance: number,
  additionalLimit: number
): number {
  if (currentLimit <= 0) return 0;
  const currentUtil = (currentBalance / currentLimit) * 100;
  const newUtil = (currentBalance / (currentLimit + additionalLimit)) * 100;
  const utilDrop = currentUtil - newUtil;
  if (utilDrop <= 0) return 0;
  if (currentUtil > 70 && newUtil < 30) return 40;
  if (currentUtil > 50 && newUtil < 30) return 25;
  if (currentUtil > 30 && newUtil < 10) return 15;
  return Math.min(Math.round(utilDrop * 0.5), 30);
}

function calculateAgeImpact(
  currentAvgAge: number,
  accountCount: number,
  newHistoryYears: number
): number {
  if (accountCount <= 0) return 0;
  const newAvgAge = ((currentAvgAge * accountCount) + newHistoryYears) / (accountCount + 1);
  const ageGain = newAvgAge - currentAvgAge;
  if (ageGain <= 0) return 0;
  if (currentAvgAge < 2 && newAvgAge >= 5) return 25;
  if (currentAvgAge < 3 && newAvgAge >= 5) return 15;
  if (currentAvgAge < 5 && newAvgAge >= 7) return 10;
  return Math.min(Math.round(ageGain * 3), 20);
}

function scorePartnerMatch(
  partner: any,
  clientScores: { equifax: number | null; experian: number | null; transunion: number | null },
  currentUtilization: number,
  currentAvgAge: number,
  accountCount: number,
  totalCreditLimit: number,
  totalBalance: number
): TradelineMatch | null {
  const available = (partner.totalSlots || 0) - (partner.usedSlots || 0);
  if (available <= 0 || partner.status !== "active") return null;

  const matchReasons: string[] = [];
  let matchScore = 0;

  const utilImpact = calculateUtilizationImpact(
    totalCreditLimit, totalBalance, partner.creditLimit
  );
  const ageImp = calculateAgeImpact(currentAvgAge, accountCount, partner.historyYears);

  if (partner.creditLimit >= 1000000) {
    matchScore += 25;
    matchReasons.push(`High credit limit ($${(partner.creditLimit / 100).toLocaleString()})`);
  } else if (partner.creditLimit >= 500000) {
    matchScore += 15;
    matchReasons.push(`Moderate credit limit ($${(partner.creditLimit / 100).toLocaleString()})`);
  }

  if (partner.historyYears >= 10) {
    matchScore += 25;
    matchReasons.push(`Excellent account age (${partner.historyYears} years)`);
  } else if (partner.historyYears >= 5) {
    matchScore += 15;
    matchReasons.push(`Good account age (${partner.historyYears} years)`);
  }

  if (currentUtilization > 50 && utilImpact > 10) {
    matchScore += 20;
    matchReasons.push(`Reduces utilization by ~${utilImpact}%`);
  }

  if (currentAvgAge < 3 && partner.historyYears >= 7) {
    matchScore += 15;
    matchReasons.push("Significantly boosts average account age");
  }

  const bureaus = partner.reportingBureaus || [];
  const avgScore = [clientScores.equifax, clientScores.experian, clientScores.transunion]
    .filter((s): s is number => s !== null);
  const lowestScore = avgScore.length ? Math.min(...avgScore) : 0;
  const lowestBureau = lowestScore === clientScores.equifax ? "equifax"
    : lowestScore === clientScores.experian ? "experian" : "transunion";

  if (bureaus.includes(lowestBureau)) {
    matchScore += 10;
    matchReasons.push(`Reports to weakest bureau (${lowestBureau})`);
  }

  if (bureaus.length === 3) {
    matchScore += 5;
    matchReasons.push("Reports to all 3 bureaus");
  }

  const projectedScoreImpact = Math.min(utilImpact + ageImp, 50);

  let riskLevel: "low" | "medium" | "high" = "low";
  if (partner.currentBalance && partner.creditLimit) {
    const partnerUtil = (partner.currentBalance / partner.creditLimit) * 100;
    if (partnerUtil > 30) riskLevel = "medium";
    if (partnerUtil > 50) riskLevel = "high";
  }

  if (matchScore < 10) return null;

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    bankName: partner.bankName,
    cardName: partner.cardName,
    creditLimit: partner.creditLimit,
    historyYears: partner.historyYears,
    reportingBureaus: bureaus,
    availableSlots: available,
    pricePerSlot: partner.pricePerSlot || 0,
    matchScore,
    matchReasons,
    projectedScoreImpact,
    utilizationImpact: utilImpact,
    ageImpact: ageImp,
    riskLevel,
  };
}

export async function optimizeTradelinesForClient(clientId: string): Promise<TradelineOptimizationPlan | null> {
  const client = await storage.getClient(clientId);
  if (!client) return null;

  const partners = await storage.getCardholderPartners();
  const tradelines = await storage.getTradelinesByClient(clientId);
  const disputes = await storage.getDisputesByClient(clientId);

  const activeTradelines = tradelines.filter((t: any) => t.status === "active" || t.status === "placed");
  const totalCreditLimit = activeTradelines.reduce((sum: number, t: any) => sum + (t.creditLimit || 0), 0);

  const partnerMap = new Map(partners.map((p: any) => [p.name, p]));
  const totalBalance = activeTradelines.reduce((sum: number, t: any) => {
    const partner = partnerMap.get(t.institution);
    return sum + (partner?.currentBalance || 0);
  }, 0);
  const accountCount = activeTradelines.length;
  const currentAvgAge = accountCount > 0
    ? activeTradelines.reduce((sum: number, t: any) => sum + (t.historyYears || 0), 0) / accountCount
    : 0;
  const currentUtilization = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;

  const scores = {
    equifax: (client as any).equifaxScore ?? null,
    experian: (client as any).experianScore ?? null,
    transunion: (client as any).transunionScore ?? null,
  };

  const usedPartnerIds = new Set(tradelines.map((t: any) => t.institution));

  const recommendations: TradelineMatch[] = [];
  for (const partner of partners) {
    if (usedPartnerIds.has(partner.name)) continue;

    const match = scorePartnerMatch(
      partner, scores, currentUtilization, currentAvgAge,
      accountCount, totalCreditLimit, totalBalance
    );
    if (match) recommendations.push(match);
  }

  recommendations.sort((a, b) => b.matchScore - a.matchScore);
  const topRecs = recommendations.slice(0, 5);

  const totalProjectedImpact = topRecs.reduce((sum, r) => sum + r.projectedScoreImpact, 0);
  const totalCost = topRecs.reduce((sum, r) => sum + r.pricePerSlot, 0);

  const negativeCount = disputes.filter((d: any) => d.status === "preparing" || d.status === "sent").length;

  let strategy = "";
  if (negativeCount > 3) {
    strategy = "Priority: Resolve active disputes before adding tradelines. Focus on removing collections and charge-offs first, then add AU tradelines to boost thin file.";
  } else if (currentUtilization > 50) {
    strategy = "Priority: Add high-limit tradelines to reduce utilization ratio. Target cards with $10K+ limits from partners reporting to all 3 bureaus.";
  } else if (currentAvgAge < 3) {
    strategy = "Priority: Add seasoned tradelines (7+ years history) to boost average account age. This is the fastest path to score improvement.";
  } else {
    strategy = "Credit profile is moderately strong. Add strategic tradelines to fine-tune score for specific loan approval targets.";
  }

  const timeline = topRecs.length > 0
    ? `Place ${topRecs.length} tradelines over ${Math.ceil(topRecs.length / 2)} reporting cycles (${Math.ceil(topRecs.length / 2) * 30}-${Math.ceil(topRecs.length / 2) * 45} days). Expected score impact within 45-90 days of placement.`
    : "No suitable tradeline matches found. Review partner inventory or wait for slot availability.";

  let riskAssessment = "Low risk";
  const highRiskCount = topRecs.filter(r => r.riskLevel === "high").length;
  if (highRiskCount > 1) riskAssessment = "Elevated risk — multiple partner cards have high utilization";
  else if (highRiskCount === 1) riskAssessment = "Moderate risk — one partner card has elevated utilization";

  return {
    clientId,
    clientName: `${client.firstName} ${client.lastName}`,
    currentScores: scores,
    currentUtilization,
    currentAvgAge,
    recommendations: topRecs,
    totalProjectedImpact: Math.min(totalProjectedImpact, 80),
    totalCost,
    strategy,
    timeline,
    riskAssessment,
  };
}

export async function batchOptimizeAll(): Promise<BatchProcessResult> {
  const start = Date.now();
  const clients = await storage.getClients();
  const activeClients = clients.filter((c: any) => c.status === "active");

  const results: BatchProcessResult["results"] = [];
  let optimized = 0, errors = 0;

  const batchSize = 5;
  for (let i = 0; i < activeClients.length; i += batchSize) {
    const batch = activeClients.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (client: any) => {
        const plan = await optimizeTradelinesForClient(client.id);
        return { client, plan };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        const { client, plan } = result.value;
        if (plan && plan.recommendations.length > 0) {
          optimized++;
          results.push({
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            status: "optimized",
            recommendationCount: plan.recommendations.length,
            projectedImpact: plan.totalProjectedImpact,
            message: plan.strategy,
          });
        } else {
          results.push({
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            status: "skipped",
            recommendationCount: 0,
            projectedImpact: 0,
            message: "No suitable tradeline matches or client not eligible",
          });
        }
      } else {
        errors++;
        results.push({
          clientId: "unknown",
          clientName: "Unknown",
          status: "error",
          recommendationCount: 0,
          projectedImpact: 0,
          message: result.reason?.message || "Processing error",
        });
      }
    }
  }

  return {
    totalClients: activeClients.length,
    processed: results.length,
    optimized,
    errors,
    results,
    processingTimeMs: Date.now() - start,
  };
}

export async function analyzeClientBehavior(clientId: string): Promise<TradelineBehaviorProfile | null> {
  const client = await storage.getClient(clientId);
  if (!client) return null;

  const disputes = await storage.getDisputesByClient(clientId);
  const tradelines = await storage.getTradelinesByClient(clientId);
  const transactions = await storage.getTransactions();
  const clientTransactions = transactions.filter((t: any) => t.clientId === clientId);

  const totalDisputes = disputes.length;
  const resolvedDisputes = disputes.filter((d: any) => d.status === "validated" || d.status === "deleted").length;
  const pendingDisputes = disputes.filter((d: any) => d.status === "preparing" || d.status === "sent").length;
  const activeTradelines = tradelines.filter((t: any) => t.status === "active").length;
  const totalTradelines = tradelines.length;

  const paidTransactions = clientTransactions.filter((t: any) => t.status === "completed" || t.status === "paid").length;
  const totalTransactions = clientTransactions.length;
  const paymentConsistency = totalTransactions > 0 ? (paidTransactions / totalTransactions) * 100 : 100;

  const negativeItemRatio = totalDisputes > 0 ? pendingDisputes / totalDisputes : 0;

  const accountDiversity = Math.min(
    ((activeTradelines > 0 ? 25 : 0) +
     (totalDisputes > 0 && resolvedDisputes > 0 ? 25 : 0) +
     (totalTransactions >= 3 ? 25 : 0) +
     (tradelines.some((t: any) => (t.historyYears || 0) >= 5) ? 25 : 0)),
    100
  );

  const avgAge = totalTradelines > 0
    ? tradelines.reduce((sum: number, t: any) => sum + (t.historyYears || 0), 0) / totalTradelines
    : 0;
  const creditAgeStrength = Math.min(avgAge * 10, 100);

  const inquiryDensity = Math.min(totalDisputes * 5, 100);

  let utilizationTrend: "improving" | "stable" | "declining" = "stable";
  if (resolvedDisputes > pendingDisputes) utilizationTrend = "improving";
  if (pendingDisputes > resolvedDisputes * 2) utilizationTrend = "declining";

  let riskScore = 0;
  riskScore += (100 - paymentConsistency) * 0.35;
  riskScore += negativeItemRatio * 30;
  riskScore += (100 - accountDiversity) * 0.15;
  riskScore += (100 - creditAgeStrength) * 0.10;
  riskScore += inquiryDensity * 0.10;
  riskScore = Math.min(Math.round(riskScore), 100);

  let riskSegment: "low" | "medium" | "high" | "critical" = "low";
  if (riskScore >= 70) riskSegment = "critical";
  else if (riskScore >= 50) riskSegment = "high";
  else if (riskScore >= 25) riskSegment = "medium";

  let tradelineReadiness: "ready" | "conditional" | "not_ready" = "ready";
  let readinessReason = "Client profile is suitable for tradeline placement.";

  if (pendingDisputes > 5) {
    tradelineReadiness = "not_ready";
    readinessReason = "Too many unresolved disputes. Resolve at least half before adding tradelines.";
  } else if (riskSegment === "critical") {
    tradelineReadiness = "not_ready";
    readinessReason = "Critical risk profile. Focus on dispute resolution and payment consistency first.";
  } else if (pendingDisputes > 2 || riskSegment === "high") {
    tradelineReadiness = "conditional";
    readinessReason = "Client may benefit from tradelines but should resolve active disputes first for maximum impact.";
  }

  const scores = [
    (client as any).equifaxScore,
    (client as any).experianScore,
    (client as any).transunionScore
  ].filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  let minCreditLimit = 5000;
  let minHistoryYears = 3;
  let recommendedCount = 2;
  if (avgScore < 550) {
    minCreditLimit = 10000;
    minHistoryYears = 7;
    recommendedCount = 3;
  } else if (avgScore < 650) {
    minCreditLimit = 7500;
    minHistoryYears = 5;
    recommendedCount = 2;
  }

  const preferredBureaus: string[] = [];
  const scoreMap: Record<string, number | null> = {
    equifax: (client as any).equifaxScore,
    experian: (client as any).experianScore,
    transunion: (client as any).transunionScore,
  };
  const sortedBureaus = Object.entries(scoreMap)
    .filter(([, v]) => v !== null)
    .sort(([, a], [, b]) => (a as number) - (b as number));
  for (const [bureau] of sortedBureaus.slice(0, 2)) {
    preferredBureaus.push(bureau);
  }
  if (preferredBureaus.length === 0) preferredBureaus.push("equifax", "experian", "transunion");

  const behaviorRecommendations: string[] = [];
  if (paymentConsistency < 80) behaviorRecommendations.push("Improve payment consistency — ensure all invoices are paid on time");
  if (negativeItemRatio > 0.5) behaviorRecommendations.push("Prioritize dispute resolution — over half of disputes are still unresolved");
  if (accountDiversity < 50) behaviorRecommendations.push("Increase account diversity — consider adding different credit product types");
  if (creditAgeStrength < 30) behaviorRecommendations.push("Build credit age — add seasoned tradelines with 7+ years of history");
  if (utilizationTrend === "declining") behaviorRecommendations.push("Reverse declining trend — focus on reducing outstanding negative items");
  if (tradelineReadiness === "ready") behaviorRecommendations.push("Client is ready for tradeline placement — proceed with optimization plan");

  return {
    clientId,
    clientName: `${client.firstName} ${client.lastName}`,
    riskSegment,
    riskScore,
    behaviorIndicators: {
      paymentConsistency: Math.round(paymentConsistency),
      utilizationTrend,
      accountDiversity,
      creditAgeStrength: Math.round(creditAgeStrength),
      inquiryDensity: Math.round(inquiryDensity),
      negativeItemRatio: Math.round(negativeItemRatio * 100),
    },
    tradelineReadiness,
    readinessReason,
    optimalTradelineProfile: {
      minCreditLimit,
      minHistoryYears,
      preferredBureaus,
      maxUtilization: 9,
      recommendedCount,
    },
    behaviorRecommendations,
  };
}

export async function aiTradelineStrategy(clientId: string): Promise<{
  strategy: string;
  placements: { partnerName: string; reason: string; timing: string; expectedImpact: string }[];
  warnings: string[];
  estimatedScoreGain: string;
}> {
  const client = await storage.getClient(clientId);
  if (!client) throw new Error("Client not found");

  const plan = await optimizeTradelinesForClient(clientId);
  const behavior = await analyzeClientBehavior(clientId);
  if (!plan || !behavior) throw new Error("Could not generate optimization data");

  const prompt = `You are a Credit Repair Tradeline Specialist AI. Analyze this client and create an optimal AU tradeline placement strategy.

CLIENT: ${plan.clientName}
SCORES: EQ=${plan.currentScores.equifax || "N/A"}, EX=${plan.currentScores.experian || "N/A"}, TU=${plan.currentScores.transunion || "N/A"}
CURRENT AVG AGE: ${plan.currentAvgAge.toFixed(1)} years
UTILIZATION: ${plan.currentUtilization.toFixed(1)}%
RISK SEGMENT: ${behavior.riskSegment} (score: ${behavior.riskScore}/100)
TRADELINE READINESS: ${behavior.tradelineReadiness} — ${behavior.readinessReason}
PAYMENT CONSISTENCY: ${behavior.behaviorIndicators.paymentConsistency}%
UTILIZATION TREND: ${behavior.behaviorIndicators.utilizationTrend}

AVAILABLE TRADELINE MATCHES (top ${plan.recommendations.length}):
${plan.recommendations.map((r, i) => `${i + 1}. ${r.partnerName} — ${r.bankName} ${r.cardName} — $${(r.creditLimit / 100).toLocaleString()} limit — ${r.historyYears}yr history — Reports: ${r.reportingBureaus.join(",")} — $${(r.pricePerSlot / 100).toFixed(0)}/slot — Match: ${r.matchScore}/100 — Projected: +${r.projectedScoreImpact}pts`).join("\n") || "None available"}

Respond with valid JSON:
{
  "strategy": "overall strategy paragraph",
  "placements": [
    { "partnerName": "name", "reason": "why this one", "timing": "when to place", "expectedImpact": "score impact" }
  ],
  "warnings": ["any risk warnings"],
  "estimatedScoreGain": "X-Y points over Z months"
}`;

  const raw = await aiProvider.generate({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 1500,
    temperature: 0.3,
    json: true,
  });

  recordUsageEvent({ eventType: "ai_analysis", clientId, metadata: { type: "tradeline_strategy" }, quantity: 1 }).catch(() => {});

  try {
    return JSON.parse(raw);
  } catch {
    return {
      strategy: "Unable to generate AI strategy. Please try again.",
      placements: [],
      warnings: ["AI response could not be parsed"],
      estimatedScoreGain: "Unknown",
    };
  }
}
