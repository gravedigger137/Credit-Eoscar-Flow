/**
 * Credit Score Predictor & Credit Factor Calculator
 * Based on rishabhpahuja/Credit-Score- and francheska-guzman/credit-report patterns
 * Estimates internal Credit-Eoscar readiness without pulling credit.
 * Output is not a FICO, VantageScore, bureau score, or consumer credit score.
 */

export interface CreditFactorInput {
  creditCardUtilization: number;
  onTimePayments: number;
  totalPayments: number;
  derogatoryMarks: number;
  creditAgeMonths: number;
  totalAccounts: number;
  hardInquiries: number;
  totalBalance: number;
  totalCreditLimit: number;
  collectionsCount: number;
  publicRecords: number;
  currentScore?: number;
}

export interface CreditFactorAnalysis {
  factors: {
    name: string;
    weight: number;
    score: number;
    maxScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    impact: "positive" | "neutral" | "negative";
    recommendation: string;
  }[];
  predictedScore: number;
  predictedRange: { low: number; high: number };
  predictions: {
    days30: number;
    days90: number;
    days180: number;
  };
  riskLevel: "Low" | "Moderate" | "High" | "Very High";
  approvalLikelihood: {
    creditCard: number;
    autoLoan: number;
    mortgage: number;
    personalLoan: number;
  };
  overallGrade: "A" | "B" | "C" | "D" | "F";
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function gradeFromPercent(pct: number): "A" | "B" | "C" | "D" | "F" {
  if (pct >= 90) return "A";
  if (pct >= 75) return "B";
  if (pct >= 60) return "C";
  if (pct >= 40) return "D";
  return "F";
}

export interface DefaultPredictionInput {
  creditLimit: number;
  balance: number;
  paymentHistory: number[];
  billAmounts: number[];
  payAmounts: number[];
  age?: number;
  educationLevel?: number;
  maritalStatus?: number;
}

export interface DefaultPrediction {
  defaultProbability: number;
  riskSegment: "low" | "medium" | "high" | "critical";
  riskScore: number;
  factors: { name: string; value: number; impact: "positive" | "neutral" | "negative"; weight: number; detail: string }[];
  recommendation: string;
  segmentDescription: string;
  monthlyTrend: "improving" | "stable" | "declining";
}

export function predictDefault(input: DefaultPredictionInput): DefaultPrediction {
  const factors: DefaultPrediction["factors"] = [];

  const utilization = input.creditLimit > 0 ? input.balance / input.creditLimit : 1;
  const utilRisk = utilization > 0.9 ? 0.85 : utilization > 0.7 ? 0.6 : utilization > 0.5 ? 0.4 : utilization > 0.3 ? 0.2 : 0.05;
  factors.push({
    name: "Credit Utilization Ratio",
    value: Math.round(utilization * 100),
    impact: utilRisk > 0.5 ? "negative" : utilRisk > 0.25 ? "neutral" : "positive",
    weight: 25,
    detail: `${Math.round(utilization * 100)}% of limit used ($${input.balance.toLocaleString()} / $${input.creditLimit.toLocaleString()})`,
  });

  const payHistory = input.paymentHistory || [];
  const latePayments = payHistory.filter(p => p < 0 || p > 1).length;
  const missedPayments = payHistory.filter(p => p <= -2).length;
  const payHistoryRisk = missedPayments >= 3 ? 0.9 : missedPayments >= 1 ? 0.65 : latePayments >= 3 ? 0.5 : latePayments >= 1 ? 0.3 : 0.05;
  factors.push({
    name: "Payment Behavior",
    value: latePayments,
    impact: payHistoryRisk > 0.5 ? "negative" : payHistoryRisk > 0.25 ? "neutral" : "positive",
    weight: 30,
    detail: `${missedPayments} missed, ${latePayments} late out of ${payHistory.length} months tracked`,
  });

  const bills = input.billAmounts || [];
  const pays = input.payAmounts || [];
  let payRatio = 1;
  if (bills.length > 0) {
    const totalBilled = bills.reduce((s, b) => s + Math.abs(b), 0);
    const totalPaid = pays.reduce((s, p) => s + p, 0);
    payRatio = totalBilled > 0 ? totalPaid / totalBilled : 1;
  }
  const payRatioRisk = payRatio < 0.3 ? 0.85 : payRatio < 0.5 ? 0.6 : payRatio < 0.8 ? 0.35 : payRatio < 1.0 ? 0.15 : 0.05;
  factors.push({
    name: "Bill-to-Payment Ratio",
    value: Math.round(payRatio * 100),
    impact: payRatioRisk > 0.5 ? "negative" : payRatioRisk > 0.25 ? "neutral" : "positive",
    weight: 20,
    detail: `Client pays ${Math.round(payRatio * 100)}% of billed amounts on average`,
  });

  let trendRisk = 0.3;
  let monthlyTrend: DefaultPrediction["monthlyTrend"] = "stable";
  if (bills.length >= 3) {
    const recentBills = bills.slice(-3);
    const olderBills = bills.slice(0, -3);
    const recentAvg = recentBills.reduce((s, b) => s + b, 0) / recentBills.length;
    const olderAvg = olderBills.length > 0 ? olderBills.reduce((s, b) => s + b, 0) / olderBills.length : recentAvg;
    if (recentAvg > olderAvg * 1.3) { trendRisk = 0.7; monthlyTrend = "declining"; }
    else if (recentAvg < olderAvg * 0.8) { trendRisk = 0.1; monthlyTrend = "improving"; }
  }
  factors.push({
    name: "Spending Trend",
    value: Math.round(trendRisk * 100),
    impact: trendRisk > 0.5 ? "negative" : trendRisk > 0.25 ? "neutral" : "positive",
    weight: 15,
    detail: `Spending is ${monthlyTrend} over the last ${bills.length} months`,
  });

  const balanceToLimit = input.creditLimit > 0 ? input.balance / input.creditLimit : 1;
  const maxBill = bills.length > 0 ? Math.max(...bills) : 0;
  const maxToLimit = input.creditLimit > 0 ? maxBill / input.creditLimit : 0;
  const overleverageRisk = (balanceToLimit > 0.8 && maxToLimit > 0.5) ? 0.75 : balanceToLimit > 0.6 ? 0.4 : 0.1;
  factors.push({
    name: "Overleverage Risk",
    value: Math.round(balanceToLimit * 100),
    impact: overleverageRisk > 0.5 ? "negative" : overleverageRisk > 0.25 ? "neutral" : "positive",
    weight: 10,
    detail: `Balance at ${Math.round(balanceToLimit * 100)}% of limit; peak bill was ${Math.round(maxToLimit * 100)}% of limit`,
  });

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weightedRisk = factors.reduce((s, f) => {
    const riskVal = f.name === "Credit Utilization Ratio" ? utilRisk :
                    f.name === "Payment Behavior" ? payHistoryRisk :
                    f.name === "Bill-to-Payment Ratio" ? payRatioRisk :
                    f.name === "Spending Trend" ? trendRisk : overleverageRisk;
    return s + (riskVal * f.weight / totalWeight);
  }, 0);

  const defaultProbability = Math.round(clamp(weightedRisk * 100, 1, 99));
  const riskScore = Math.round(clamp((1 - weightedRisk) * 1000, 0, 1000));

  const riskSegment: DefaultPrediction["riskSegment"] =
    defaultProbability >= 70 ? "critical" :
    defaultProbability >= 45 ? "high" :
    defaultProbability >= 20 ? "medium" : "low";

  const segmentDescriptions = {
    low: "Client shows strong payment discipline and healthy credit usage. Low default risk — suitable for credit limit increases or premium products.",
    medium: "Some risk indicators present. Monitor payment patterns and utilization. Consider proactive outreach to prevent deterioration.",
    high: "Multiple risk factors detected. High probability of missed payments. Recommend immediate intervention — payment plan, reduced limits, or credit counseling referral.",
    critical: "Severe default risk. Client shows pattern of missed payments, high utilization, and declining payment ratios. Escalate for collections strategy or hardship program.",
  };

  const recommendations = {
    low: "Maintain current credit terms. Client qualifies for loyalty offers and credit line increases.",
    medium: "Set up payment reminders. Consider balance transfer offers to reduce utilization. Schedule 30-day review.",
    high: "Initiate proactive contact. Offer structured payment plan. Freeze credit line increases. Review every 2 weeks.",
    critical: "Immediate intervention required. Enroll in hardship program or negotiate settlement. Consider reporting to collections if no response within 15 days.",
  };

  return {
    defaultProbability,
    riskSegment,
    riskScore,
    factors,
    recommendation: recommendations[riskSegment],
    segmentDescription: segmentDescriptions[riskSegment],
    monthlyTrend,
  };
}

export function analyzeCreditFactors(input: CreditFactorInput): CreditFactorAnalysis {
  const factors: CreditFactorAnalysis["factors"] = [];

  const utilization = input.totalCreditLimit > 0
    ? Math.round((input.totalBalance / input.totalCreditLimit) * 100)
    : (input.totalBalance > 0 ? 100 : 0);
  const utilScore = utilization <= 1 ? 100 :
                    utilization <= 9 ? 95 :
                    utilization <= 29 ? 80 :
                    utilization <= 49 ? 55 :
                    utilization <= 74 ? 30 : 10;
  factors.push({
    name: "Credit Card Utilization",
    weight: 30,
    score: utilScore,
    maxScore: 100,
    grade: gradeFromPercent(utilScore),
    impact: utilScore >= 70 ? "positive" : utilScore >= 40 ? "neutral" : "negative",
    recommendation: utilization > 30
      ? `Reduce utilization from ${utilization}% to under 30% (ideally under 10%). Pay down $${Math.max(0, input.totalBalance - Math.round(input.totalCreditLimit * 0.09)).toLocaleString()} to reach optimal range.`
      : utilization > 9
      ? `Utilization at ${utilization}% is good. Aim for under 9% for maximum score benefit.`
      : `Excellent! ${utilization}% utilization is in the optimal range.`,
  });

  const paymentRate = input.totalPayments > 0
    ? Math.round((input.onTimePayments / input.totalPayments) * 100) : 100;
  const payScore = paymentRate >= 99 ? 100 :
                   paymentRate >= 97 ? 85 :
                   paymentRate >= 95 ? 70 :
                   paymentRate >= 90 ? 50 :
                   paymentRate >= 80 ? 30 : 10;
  factors.push({
    name: "Payment History",
    weight: 35,
    score: payScore,
    maxScore: 100,
    grade: gradeFromPercent(payScore),
    impact: payScore >= 70 ? "positive" : payScore >= 40 ? "neutral" : "negative",
    recommendation: paymentRate < 100
      ? `${100 - paymentRate}% missed payments detected. Set up autopay for all accounts. Each on-time payment rebuilds this factor over 12-24 months.`
      : "Perfect payment history! Keep all accounts on autopay to maintain this.",
  });

  const derogScore = input.derogatoryMarks === 0 ? 100 :
                     input.derogatoryMarks === 1 ? 50 :
                     input.derogatoryMarks === 2 ? 30 :
                     input.derogatoryMarks <= 4 ? 15 : 5;
  factors.push({
    name: "Derogatory Marks",
    weight: 10,
    score: derogScore,
    maxScore: 100,
    grade: gradeFromPercent(derogScore),
    impact: derogScore >= 70 ? "positive" : derogScore >= 40 ? "neutral" : "negative",
    recommendation: input.derogatoryMarks > 0
      ? `${input.derogatoryMarks} derogatory mark(s) found. Dispute inaccurate items and negotiate pay-for-delete on collections. Each removal can boost score 20-45 points.`
      : "No derogatory marks — excellent standing.",
  });

  const ageYears = input.creditAgeMonths / 12;
  const ageScore = ageYears >= 10 ? 100 :
                   ageYears >= 7 ? 85 :
                   ageYears >= 5 ? 70 :
                   ageYears >= 3 ? 50 :
                   ageYears >= 1 ? 30 : 15;
  factors.push({
    name: "Credit Age",
    weight: 15,
    score: ageScore,
    maxScore: 100,
    grade: gradeFromPercent(ageScore),
    impact: ageScore >= 70 ? "positive" : ageScore >= 40 ? "neutral" : "negative",
    recommendation: ageYears < 5
      ? `Average credit age is ${ageYears.toFixed(1)} years. Don't close old accounts. Consider being added as an authorized user on a seasoned account (5+ years) to boost this factor.`
      : `Credit age of ${ageYears.toFixed(1)} years is strong. Avoid closing your oldest accounts.`,
  });

  const acctScore = input.totalAccounts >= 21 ? 100 :
                    input.totalAccounts >= 11 ? 85 :
                    input.totalAccounts >= 6 ? 70 :
                    input.totalAccounts >= 3 ? 50 : 25;
  factors.push({
    name: "Total Accounts (Credit Mix)",
    weight: 5,
    score: acctScore,
    maxScore: 100,
    grade: gradeFromPercent(acctScore),
    impact: acctScore >= 70 ? "positive" : acctScore >= 40 ? "neutral" : "negative",
    recommendation: input.totalAccounts < 6
      ? `Only ${input.totalAccounts} accounts. A healthy mix of revolving credit (cards) and installment loans (auto, mortgage) improves this. Consider a secured card or credit builder loan.`
      : `${input.totalAccounts} accounts is a healthy credit mix.`,
  });

  const inqScore = input.hardInquiries === 0 ? 100 :
                   input.hardInquiries === 1 ? 90 :
                   input.hardInquiries === 2 ? 75 :
                   input.hardInquiries <= 4 ? 50 :
                   input.hardInquiries <= 6 ? 30 : 10;
  factors.push({
    name: "Hard Inquiries",
    weight: 5,
    score: inqScore,
    maxScore: 100,
    grade: gradeFromPercent(inqScore),
    impact: inqScore >= 70 ? "positive" : inqScore >= 40 ? "neutral" : "negative",
    recommendation: input.hardInquiries > 2
      ? `${input.hardInquiries} hard inquiries in the last 2 years. Avoid new applications for 6-12 months. Dispute any unauthorized inquiries with the bureaus.`
      : `${input.hardInquiries} inquiries — minimal impact on score.`,
  });

  const weightedScore = factors.reduce((sum, f) => sum + (f.score * f.weight / 100), 0);
  const predictedScore = clamp(Math.round(300 + (weightedScore / 100) * 550), 300, 850);

  const baseScore = input.currentScore || predictedScore;
  let delta30 = 0, delta90 = 0, delta180 = 0;

  if (utilization > 30) {
    delta30 += 5; delta90 += 15; delta180 += 25;
  }
  if (input.derogatoryMarks > 0) {
    delta90 += 10; delta180 += 25;
  }
  if (paymentRate < 100 && paymentRate >= 90) {
    delta30 += 3; delta90 += 8; delta180 += 15;
  }
  if (input.totalAccounts < 5) {
    delta90 += 5; delta180 += 10;
  }

  const riskLevel: CreditFactorAnalysis["riskLevel"] =
    predictedScore >= 740 ? "Low" :
    predictedScore >= 670 ? "Moderate" :
    predictedScore >= 580 ? "High" : "Very High";

  const approvalBase = clamp((predictedScore - 300) / 550, 0, 1);
  const approvalLikelihood = {
    creditCard: Math.round(clamp(approvalBase * 100 + 10, 5, 98)),
    autoLoan: Math.round(clamp(approvalBase * 95 + 5, 5, 95)),
    mortgage: Math.round(clamp(approvalBase * 85, 2, 90)),
    personalLoan: Math.round(clamp(approvalBase * 90, 3, 92)),
  };

  return {
    factors,
    predictedScore,
    predictedRange: { low: clamp(predictedScore - 20, 300, 850), high: clamp(predictedScore + 20, 300, 850) },
    predictions: {
      days30: clamp(baseScore + delta30, 300, 850),
      days90: clamp(baseScore + delta90, 300, 850),
      days180: clamp(baseScore + delta180, 300, 850),
    },
    riskLevel,
    approvalLikelihood,
    overallGrade: gradeFromPercent(weightedScore),
  };
}
