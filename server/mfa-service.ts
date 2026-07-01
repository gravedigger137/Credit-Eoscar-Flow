import crypto from "crypto";
import bcrypt from "bcryptjs";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ISSUER = process.env.MFA_ISSUER || "Credit-Eoscar";
const WINDOW = Number(process.env.MFA_TOTP_WINDOW || 1);

function base32Encode(buffer: Buffer) {
  let bits = "";
  let output = "";
  for (let i = 0; i < buffer.length; i += 1) {
    bits += buffer[i].toString(2).padStart(8, "0");
  }
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value: string) {
  const clean = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function recoveryCode() {
  return `${crypto.randomBytes(4).toString("hex")}-${crypto.randomBytes(4).toString("hex")}`.toUpperCase();
}

export function createTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function createOtpAuthUrl(email: string, secret: string) {
  const label = encodeURIComponent(`${ISSUER}:${email || "user"}`);
  const issuer = encodeURIComponent(ISSUER);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function verifyTotp(secret: string, token: string) {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -WINDOW; offset <= WINDOW; offset++) {
    if (hotp(secret, counter + offset) === clean) return true;
  }
  return false;
}

export async function createRecoveryCodes() {
  const codes = Array.from({ length: 10 }, recoveryCode);
  const hashes = await Promise.all(codes.map((code) => bcrypt.hash(code, 12)));
  return { codes, hashes };
}

export async function consumeRecoveryCode(code: string, hashes: string[]) {
  for (let i = 0; i < hashes.length; i += 1) {
    if (await bcrypt.compare(code.trim().toUpperCase(), hashes[i])) {
      return hashes.filter((_hash, index) => index !== i);
    }
  }
  return null;
}
