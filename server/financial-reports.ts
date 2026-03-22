/**
 * Financial Reports & Credit Sales Engine
 * Based on priyaranjan756/Creditshelf and kjennings31/CreditReportCRUD patterns
 * Sales tracking, revenue analytics, credit factor snapshots, financial forecasting
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

export interface SalesReport {
  period: string;
  totalRevenue: number;
  totalSales: number;
  paidAmount: number;
  unpaidAmount: number;
  creditSales: number;
  cashSales: number;
  averageTicket: number;
  topServices: { type: string; revenue: number; count: number }[];
}

export interface ClientFinancialSummary {
  clientId: string;
  clientName: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  creditSalesCount: number;
  paymentHistory: { date: string; amount: number; status: string }[];
  riskScore: number;
}

export interface RevenueForecasting {
  currentMonthProjected: number;
  nextMonthProjected: number;
  quarterProjected: number;
  yearProjected: number;
  growthRate: number;
  avgMonthlyRevenue: number;
  recurringRevenue: number;
  atRiskRevenue: number;
}

export async function getSalesReport(period: "daily" | "weekly" | "monthly" | "yearly"): Promise<SalesReport> {
  const intervalMap = { daily: "1 day", weekly: "7 days", monthly: "30 days", yearly: "365 days" };
  const interval = intervalMap[period];

  const result = await db.execute(sql`
    SELECT 
      COALESCE(SUM(amount), 0) as total_revenue,
      COUNT(*) as total_sales,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as paid_amount,
      COALESCE(SUM(CASE WHEN status != 'completed' THEN amount ELSE 0 END), 0) as unpaid_amount,
      COALESCE(AVG(amount), 0) as avg_ticket
    FROM transactions
    WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
  `);

  const row = result.rows[0] || {};

  const serviceResult = await db.execute(sql`
    SELECT type, 
      COALESCE(SUM(amount), 0) as revenue, 
      COUNT(*) as count
    FROM transactions
    WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    GROUP BY type
    ORDER BY revenue DESC
    LIMIT 10
  `);

  const creditSalesResult = await db.execute(sql`
    SELECT 
      COUNT(*) as credit_count,
      COALESCE(SUM(amount), 0) as credit_total
    FROM credit_sales
    WHERE created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
  `);

  const csRow = creditSalesResult.rows[0] || {};

  return {
    period,
    totalRevenue: Number(row.total_revenue || 0),
    totalSales: Number(row.total_sales || 0),
    paidAmount: Number(row.paid_amount || 0),
    unpaidAmount: Number(row.unpaid_amount || 0),
    creditSales: Number(csRow.credit_count || 0),
    cashSales: Number(row.total_sales || 0) - Number(csRow.credit_count || 0),
    averageTicket: Math.round(Number(row.avg_ticket || 0)),
    topServices: serviceResult.rows.map((r: any) => ({
      type: r.type,
      revenue: Number(r.revenue),
      count: Number(r.count),
    })),
  };
}

export async function getClientFinancialSummary(clientId: string): Promise<ClientFinancialSummary | null> {
  const clientResult = await db.execute(sql`
    SELECT id, first_name, last_name FROM clients WHERE id = ${clientId}
  `);
  if (clientResult.rows.length === 0) return null;
  const client = clientResult.rows[0] as any;

  const txResult = await db.execute(sql`
    SELECT 
      COALESCE(SUM(amount), 0) as total_billed,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_paid
    FROM transactions WHERE client_id = ${clientId}
  `);
  const txRow = txResult.rows[0] || {};

  const creditResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM credit_sales WHERE client_id = ${clientId}
  `);

  const historyResult = await db.execute(sql`
    SELECT created_at, amount, status 
    FROM transactions 
    WHERE client_id = ${clientId}
    ORDER BY created_at DESC
    LIMIT 20
  `);

  const totalBilled = Number(txRow.total_billed || 0);
  const totalPaid = Number(txRow.total_paid || 0);
  const outstanding = totalBilled - totalPaid;
  const riskScore = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

  return {
    clientId,
    clientName: `${client.first_name} ${client.last_name}`,
    totalBilled,
    totalPaid,
    outstanding,
    creditSalesCount: Number(creditResult.rows[0]?.count || 0),
    paymentHistory: historyResult.rows.map((r: any) => ({
      date: r.created_at,
      amount: Number(r.amount),
      status: r.status,
    })),
    riskScore,
  };
}

export async function getRevenueForecasting(): Promise<RevenueForecasting> {
  const monthlyResult = await db.execute(sql`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COALESCE(SUM(amount), 0) as revenue
    FROM transactions
    WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  `);

  const months = monthlyResult.rows as any[];
  const revenues = months.map((m: any) => Number(m.revenue));
  const avgMonthly = revenues.length > 0 ? Math.round(revenues.reduce((a, b) => a + b, 0) / revenues.length) : 0;

  let growthRate = 0;
  if (revenues.length >= 2) {
    const recent = revenues[revenues.length - 1];
    const previous = revenues[revenues.length - 2];
    growthRate = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 0;
  }

  const currentMonthResult = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) as revenue
    FROM transactions
    WHERE status = 'completed' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
  `);
  const currentPartial = Number(currentMonthResult.rows[0]?.revenue || 0);
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentMonthProjected = dayOfMonth > 0 ? Math.round(currentPartial * (daysInMonth / dayOfMonth)) : avgMonthly;

  const atRiskResult = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) as at_risk
    FROM credit_sales
    WHERE payment_status = 'unpaid' AND due_date < NOW()
  `);

  return {
    currentMonthProjected,
    nextMonthProjected: Math.round(avgMonthly * (1 + growthRate / 100)),
    quarterProjected: Math.round(avgMonthly * 3 * (1 + growthRate / 200)),
    yearProjected: Math.round(avgMonthly * 12 * (1 + growthRate / 400)),
    growthRate,
    avgMonthlyRevenue: avgMonthly,
    recurringRevenue: Math.round(avgMonthly * 0.7),
    atRiskRevenue: Number(atRiskResult.rows[0]?.at_risk || 0),
  };
}

export async function createCreditSale(data: {
  clientId: string;
  description: string;
  amount: number;
  creditTerms?: string;
  dueDate?: string;
  notes?: string;
}): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO credit_sales (client_id, description, amount, credit_terms, due_date, notes)
    VALUES (${data.clientId}, ${data.description}, ${data.amount}, ${data.creditTerms || null}, ${data.dueDate ? new Date(data.dueDate) : null}, ${data.notes || null})
    RETURNING *
  `);
  return result.rows[0];
}

export async function getCreditSales(clientId?: string): Promise<any[]> {
  if (clientId) {
    const result = await db.execute(sql`
      SELECT cs.*, c.first_name, c.last_name 
      FROM credit_sales cs
      JOIN clients c ON cs.client_id = c.id
      WHERE cs.client_id = ${clientId}
      ORDER BY cs.created_at DESC
    `);
    return result.rows;
  }
  const result = await db.execute(sql`
    SELECT cs.*, c.first_name, c.last_name 
    FROM credit_sales cs
    JOIN clients c ON cs.client_id = c.id
    ORDER BY cs.created_at DESC
  `);
  return result.rows;
}

export async function recordCreditSalePayment(saleId: string, amount: number): Promise<any> {
  const result = await db.execute(sql`
    UPDATE credit_sales 
    SET paid_amount = paid_amount + ${amount},
        payment_status = CASE WHEN paid_amount + ${amount} >= amount THEN 'paid' ELSE 'partial' END,
        paid_at = CASE WHEN paid_amount + ${amount} >= amount THEN NOW() ELSE paid_at END
    WHERE id = ${saleId}
    RETURNING *
  `);
  return result.rows[0];
}

export async function saveCreditFactorSnapshot(clientId: string, factors: {
  creditCardUtilization: number;
  paymentHistoryScore: number;
  derogatoryMarks: number;
  creditAgeMonths: number;
  totalAccounts: number;
  hardInquiries: number;
  totalBalance: number;
  totalCreditLimit: number;
  collectionsCount: number;
  publicRecords: number;
  onTimePayments: number;
  totalPayments: number;
  overallScore: number;
  predictedScore30d: number;
  predictedScore90d: number;
  predictedScore180d: number;
}): Promise<any> {
  const result = await db.execute(sql`
    INSERT INTO credit_factors (
      client_id, credit_card_utilization, payment_history_score,
      derogatory_marks, credit_age_months, total_accounts, hard_inquiries,
      total_balance, total_credit_limit, collections_count, public_records,
      on_time_payments, total_payments, overall_score,
      predicted_score_30d, predicted_score_90d, predicted_score_180d
    ) VALUES (
      ${clientId}, ${factors.creditCardUtilization}, ${factors.paymentHistoryScore},
      ${factors.derogatoryMarks}, ${factors.creditAgeMonths}, ${factors.totalAccounts}, ${factors.hardInquiries},
      ${factors.totalBalance}, ${factors.totalCreditLimit}, ${factors.collectionsCount}, ${factors.publicRecords},
      ${factors.onTimePayments}, ${factors.totalPayments}, ${factors.overallScore},
      ${factors.predictedScore30d}, ${factors.predictedScore90d}, ${factors.predictedScore180d}
    ) RETURNING *
  `);
  return result.rows[0];
}

export async function getCreditFactorHistory(clientId: string): Promise<any[]> {
  const result = await db.execute(sql`
    SELECT * FROM credit_factors
    WHERE client_id = ${clientId}
    ORDER BY snapshot_date DESC
    LIMIT 12
  `);
  return result.rows;
}
