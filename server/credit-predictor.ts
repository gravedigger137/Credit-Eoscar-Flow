/**
 * Credit Score Predictor & Credit Factor Calculator
 * Based on rishabhpahuja/Credit-Score- and francheska-guzman/credit-report patterns
 * Estimates creditworthiness without pulling credit, using 6 FICO factor weights
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
