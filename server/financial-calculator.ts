/**
 * Financial Calculator Engine
 * Based on Clueless-Community/fintech-api + emmanuelraj7/fintech-api patterns
 * Provides loan, interest, amortization, and credit repair ROI calculations
 */

export interface LoanCalculation {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  amortization: { month: number; payment: number; principal: number; interest: number; balance: number }[];
}

export function calculateLoanPayment(principal: number, annualRate: number, termMonths: number): LoanCalculation {
  const monthlyRate = annualRate / 100 / 12;
  let monthlyPayment: number;

  if (monthlyRate === 0) {
    monthlyPayment = principal / termMonths;
  } else {
    monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  const amortization: LoanCalculation["amortization"] = [];
  let balance = principal;

  for (let month = 1; month <= termMonths; month++) {
    const interest = balance * monthlyRate;
    const principalPart = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPart);
    amortization.push({
      month,
      payment: Math.round(monthlyPayment * 100) / 100,
      principal: Math.round(principalPart * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });
  }

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment: Math.round(monthlyPayment * termMonths * 100) / 100,
    totalInterest: Math.round((monthlyPayment * termMonths - principal) * 100) / 100,
    amortization,
  };
}

export interface DebtPayoffPlan {
  method: "avalanche" | "snowball";
  totalMonths: number;
  totalInterestPaid: number;
  totalPaid: number;
  debts: { name: string; balance: number; rate: number; minPayment: number; payoffMonth: number; interestPaid: number }[];
  monthlyBreakdown: { month: number; totalBalance: number; totalPayment: number; debtsRemaining: number }[];
}

export function calculateDebtPayoff(
  debts: { name: string; balance: number; rate: number; minPayment: number }[],
  extraPayment: number,
  method: "avalanche" | "snowball" = "avalanche"
): DebtPayoffPlan {
  const totalMinPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  if (totalMinPayments + extraPayment <= 0) {
    throw new Error("Total monthly budget (minimum payments + extra) must be greater than 0");
  }

  for (const d of debts) {
    if (d.balance > 0 && d.minPayment <= 0 && extraPayment <= 0) {
      throw new Error(`Debt "${d.name}" has a balance but no minimum payment and no extra payment — plan cannot terminate`);
    }
    const monthlyInterest = d.balance * (d.rate / 100 / 12);
    if (d.minPayment > 0 && d.minPayment <= monthlyInterest && extraPayment <= 0) {
      throw new Error(`Debt "${d.name}" minimum payment ($${d.minPayment}) does not cover monthly interest ($${monthlyInterest.toFixed(2)}) — negative amortization`);
    }
  }

  const sortedDebts = debts.map(d => ({ ...d, interestPaid: 0, payoffMonth: 0, currentBalance: d.balance }));

  if (method === "avalanche") {
    sortedDebts.sort((a, b) => b.rate - a.rate);
  } else {
    sortedDebts.sort((a, b) => a.balance - b.balance);
  }

  const monthlyBreakdown: DebtPayoffPlan["monthlyBreakdown"] = [];
  let month = 0;
  const maxMonths = 600;
  const totalMonthlyBudget = totalMinPayments + extraPayment;

  while (sortedDebts.some(d => d.currentBalance > 0.01) && month < maxMonths) {
    month++;

    for (const debt of sortedDebts) {
      if (debt.currentBalance <= 0) continue;
      const monthlyInterest = debt.currentBalance * (debt.rate / 100 / 12);
      debt.interestPaid += monthlyInterest;
      debt.currentBalance += monthlyInterest;
    }

    let budgetRemaining = totalMonthlyBudget;

    for (const debt of sortedDebts) {
      if (debt.currentBalance <= 0 || budgetRemaining <= 0) continue;
      const minPay = Math.min(debt.currentBalance, debt.minPayment);
      debt.currentBalance -= minPay;
      budgetRemaining -= minPay;
    }

    for (const debt of sortedDebts) {
      if (debt.currentBalance <= 0 || budgetRemaining <= 0) continue;
      const extra = Math.min(debt.currentBalance, budgetRemaining);
      debt.currentBalance -= extra;
      budgetRemaining -= extra;
      if (debt.currentBalance <= 0.01 && debt.payoffMonth === 0) {
        debt.payoffMonth = month;
      }
    }

    for (const debt of sortedDebts) {
      if (debt.currentBalance <= 0.01 && debt.payoffMonth === 0) {
        debt.payoffMonth = month;
      }
    }

    monthlyBreakdown.push({
      month,
      totalBalance: Math.round(sortedDebts.reduce((s, d) => s + Math.max(0, d.currentBalance), 0) * 100) / 100,
      totalPayment: Math.round((totalMonthlyBudget - budgetRemaining) * 100) / 100,
      debtsRemaining: sortedDebts.filter(d => d.currentBalance > 0.01).length,
    });
  }

  if (month >= maxMonths && sortedDebts.some(d => d.currentBalance > 0.01)) {
    throw new Error("Debt payoff plan exceeds 50 years — increase payments or reduce balances");
  }

  return {
    method,
    totalMonths: month,
    totalInterestPaid: Math.round(sortedDebts.reduce((s, d) => s + d.interestPaid, 0) * 100) / 100,
    totalPaid: Math.round(sortedDebts.reduce((s, d) => s + d.balance + d.interestPaid, 0) * 100) / 100,
    debts: sortedDebts.map(d => ({
      name: d.name, balance: d.balance, rate: d.rate, minPayment: d.minPayment,
      payoffMonth: d.payoffMonth, interestPaid: Math.round(d.interestPaid * 100) / 100,
    })),
    monthlyBreakdown: monthlyBreakdown.filter((_, i) => i % 3 === 0 || i === monthlyBreakdown.length - 1),
  };
}

export interface CreditRepairROI {
  currentScore: number;
  projectedScore: number;
  interestSavings: number;
  monthlyPaymentSavings: number;
  lifetimeSavings: number;
  repairCost: number;
  roi: number;
  breakEvenMonths: number;
  rateImprovements: { product: string; currentRate: number; projectedRate: number; savings: number }[];
}

export function calculateCreditRepairROI(
  currentScore: number,
  projectedScore: number,
  totalDebt: number,
  repairCost: number,
  loanTermMonths: number = 360
): CreditRepairROI {
  const getRate = (score: number, product: string): number => {
    const rates: Record<string, number[][]> = {
      mortgage: [[760, 6.2], [740, 6.5], [720, 6.8], [700, 7.1], [680, 7.5], [660, 8.0], [620, 8.8], [580, 9.5], [0, 11.0]],
      auto: [[760, 5.0], [740, 5.5], [720, 6.0], [700, 7.0], [680, 8.5], [660, 10.0], [620, 12.5], [580, 15.0], [0, 18.0]],
      creditCard: [[760, 15.0], [740, 17.0], [720, 19.0], [700, 21.0], [680, 23.0], [660, 25.0], [620, 27.0], [580, 29.0], [0, 32.0]],
      personal: [[760, 7.0], [740, 8.0], [720, 10.0], [700, 12.0], [680, 15.0], [660, 18.0], [620, 22.0], [580, 26.0], [0, 32.0]],
    };
    const tiers = rates[product] || rates.personal;
    for (const [threshold, rate] of tiers) {
      if (score >= threshold) return rate;
    }
    return tiers[tiers.length - 1][1];
  };

  const products = ["mortgage", "auto", "creditCard", "personal"];
  const rateImprovements = products.map(product => {
    const currentRate = getRate(currentScore, product);
    const projectedRate = getRate(projectedScore, product);
    const debtPortion = totalDebt * (product === "mortgage" ? 0.6 : product === "auto" ? 0.2 : product === "creditCard" ? 0.1 : 0.1);
    const currentMonthly = calculateLoanPayment(debtPortion, currentRate, product === "mortgage" ? 360 : product === "auto" ? 60 : 36).monthlyPayment;
    const projectedMonthly = calculateLoanPayment(debtPortion, projectedRate, product === "mortgage" ? 360 : product === "auto" ? 60 : 36).monthlyPayment;
    return {
      product: product === "creditCard" ? "Credit Card" : product.charAt(0).toUpperCase() + product.slice(1),
      currentRate, projectedRate,
      savings: Math.round((currentMonthly - projectedMonthly) * (product === "mortgage" ? 360 : product === "auto" ? 60 : 36) * 100) / 100,
    };
  });

  const totalSavings = rateImprovements.reduce((s, r) => s + r.savings, 0);
  const monthlyPaymentSavings = Math.round(totalSavings / loanTermMonths * 100) / 100;
  const roi = repairCost > 0 ? Math.round(((totalSavings - repairCost) / repairCost) * 100) : 0;
  const breakEvenMonths = monthlyPaymentSavings > 0 ? Math.ceil(repairCost / monthlyPaymentSavings) : 0;

  return {
    currentScore, projectedScore,
    interestSavings: Math.round(totalSavings * 100) / 100,
    monthlyPaymentSavings,
    lifetimeSavings: Math.round(totalSavings * 100) / 100,
    repairCost,
    roi,
    breakEvenMonths,
    rateImprovements,
  };
}

export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  compoundingPerYear: number = 12,
  periodicContribution: number = 0
): { futureValue: number; totalContributions: number; totalInterest: number; contributionFrequency: string; yearlyBreakdown: { year: number; balance: number; contributions: number; interest: number }[] } {
  const r = annualRate / 100 / compoundingPerYear;
  const n = compoundingPerYear * years;
  let balance = principal;
  let totalContributions = principal;
  const yearlyBreakdown: { year: number; balance: number; contributions: number; interest: number }[] = [];

  const freqLabels: Record<number, string> = { 1: "yearly", 2: "semi-annually", 4: "quarterly", 12: "monthly", 52: "weekly", 365: "daily" };
  const contributionFrequency = freqLabels[compoundingPerYear] || `${compoundingPerYear}x/year`;

  for (let period = 1; period <= n; period++) {
    const interest = balance * r;
    balance += interest + periodicContribution;
    totalContributions += periodicContribution;

    if (period % compoundingPerYear === 0) {
      yearlyBreakdown.push({
        year: period / compoundingPerYear,
        balance: Math.round(balance * 100) / 100,
        contributions: Math.round(totalContributions * 100) / 100,
        interest: Math.round((balance - totalContributions) * 100) / 100,
      });
    }
  }

  return {
    futureValue: Math.round(balance * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    totalInterest: Math.round((balance - totalContributions) * 100) / 100,
    contributionFrequency,
    yearlyBreakdown,
  };
}

export function calculateDebtToIncomeRatio(
  monthlyDebtPayments: number,
  monthlyGrossIncome: number
): { ratio: number; status: "excellent" | "good" | "fair" | "poor"; maxMortgage: number; recommendation: string } {
  const ratio = monthlyGrossIncome > 0 ? Math.round((monthlyDebtPayments / monthlyGrossIncome) * 100) : 100;
  const status = ratio <= 20 ? "excellent" as const : ratio <= 36 ? "good" as const : ratio <= 43 ? "fair" as const : "poor" as const;
  const maxAllowedDTI = 0.43;
  const maxMortgage = Math.max(0, Math.round((monthlyGrossIncome * maxAllowedDTI - monthlyDebtPayments) * 100) / 100);

  const recommendations: Record<string, string> = {
    excellent: "Your DTI is excellent. You qualify for the best loan terms and rates. Consider leveraging your strong position for optimal mortgage rates.",
    good: "Your DTI is good. Most lenders will approve you. Consider paying down high-interest debt to improve your ratio further.",
    fair: "Your DTI is approaching limits. Some lenders may require additional documentation. Focus on reducing monthly debt payments before applying for new credit.",
    poor: "Your DTI exceeds recommended levels. Most lenders will decline applications. Prioritize aggressive debt payoff before seeking new credit.",
  };

  return { ratio, status, maxMortgage, recommendation: recommendations[status] };
}
