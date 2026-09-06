import { pool } from "./db";
import type { User } from "@shared/schema";
import { isAdminUser, sanitizeUser } from "./authorization";

export type AccessStatus = "pending" | "approved" | "rejected";

export type UserAccessRecord = {
  userId: string;
  status: AccessStatus;
  isActive: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date | null;
};

let initPromise: Promise<void> | null = null;

export function ensureUserAccessTable(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_access_approvals (
          user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          status text NOT NULL DEFAULT 'pending',
          is_active boolean NOT NULL DEFAULT false,
          approved_by varchar NULL,
          approved_at timestamp NULL,
          last_login_at timestamp NULL,
          created_at timestamp NOT NULL DEFAULT NOW(),
          CONSTRAINT user_access_approvals_status_check
            CHECK (status IN ('pending', 'approved', 'rejected'))
        )
      `);

      // Existing administrators keep access. Existing non-admin users are deliberately
      // placed in pending state so an account that registered before this gate cannot
      // continue logging in until an administrator reviews it.
      await pool.query(`
        INSERT INTO user_access_approvals (user_id, status, is_active, approved_at)
        SELECT
          id,
          CASE WHEN lower(role) IN ('admin', 'administrator', 'owner') THEN 'approved' ELSE 'pending' END,
          CASE WHEN lower(role) IN ('admin', 'administrator', 'owner') THEN true ELSE false END,
          CASE WHEN lower(role) IN ('admin', 'administrator', 'owner') THEN NOW() ELSE NULL END
        FROM users
        ON CONFLICT (user_id) DO NOTHING
      `);
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

export async function ensureUserAccess(user: User): Promise<UserAccessRecord> {
  await ensureUserAccessTable();
  const admin = isAdminUser(user);
  await pool.query(
    `INSERT INTO user_access_approvals (user_id, status, is_active, approved_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO NOTHING`,
    [user.id, admin ? "approved" : "pending", admin, admin ? new Date() : null],
  );
  const record = await getUserAccess(user.id);
  if (!record) throw new Error("Unable to initialize user access state");
  return record;
}

export async function getUserAccess(userId: string): Promise<UserAccessRecord | undefined> {
  await ensureUserAccessTable();
  const result = await pool.query(
    `SELECT user_id, status, is_active, approved_by, approved_at, last_login_at, created_at
     FROM user_access_approvals WHERE user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    userId: row.user_id,
    status: row.status,
    isActive: row.is_active,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export async function canUserLogin(user: User): Promise<boolean> {
  if (isAdminUser(user)) return true;
  const access = await ensureUserAccess(user);
  return access.status === "approved" && access.isActive;
}

export async function markUserLogin(userId: string): Promise<void> {
  await ensureUserAccessTable();
  await pool.query(
    `UPDATE user_access_approvals SET last_login_at = NOW() WHERE user_id = $1`,
    [userId],
  );
}

export async function setUserAccess(
  userId: string,
  status: AccessStatus,
  administratorId: string,
): Promise<void> {
  await ensureUserAccessTable();
  const active = status === "approved";
  await pool.query(
    `INSERT INTO user_access_approvals (user_id, status, is_active, approved_by, approved_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $2 = 'approved' THEN NOW() ELSE NULL END)
     ON CONFLICT (user_id) DO UPDATE SET
       status = EXCLUDED.status,
       is_active = EXCLUDED.is_active,
       approved_by = EXCLUDED.approved_by,
       approved_at = CASE WHEN EXCLUDED.status = 'approved' THEN NOW() ELSE NULL END`,
    [userId, status, active, administratorId],
  );
}

export async function listUsersWithAccess(users: User[]) {
  await ensureUserAccessTable();
  await Promise.all(users.map((user) => ensureUserAccess(user)));
  const result = await pool.query(
    `SELECT user_id, status, is_active, approved_by, approved_at, last_login_at, created_at
     FROM user_access_approvals`,
  );
  const accessByUser = new Map(result.rows.map((row) => [row.user_id, row]));
  return users.map((user) => {
    const access = accessByUser.get(user.id);
    return {
      ...sanitizeUser(user),
      approvalStatus: isAdminUser(user) ? "approved" : (access?.status || "pending"),
      isActive: isAdminUser(user) ? true : Boolean(access?.is_active),
      approvedBy: access?.approved_by || null,
      approvedAt: access?.approved_at || null,
      lastLoginAt: access?.last_login_at || null,
    };
  });
}
