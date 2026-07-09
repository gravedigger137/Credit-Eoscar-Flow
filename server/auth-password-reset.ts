import crypto from "crypto";
import type { User } from "@shared/schema";

const ADMIN_RESET_ROLES = new Set(["admin", "administrator", "owner"]);

export function isPasswordResetAdmin(user: Pick<User, "role"> | null | undefined) {
  return !!user?.role && ADMIN_RESET_ROLES.has(user.role.toLowerCase());
}

export function canResetAdminPassword(
  actor: Pick<User, "role"> | null | undefined,
  target: Pick<User, "role"> | null | undefined,
) {
  return isPasswordResetAdmin(actor) && isPasswordResetAdmin(target);
}

export function canResetClientPassword(actor: Pick<User, "role"> | null | undefined) {
  return isPasswordResetAdmin(actor);
}

export function generateTemporaryPassword() {
  // 24+ chars, URL safe, mixed entropy from Node crypto. Returned only once to an authorized admin.
  return crypto.randomBytes(24).toString("base64url");
}
