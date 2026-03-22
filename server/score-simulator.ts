/**
 * Credit Score Simulator
 * Estimates FICO score impact of credit actions
 * Based on publicly documented FICO scoring factor weights
 */

export interface ScoreFactors {
  currentScore: number;
  totalAccounts: number;
  negativeAccounts: number;
  totalBalance: number;
  totalCreditLimit: number;
  inquiryCount: number;
  oldestAccountYears: number;
  latePayments30: number;
  latePayments60: number;
  latePayments90: number;
  collections: number;
  chargeOffs: number;
  publicRecords: number;
  hasOpenMortgage: boolean;
  hasOpenAutoLoan: boolean;
  hasOpenCreditCard: boolean;
}

export interface SimulationAction {
  type:
    | "remove_collection"
    | "remove_chargeoff"
    | "remove_late_payment"
    | "remove_public_record"
    | "pay_down_balance"
    | "add_authorized_user"
    | "open_secured_card"
    | "remove_inquiry"
    | "settle_debt"
    | "pay_collection"
    | "goodwill_removal"
    | "dispute_inaccuracy";
  details?: {
    amount?: number;
    accountAge?: number;
    creditLimit?: number;
    balanceReduction?: number;
  };
}

export interface SimulationResult {
  currentScore: number;
  projectedScore: number;
  scoreChange: number;
  breakdown: {
    action: string;
    impact: number;
    explanation: string;
    timeframe: string;
    difficulty: "Easy" | "Moderate" | "Hard" | "Very Hard";
  }[];
  scoreRange: { low: number; high: number };
  utilizationBefore: number;
  utilizationAfter: number;
}

function clampScore(score: number): number {
  return Math.min(850, Math.max(300, Math.round(score)));
}

function getUtilization(balance: number, limit: number): number {
  if (limit <= 0) return 100;
  return Math.round((balance / limit) * 100);
}

function utilizationImpact(currentUtil: number, newUtil: number): number {
  const tiers = [
    { max: 1, bonus: 30 },
    { max: 9, bonus: 20 },
    { max: 29, bonus: 10 },
    { max: 49, bonus: 0 },
    { max: 74, bonus: -15 },
    { max: 100, bonus: -30 },
  ];

  const getTierBonus = (util: number) => {
    for (const t of tiers) {
      if (util <= t.max) return t.bonus;
    }
    return -30;
  };

  return getTierBonus(newUtil) - getTierBonus(currentUtil);
}

export function simulateScoreChanges(
  factors: ScoreFactors,
  actions: SimulationAction[]
): SimulationResult {
  let projectedScore = factors.currentScore;
  let currentBalance = factors.totalBalance;
  let currentLimit = factors.totalCreditLimit;
  let currentNegatives = factors.negativeAccounts;
  let currentCollections = factors.collections;
  let currentChargeOffs = factors.chargeOffs;
  let currentLate30 = factors.latePayments30;
  let currentLate60 = factors.latePayments60;
  let currentLate90 = factors.latePayments90;
  let currentInquiries = factors.inquiryCount;
  let currentPublicRecords = factors.publicRecords;

  const breakdown: SimulationResult["breakdown"] = [];

  for (const action of actions) {
    let impact = 0;
    let explanation = "";
    let timeframe = "";
    let difficulty: "Easy" | "Moderate" | "Hard" | "Very Hard" = "Moderate";
    let actionLabel = "";

    switch (action.type) {
      case "remove_collection": {
        if (currentCollections <= 0) break;
        const age = action.details?.accountAge ?? 2;
        impact = age <= 1 ? 40 + Math.round(Math.random() * 20) :
                 age <= 3 ? 25 + Math.round(Math.random() * 15) :
                 15 + Math.round(Math.random() * 10);
        if (currentCollections === 1) impact += 15;
        currentCollections--;
        currentNegatives--;
        actionLabel = "Remove Collection Account";
        explanation = `Removing a ${age}-year-old collection account. Newer collections have a bigger score impact.`;
        timeframe = "30-45 days after bureau update";
        difficulty = "Hard";
        break;
      }

      case "remove_chargeoff": {
        if (currentChargeOffs <= 0) break;
        impact = 30 + Math.round(Math.random() * 30);
        if (currentChargeOffs === 1 && currentCollections === 0) impact += 20;
        currentChargeOffs--;
        currentNegatives--;
        actionLabel = "Remove Charge-Off";
        explanation = "Charge-offs are severe derogatory marks. Removal significantly improves payment history factor.";
        timeframe = "30-60 days after dispute resolution";
        difficulty = "Very Hard";
        break;
      }

      case "remove_late_payment": {
        const totalLates = currentLate30 + currentLate60 + currentLate90;
        if (totalLates <= 0) break;
        if (currentLate90 > 0) { impact = 20 + Math.round(Math.random() * 15); currentLate90--; }
        else if (currentLate60 > 0) { impact = 15 + Math.round(Math.random() * 10); currentLate60--; }
        else { impact = 10 + Math.round(Math.random() * 8); currentLate30--; }
        actionLabel = "Remove Late Payment";
        explanation = "Late payments account for 35% of FICO score. Each removal improves payment history.";
        timeframe = "30-45 days";
        difficulty = "Moderate";
        break;
      }

      case "remove_public_record": {
        if (currentPublicRecords <= 0) break;
        impact = 50 + Math.round(Math.random() * 40);
        currentPublicRecords--;
        currentNegatives--;
        actionLabel = "Remove Public Record (Bankruptcy/Judgment/Lien)";
        explanation = "Public records are the most damaging items. Removal creates the largest score jump.";
        timeframe = "30-90 days";
        difficulty = "Very Hard";
        break;
      }

      case "pay_down_balance": {
        const reduction = action.details?.balanceReduction ?? Math.round(currentBalance * 0.5);
        const oldUtil = getUtilization(currentBalance, currentLimit);
        const newBalance = Math.max(0, currentBalance - reduction);
        const newUtil = getUtilization(newBalance, currentLimit);
        impact = utilizationImpact(oldUtil, newUtil);
        currentBalance = newBalance;
        actionLabel = `Pay Down $${reduction.toLocaleString()} in Balances`;
        explanation = `Reduces utilization from ${oldUtil}% to ${newUtil}%. Credit utilization is 30% of FICO score.`;
        timeframe = "Immediate to 30 days (next reporting cycle)";
        difficulty = "Easy";
        break;
      }

      case "add_authorized_user": {
        const auLimit = action.details?.creditLimit ?? 10000;
        const auAge = action.details?.accountAge ?? 5;
        currentLimit += auLimit;
        const newUtil = getUtilization(currentBalance, currentLimit);
        const oldUtil = getUtilization(currentBalance, currentLimit - auLimit);
        impact = utilizationImpact(oldUtil, newUtil);
        impact += auAge >= 10 ? 15 : auAge >= 5 ? 10 : 5;
        actionLabel = `Add Authorized User (${auAge}yr / $${auLimit.toLocaleString()} limit)`;
        explanation = `Adds credit history depth and increases available credit. Lowers utilization from ${oldUtil}% to ${newUtil}%.`;
        timeframe = "30-60 days after reporting";
        difficulty = "Easy";
        break;
      }

      case "open_secured_card": {
        const secLimit = action.details?.creditLimit ?? 500;
        currentLimit += secLimit;
        impact = 5 + (factors.totalAccounts < 3 ? 10 : 3);
        actionLabel = `Open Secured Credit Card ($${secLimit} limit)`;
        explanation = "Adds a positive tradeline and increases available credit. May cause a small temporary dip from the inquiry.";
        timeframe = "3-6 months for full impact";
        difficulty = "Easy";
        break;
      }

      case "remove_inquiry": {
        if (currentInquiries <= 0) break;
        impact = currentInquiries <= 3 ? 3 : 5 + Math.round(Math.random() * 3);
        currentInquiries--;
        actionLabel = "Remove Hard Inquiry";
        explanation = "Hard inquiries account for ~10% of FICO score. Each removal provides a small boost.";
        timeframe = "30-45 days";
        difficulty = "Easy";
        break;
      }

      case "settle_debt": {
        const settleAmount = action.details?.amount ?? 0;
        impact = 5 + Math.round(Math.random() * 10);
        currentBalance = Math.max(0, currentBalance - settleAmount);
        actionLabel = `Settle Debt for $${settleAmount.toLocaleString()}`;
        explanation = "Settling for less than owed may add 'settled' notation but still improves debt-to-credit ratio.";
        timeframe = "30-60 days";
        difficulty = "Moderate";
        break;
      }

      case "pay_collection": {
        impact = 10 + Math.round(Math.random() * 15);
        actionLabel = "Pay Collection in Full";
        explanation = "Paid collections under newer scoring models (FICO 9, VantageScore 3.0+) have less negative impact.";
        timeframe = "30-45 days after update";
        difficulty = "Moderate";
        break;
      }

      case "goodwill_removal": {
        impact = 15 + Math.round(Math.random() * 15);
        currentNegatives = Math.max(0, currentNegatives - 1);
        actionLabel = "Goodwill Deletion Letter";
        explanation = "Request creditor to remove negative mark as a courtesy. Works best with otherwise good history.";
        timeframe = "30-90 days";
        difficulty = "Hard";
        break;
      }

      case "dispute_inaccuracy": {
        impact = 20 + Math.round(Math.random() * 25);
        currentNegatives = Math.max(0, currentNegatives - 1);
        actionLabel = "Dispute Inaccurate Item";
        explanation = "If item is verified as inaccurate, bureau must remove it within 30 days per FCRA Section 611.";
        timeframe = "30-45 days (bureau investigation period)";
        difficulty = "Moderate";
        break;
      }
    }

    if (impact !== 0) {
      projectedScore = clampScore(projectedScore + impact);
      breakdown.push({ action: actionLabel, impact, explanation, timeframe, difficulty });
    }
  }

  const variance = 15;
  return {
    currentScore: factors.currentScore,
    projectedScore,
    scoreChange: projectedScore - factors.currentScore,
    breakdown,
    scoreRange: {
      low: clampScore(projectedScore - variance),
      high: clampScore(projectedScore + variance),
    },
    utilizationBefore: getUtilization(factors.totalBalance, factors.totalCreditLimit),
    utilizationAfter: getUtilization(currentBalance, currentLimit),
  };
}

export function generateRecommendations(factors: ScoreFactors): SimulationAction[] {
  const actions: SimulationAction[] = [];

  if (factors.collections > 0) {
    for (let i = 0; i < Math.min(factors.collections, 3); i++) {
      actions.push({ type: "remove_collection", details: { accountAge: 2 } });
    }
  }
  if (factors.chargeOffs > 0) {
    for (let i = 0; i < Math.min(factors.chargeOffs, 2); i++) {
      actions.push({ type: "remove_chargeoff" });
    }
  }
  if (factors.latePayments30 + factors.latePayments60 + factors.latePayments90 > 0) {
    const totalLates = Math.min(factors.latePayments30 + factors.latePayments60 + factors.latePayments90, 3);
    for (let i = 0; i < totalLates; i++) {
      actions.push({ type: "remove_late_payment" });
    }
  }
  if (factors.publicRecords > 0) {
    actions.push({ type: "remove_public_record" });
  }
  const util = getUtilization(factors.totalBalance, factors.totalCreditLimit);
  if (util > 30 && factors.totalBalance > 0) {
    const target = Math.round(factors.totalCreditLimit * 0.1);
    const reduction = Math.max(0, factors.totalBalance - target);
    if (reduction > 0) actions.push({ type: "pay_down_balance", details: { balanceReduction: reduction } });
  }
  if (factors.totalAccounts < 5 || util > 50) {
    actions.push({ type: "add_authorized_user", details: { creditLimit: 10000, accountAge: 7 } });
  }
  if (factors.inquiryCount > 3) {
    actions.push({ type: "remove_inquiry" });
  }

  return actions;
}
