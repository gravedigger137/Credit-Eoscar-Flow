/**
 * Trust Accounting & General Ledger Engine
 * Based on moov-io/accounts + sanda0/CGAccounting patterns
 * Credit repair businesses must track client trust funds separately
 * Provides double-entry ledger, trust account management, and reconciliation
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

export interface LedgerEntry {
  id?: string;
  accountId: string;
  type: "debit" | "credit";
  amount: number;
  description: string;
  category: "trust_deposit" | "trust_withdrawal" | "service_fee" | "refund" | "bureau_fee" | "partner_payout" | "adjustment";
  referenceType?: string;
  referenceId?: string;
  createdAt?: string;
}

export interface TrustAccount {
  clientId: string;
  clientName: string;
  trustBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalFees: number;
  lastActivity: string | null;
  status: "active" | "closed" | "frozen";
}

export interface AccountSummary {
  totalTrustFunds: number;
  totalOperatingFunds: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  accountsCount: number;
  recentEntries: LedgerEntry[];
}

export async function ensureLedgerTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      account_id VARCHAR(36) NOT NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL,
      category VARCHAR(30) NOT NULL,
      reference_type VARCHAR(30),
      reference_id VARCHAR(36),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by VARCHAR(36)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS trust_accounts (
      client_id VARCHAR(36) PRIMARY KEY,
      status VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'frozen')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_entries(created_at)`);
}

export async function createTrustAccount(clientId: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO trust_accounts (client_id) VALUES (${clientId})
    ON CONFLICT (client_id) DO NOTHING
  `);
}

export async function recordLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry> {
  const result = await db.execute(sql`
    INSERT INTO ledger_entries (account_id, type, amount, description, category, reference_type, reference_id)
    VALUES (${entry.accountId}, ${entry.type}, ${entry.amount}, ${entry.description}, ${entry.category}, ${entry.referenceType || null}, ${entry.referenceId || null})
    RETURNING *
  `);
  return result.rows[0] as any;
}

export async function recordTrustDeposit(clientId: string, amountCents: number, description: string): Promise<LedgerEntry> {
  await createTrustAccount(clientId);
  return recordLedgerEntry({
    accountId: clientId,
    type: "credit",
    amount: amountCents,
    description,
    category: "trust_deposit",
  });
}

export async function recordTrustWithdrawal(clientId: string, amountCents: number, description: string, category: LedgerEntry["category"] = "trust_withdrawal"): Promise<LedgerEntry> {
  const balance = await getTrustBalance(clientId);
  if (balance < amountCents) {
    throw new Error(`Insufficient trust balance: $${(balance / 100).toFixed(2)} available, $${(amountCents / 100).toFixed(2)} requested`);
  }
  return recordLedgerEntry({
    accountId: clientId,
    type: "debit",
    amount: amountCents,
    description,
    category,
  });
}

export async function getTrustBalance(clientId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as balance
    FROM ledger_entries
    WHERE account_id = ${clientId}
  `);
  return (result.rows[0] as any)?.balance || 0;
}

export async function getClientTrustAccount(clientId: string): Promise<TrustAccount | null> {
  const balanceResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_deposits,
      COALESCE(SUM(CASE WHEN type = 'debit' AND category = 'trust_withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals,
      COALESCE(SUM(CASE WHEN type = 'debit' AND category IN ('service_fee', 'bureau_fee', 'partner_payout') THEN amount ELSE 0 END), 0) as total_fees,
      COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as trust_balance,
      MAX(created_at) as last_activity
    FROM ledger_entries
    WHERE account_id = ${clientId}
  `);

  const row = balanceResult.rows[0] as any;
  if (!row || (row.total_deposits === 0 && row.trust_balance === 0)) return null;

  const clientResult = await db.execute(sql`SELECT first_name, last_name FROM clients WHERE id = ${clientId}`);
  const client = clientResult.rows[0] as any;

  const statusResult = await db.execute(sql`SELECT status FROM trust_accounts WHERE client_id = ${clientId}`);
  const status = (statusResult.rows[0] as any)?.status || "active";

  return {
    clientId,
    clientName: client ? `${client.first_name} ${client.last_name}` : "Unknown",
    trustBalance: row.trust_balance,
    totalDeposits: row.total_deposits,
    totalWithdrawals: row.total_withdrawals,
    totalFees: row.total_fees,
    lastActivity: row.last_activity,
    status,
  };
}

export async function getAllTrustAccounts(): Promise<TrustAccount[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT account_id FROM ledger_entries
    UNION
    SELECT client_id FROM trust_accounts
  `);

  const accounts: TrustAccount[] = [];
  for (const row of result.rows as any[]) {
    const acct = await getClientTrustAccount(row.account_id || row.client_id);
    if (acct) accounts.push(acct);
  }
  return accounts.sort((a, b) => b.trustBalance - a.trustBalance);
}

export async function getLedgerEntries(accountId?: string, limit: number = 50): Promise<LedgerEntry[]> {
  let result;
  if (accountId) {
    result = await db.execute(sql`
      SELECT * FROM ledger_entries
      WHERE account_id = ${accountId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
  } else {
    result = await db.execute(sql`
      SELECT * FROM ledger_entries
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
  }
  return result.rows.map((r: any) => ({
    id: r.id,
    accountId: r.account_id,
    type: r.type,
    amount: r.amount,
    description: r.description,
    category: r.category,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    createdAt: r.created_at,
  }));
}

export async function getAccountSummary(): Promise<AccountSummary> {
  const trustResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'credit' AND category = 'trust_deposit' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'debit' AND category IN ('trust_withdrawal', 'refund') THEN amount ELSE 0 END), 0) as total_trust,
      COALESCE(SUM(CASE WHEN type = 'debit' AND category IN ('service_fee', 'bureau_fee', 'partner_payout') THEN amount ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN type = 'debit' AND category = 'bureau_fee' THEN amount ELSE 0 END), 0) as total_expenses,
      COUNT(DISTINCT account_id) as accounts_count
    FROM ledger_entries
  `);

  const row = trustResult.rows[0] as any;
  const recentEntries = await getLedgerEntries(undefined, 10);

  return {
    totalTrustFunds: row.total_trust || 0,
    totalOperatingFunds: (row.total_revenue || 0) - (row.total_expenses || 0),
    totalRevenue: row.total_revenue || 0,
    totalExpenses: row.total_expenses || 0,
    netIncome: (row.total_revenue || 0) - (row.total_expenses || 0),
    accountsCount: row.accounts_count || 0,
    recentEntries,
  };
}

export async function reconcileTrustAccounts(): Promise<{ totalTrust: number; accountCount: number; discrepancies: string[] }> {
  const accounts = await getAllTrustAccounts();
  const discrepancies: string[] = [];
  let totalTrust = 0;

  for (const acct of accounts) {
    if (acct.trustBalance < 0) {
      discrepancies.push(`${acct.clientName}: Negative trust balance of $${(acct.trustBalance / 100).toFixed(2)}`);
    }
    totalTrust += acct.trustBalance;
  }

  return { totalTrust, accountCount: accounts.length, discrepancies };
}
