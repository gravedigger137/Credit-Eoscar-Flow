import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

const { ADMIN_USERNAME, NEW_PASSWORD, DATABASE_URL } = process.env;

function fail(message: string): never {
  console.error(`Admin password reset failed: ${message}`);
  process.exit(1);
}

if (!ADMIN_USERNAME) {
  fail("ADMIN_USERNAME is required.");
}

if (!NEW_PASSWORD) {
  fail("NEW_PASSWORD is required.");
}

if (!DATABASE_URL) {
  fail("DATABASE_URL is required.");
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

try {
  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);
  const result = await pool.query(
    "update users set password = $1 where username = $2",
    [passwordHash, ADMIN_USERNAME],
  );

  if (result.rowCount !== 1) {
    fail(`username "${ADMIN_USERNAME}" was not found.`);
  }

  console.log(`Admin password reset succeeded for username "${ADMIN_USERNAME}".`);
} catch (error) {
  console.error(`Admin password reset failed for username "${ADMIN_USERNAME}".`);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
