import crypto from "crypto";

const ENCRYPTED_PREFIX = "enc:v1:";
const SENSITIVE_KEY_PATTERNS = [
  "api_key",
  "apikey",
  "api-secret",
  "api_secret",
  "secret",
  "token",
  "password",
  "passphrase",
  "private",
  "certificate",
  "cert",
  "jwt",
  "ssn",
  "ein",
  "tax_id",
  "routing",
  "account_number",
  "plaid_access_token",
  "oauth",
  "webhook",
  "stripe",
  "plaid",
  "bureau",
  "eoscar",
  "smtp",
  "database_url",
  "connectionstring",
];

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

function getEncryptionKey() {
  const raw = process.env.SENSITIVE_CONFIG_ENCRYPTION_KEY;
  if (!raw) return null;

  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;

  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === 32) return utf8;

  throw new Error("SENSITIVE_CONFIG_ENCRYPTION_KEY must be a 32-byte UTF-8 string or 32-byte base64 value.");
}

export function isSensitiveConfigKey(key: string) {
  const normalized = normalizeKey(key).replace(/\./g, "_");
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function isEncryptedValue(value: string | undefined | null) {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptIfSensitive(key: string, value: string) {
  if (!isSensitiveConfigKey(key)) return value;
  if (isEncryptedValue(value)) return value;

  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SENSITIVE_CONFIG_ENCRYPTION_KEY is required before saving sensitive configuration in production.");
    }
    return value;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString("base64url"),
    ".",
    tag.toString("base64url"),
    ".",
    ciphertext.toString("base64url"),
  ].join("");
}

export function decryptIfEncrypted(value: string | undefined | null) {
  if (!value || !isEncryptedValue(value)) return value ?? undefined;

  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    throw new Error("SENSITIVE_CONFIG_ENCRYPTION_KEY is required to read encrypted configuration.");
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length);
  const [iv, tag, ciphertext] = payload.split(".");
  if (!iv || !tag || !ciphertext) {
    throw new Error("Encrypted configuration value has an invalid format.");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string | undefined | null) {
  if (!value) return null;
  if (value.length <= 8) return "********";
  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}
