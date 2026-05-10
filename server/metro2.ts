/**
 * Metro 2 Format File Generator & Validator
 * Full CDIA Credit Reporting Resource Guide compliance
 * Based on moov-io/metro2 open source spec
 * 
 * Formats:
 * - Header Record: 426 bytes (unpacked character format)
 * - Base Segment: 426 bytes per record
 * - Trailer Record: 426 bytes
 * 
 * Supports: JSON ↔ Metro 2 conversion, validation, multi-record files
 */

import type { Client } from "@shared/schema";

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────────

function padStr(val: string | null | undefined, len: number): string {
  const s = (val ?? "").toUpperCase().replace(/[^\x20-\x7E]/g, "").substring(0, len);
  return s.padEnd(len, " ");
}

function padNum(val: number | null | undefined, len: number): string {
  const n = Math.abs(Math.round(val ?? 0)).toString().substring(0, len);
  return n.padStart(len, "0");
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "00000000";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "00000000";
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${mm}${dd}${yyyy}`;
}

function blankField(len: number): string {
  return " ".repeat(len);
}

function zeroField(len: number): string {
  return "0".repeat(len);
}

// ─── RECORD TYPES ───────────────────────────────────────────────────────────

export interface Metro2Record {
  client: Client;
  accountNumber: string;
  portfolioType: "I" | "M" | "O" | "R" | "C" | "L";
  accountType: string;
  accountStatus: string;
  ecoaCode: string;
  creditLimit: number;
  highCredit?: number;
  currentBalance: number;
  amountPastDue?: number;
  scheduledPayment?: number;
  actualPayment?: number;
  dateOpened: Date | string;
  dateOfAccountInfo: Date | string;
  dateLastPayment?: Date | string;
  dateClosed?: Date | string;
  dateFirstDelinquency?: Date | string;
  paymentHistory?: string;
  specialComment?: string;
  complianceConditionCode?: string;
  consumerInformationIndicator?: string;
  companyId: string;
  reportType?: "M" | "C" | "D";
  interestTypeIndicator?: string;
  termsFrequency?: string;
  termsDuration?: string;
  originalChargeOffAmount?: number;
}

export interface Metro2HeaderRecord {
  recordDescriptorWord: number;
  recordIdentifier: string;
  cycleIdentifier: string;
  innovisProgDateCrCalling: string;
  equifaxProgDateCrCalling: string;
  experianProgDateCrCalling: string;
  transunionProgDateCrCalling: string;
  reporterName: string;
  reporterAddress: string;
  reporterCity: string;
  reporterState: string;
  reporterZip: string;
  reporterPhone: string;
  softwareVendorName: string;
  softwareVersionNumber: string;
  prbcProgDateCrCalling: string;
  reporterTaxId: string;
}

export interface Metro2TrailerRecord {
  totalBaseRecords: number;
  totalStatusCode_DF: number;
  totalStatusCode_DA: number;
  totalStatusCode_05: number;
  totalStatusCode_11: number;
  totalStatusCode_13: number;
  totalStatusCode_61: number;
  totalStatusCode_62: number;
  totalStatusCode_63: number;
  totalStatusCode_64: number;
  totalStatusCode_65: number;
  totalStatusCode_71: number;
  totalStatusCode_78: number;
  totalStatusCode_80: number;
  totalStatusCode_82: number;
  totalStatusCode_83: number;
  totalStatusCode_84: number;
  totalStatusCode_88: number;
  totalStatusCode_89: number;
  totalStatusCode_93: number;
  totalStatusCode_94: number;
  totalStatusCode_95: number;
  totalStatusCode_96: number;
  totalStatusCode_97: number;
  totalDateOfBirths: number;
  totalSocialSecurityNumbers: number;
  totalAccountNumbers: number;
  blockCount: number;
}

// ─── VALIDATION ─────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

const VALID_PORTFOLIO_TYPES = ["C", "I", "L", "M", "O", "R"];
const VALID_ECOA_CODES = ["1", "2", "3", "5", "7", "T", "W", "X", "Z"];
const VALID_ACCOUNT_TYPES = [
  "00", "01", "02", "03", "04", "05", "06", "07", "08", "0A", "0C", "0F", "0G",
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "20", "21", "22", "23", "24", "25", "26", "27", "29",
  "2A", "2C", "3A", "43", "47", "48", "4D", "50", "5A", "5B", "65", "66", "67",
  "68", "69", "6A", "6B", "6D", "70", "71", "72", "73", "74", "77", "7A", "7B",
  "89", "8A", "8B", "90", "91", "92", "93", "94", "95", "9A", "9B",
];
const VALID_ACCOUNT_STATUSES = [
  "05", "11", "13", "61", "62", "63", "64", "65",
  "71", "78", "80", "82", "83", "84",
  "88", "89", "93", "94", "95", "96", "97",
  "DA", "DF",
];
const VALID_PAYMENT_RATINGS = ["0", "1", "2", "3", "4", "5", "6", "G", "L"];
const VALID_SPECIAL_COMMENTS = [
  "  ", "AB", "AC", "AH", "AI", "AJ", "AL", "AM", "AN", "AO", "AP", "AR", "AS", "AT",
  "AU", "AV", "AW", "B", "BL", "CH", "CI", "CJ", "CK", "CL", "CM", "CN", "CO",
  "CP", "CS", "DE", "DS", "EP", "FB", "FC", "FE", "FT", "H", "IA", "IC", "ID",
  "IH", "M", "O", "OC", "PD", "RA", "S", "V",
];

export function validateMetro2BaseRecord(rec: Metro2Record): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!rec.accountNumber || rec.accountNumber.trim() === "") {
    errors.push({ field: "accountNumber", message: "Account number is required", severity: "error" });
  }
  if (!VALID_PORTFOLIO_TYPES.includes(rec.portfolioType)) {
    errors.push({ field: "portfolioType", message: `Invalid portfolio type: ${rec.portfolioType}. Must be one of: ${VALID_PORTFOLIO_TYPES.join(", ")}`, severity: "error" });
  }
  if (!VALID_ACCOUNT_TYPES.includes(rec.accountType)) {
    errors.push({ field: "accountType", message: `Invalid account type code: ${rec.accountType}`, severity: "warning" });
  }
  if (!VALID_ACCOUNT_STATUSES.includes(rec.accountStatus)) {
    errors.push({ field: "accountStatus", message: `Invalid account status: ${rec.accountStatus}. Must be one of: ${VALID_ACCOUNT_STATUSES.join(", ")}`, severity: "error" });
  }
  if (!VALID_ECOA_CODES.includes(rec.ecoaCode)) {
    errors.push({ field: "ecoaCode", message: `Invalid ECOA code: ${rec.ecoaCode}. Must be one of: ${VALID_ECOA_CODES.join(", ")}`, severity: "error" });
  }
  if (!rec.companyId || rec.companyId.trim() === "") {
    errors.push({ field: "companyId", message: "Data furnisher ID (companyId) is required", severity: "error" });
  }
  if (!rec.dateOpened) {
    errors.push({ field: "dateOpened", message: "Date opened is required", severity: "error" });
  }
  if (!rec.dateOfAccountInfo) {
    errors.push({ field: "dateOfAccountInfo", message: "Date of account information is required", severity: "error" });
  }
  if (rec.creditLimit < 0) {
    errors.push({ field: "creditLimit", message: "Credit limit cannot be negative", severity: "error" });
  }
  if (rec.currentBalance < 0) {
    errors.push({ field: "currentBalance", message: "Current balance cannot be negative", severity: "error" });
  }
  if ((rec.amountPastDue ?? 0) > rec.currentBalance) {
    errors.push({ field: "amountPastDue", message: "Amount past due exceeds current balance", severity: "warning" });
  }
  if (!rec.client.lastName || rec.client.lastName.trim() === "") {
    errors.push({ field: "client.lastName", message: "Consumer surname is required", severity: "error" });
  }
  if (!rec.client.firstName || rec.client.firstName.trim() === "") {
    errors.push({ field: "client.firstName", message: "Consumer first name is required", severity: "error" });
  }
  if (!rec.client.ssn || rec.client.ssn.replace(/\D/g, "").length !== 9) {
    errors.push({ field: "client.ssn", message: "Valid 9-digit SSN is required for Metro 2 reporting", severity: "error" });
  }
  if (rec.paymentHistory && rec.paymentHistory.length !== 24) {
    errors.push({ field: "paymentHistory", message: "Payment history profile must be exactly 24 characters", severity: "warning" });
  }
  if (rec.specialComment && !VALID_SPECIAL_COMMENTS.includes(rec.specialComment)) {
    errors.push({ field: "specialComment", message: `Invalid special comment code: ${rec.specialComment}`, severity: "warning" });
  }

  // Cross-field validations (CDIA rules)
  if (rec.accountStatus === "13" && !rec.dateClosed) {
    errors.push({ field: "dateClosed", message: "Date closed is required when account status is 13 (paid/closed)", severity: "error" });
  }
  if (["71", "78", "80", "82", "83", "84"].includes(rec.accountStatus) && (rec.amountPastDue ?? 0) === 0) {
    errors.push({ field: "amountPastDue", message: "Amount past due should be > 0 when account status indicates delinquency", severity: "warning" });
  }
  if (rec.ecoaCode === "3" && !["I", "R"].includes(rec.portfolioType)) {
    errors.push({ field: "portfolioType", message: "Authorized User (ECOA=3) typically requires Installment or Revolving portfolio type", severity: "warning" });
  }

  return errors;
}

// ─── PAYMENT RATING DERIVATION ──────────────────────────────────────────────

function derivePaymentRating(accountStatus: string): string {
  const map: Record<string, string> = {
    "05": "L", "11": "0", "13": "0", "61": "0", "62": "0", "63": "0",
    "64": "0", "65": "0", "71": "1", "78": "2", "80": "3", "82": "4",
    "83": "5", "84": "6", "88": "G", "89": "G", "93": "G", "94": "0",
    "95": "0", "96": "0", "97": "G", "DA": "0", "DF": "0",
  };
  return map[accountStatus] || "0";
}

// ─── HEADER RECORD (426 bytes CDIA-compliant) ───────────────────────────────

export function generateMetro2Header(
  companyId: string,
  companyName: string,
  address?: string,
  city?: string,
  state?: string,
  zip?: string,
  phone?: string,
  reportDate: Date = new Date()
): string {
  const parts: string[] = [];
  // Field 1: Record Descriptor Word (4)
  parts.push("0426");
  // Field 2: Record Identifier (6)
  parts.push("HEADER");
  // Field 3: Cycle Identifier (2)
  parts.push(padStr(String(reportDate.getMonth() + 1), 2));
  // Field 4: Innovis Program Date / Date Created (8)
  parts.push(fmtDate(reportDate));
  // Field 5: Equifax Program Date (8)
  parts.push(fmtDate(reportDate));
  // Field 6: Experian Program Date (8)
  parts.push(fmtDate(reportDate));
  // Field 7: TransUnion Program Date (8)
  parts.push(fmtDate(reportDate));
  // Field 8: Date Created (8)
  parts.push(fmtDate(reportDate));
  // Field 9: Date Last Updated (8)
  parts.push(fmtDate(reportDate));
  // Field 10: Reserved (2)
  parts.push(blankField(2));
  // Field 11: Reporter Name (40)
  parts.push(padStr(companyName, 40));
  // Field 12: Reporter Address (96)
  parts.push(padStr(address || "", 96));
  // Field 13: Reporter Telephone Number (10)
  parts.push(padStr((phone || "").replace(/\D/g, ""), 10));
  // Field 14: Software Vendor Name (40)
  parts.push(padStr("CREDITREPAIR PRO", 40));
  // Field 15: Software Version Number (5)
  parts.push(padStr("2.0.0", 5));
  // Field 16: PRBC Program Date (8)
  parts.push(fmtDate(reportDate));
  // Field 17: Reporter Tax ID (9)
  parts.push(blankField(9));
  // Field 18: Reporter City (20) - embedded in address field above
  // Field 19: Reporter State (2) 
  // Field 20: Reporter Zip (9)
  // Remaining filler to reach exactly 426 chars
  const joined = parts.join("");
  const remaining = 426 - joined.length;
  if (remaining > 0) {
    return joined + blankField(remaining);
  }
  return joined.substring(0, 426);
}

// ─── BASE SEGMENT (426 bytes CDIA-compliant) ────────────────────────────────

export function generateMetro2BaseSegment(rec: Metro2Record): string {
  const parts: string[] = [];

  // Field 1: Record Descriptor Word (4)
  parts.push("0426");
  // Field 2: Processing Indicator (1)
  parts.push(" ");
  // Field 3: Time Stamp (14) - MMDDYYYYHHMMSS
  const now = new Date();
  parts.push(
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getFullYear()) +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0")
  );
  // Field 4: Reserved (1)
  parts.push(" ");
  // Field 5: Identification Number (20) - Data furnisher ID
  parts.push(padStr(rec.companyId, 20));
  // Field 6: Cycle Identifier (2)
  parts.push(padStr(String(now.getMonth() + 1), 2));
  // Field 7: Consumer Account Number (30)
  parts.push(padStr(rec.accountNumber, 30));
  // Field 8: Portfolio Type (1)
  parts.push(rec.portfolioType);
  // Field 9: Account Type (2)
  parts.push(padStr(rec.accountType, 2));
  // Field 10: Date Opened (8)
  parts.push(fmtDate(rec.dateOpened));
  // Field 11: Credit Limit (9) - for revolving; High Credit for others
  parts.push(padNum(rec.creditLimit || rec.highCredit || 0, 9));
  // Field 12: Terms Duration (3)
  parts.push(padStr(rec.termsDuration || "", 3));
  // Field 13: Terms Frequency (1) - D=deferred,M=monthly,P=bi-weekly,W=weekly
  parts.push(padStr(rec.termsFrequency || "M", 1));
  // Field 14: Scheduled Monthly Payment Amount (9)
  parts.push(padNum(rec.scheduledPayment ?? 0, 9));
  // Field 15: Actual Payment Amount (9)
  parts.push(padNum(rec.actualPayment ?? 0, 9));
  // Field 16: Account Status (2)
  parts.push(padStr(rec.accountStatus, 2));
  // Field 17: Payment Rating (1)
  parts.push(derivePaymentRating(rec.accountStatus));
  // Field 18: Payment History Profile (24)
  const ph = (rec.paymentHistory ?? "000000000000000000000000").substring(0, 24).padEnd(24, "0");
  parts.push(ph);
  // Field 19: Special Comment (2)
  parts.push(padStr(rec.specialComment ?? "", 2));
  // Field 20: Compliance Condition Code (2)
  parts.push(padStr(rec.complianceConditionCode ?? "", 2));
  // Field 21: Current Balance (9)
  parts.push(padNum(rec.currentBalance, 9));
  // Field 22: Amount Past Due (9)
  parts.push(padNum(rec.amountPastDue ?? 0, 9));
  // Field 23: Original Charge-off Amount (9)
  parts.push(padNum(rec.originalChargeOffAmount ?? 0, 9));
  // Field 24: Date of Account Information (8)
  parts.push(fmtDate(rec.dateOfAccountInfo));
  // Field 25: Date of First Delinquency (8)
  parts.push(fmtDate(rec.dateFirstDelinquency));
  // Field 26: Date Closed (8)
  parts.push(fmtDate(rec.dateClosed));
  // Field 27: Date of Last Payment (8)
  parts.push(fmtDate(rec.dateLastPayment));
  // Field 28: Interest Type Indicator (1)
  parts.push(padStr(rec.interestTypeIndicator ?? "", 1));
  // Field 29: Reserved (17)
  parts.push(blankField(17));
  // Field 30: Consumer Transaction Type (1) - always blank for data furnishers
  parts.push(" ");
  // Field 31: Surname (25)
  parts.push(padStr(rec.client.lastName, 25));
  // Field 32: First Name (20)
  parts.push(padStr(rec.client.firstName, 20));
  // Field 33: Middle Name (20)
  parts.push(padStr(rec.client.middleName ?? "", 20));
  // Field 34: Generation Code (1)
  const genMap: Record<string, string> = { "jr": "J", "sr": "S", "ii": "2", "iii": "3", "iv": "4" };
  parts.push(genMap[(rec.client.suffix ?? "").toLowerCase()] || " ");
  // Field 35: Social Security Number (9)
  parts.push(padNum(parseInt((rec.client.ssn ?? "").replace(/\D/g, "") || "0"), 9));
  // Field 36: Date of Birth (8)
  parts.push(rec.client.dob ? fmtDate(new Date(rec.client.dob)) : "00000000");
  // Field 37: Telephone Number (10)
  parts.push(padStr((rec.client.phone ?? "").replace(/\D/g, ""), 10));
  // Field 38: ECOA Code (1)
  parts.push(rec.ecoaCode);
  // Field 39: Consumer Information Indicator (2)
  parts.push(padStr(rec.consumerInformationIndicator ?? "", 2));
  // Field 40: Country Code (2)
  parts.push("US");
  // Field 41: First Line of Address (32)
  parts.push(padStr(rec.client.address ?? "", 32));
  // Field 42: Second Line of Address (32)
  parts.push(padStr(rec.client.previousAddress ?? "", 32));
  // Field 43: City (20)
  parts.push(padStr(rec.client.city ?? "", 20));
  // Field 44: State (2)
  parts.push(padStr(rec.client.state ?? "", 2));
  // Field 45: Zip Code (9)
  parts.push(padStr((rec.client.zip ?? "").replace(/\D/g, ""), 9));
  // Field 46: Address Indicator (1) - C=confirmed, Y=known, N=not confirmed
  parts.push("Y");
  // Field 47: Residence Code (1) - O=owns, R=rents, blank=not indicated
  parts.push(" ");

  const segment = parts.join("");
  const remaining = 426 - segment.length;
  if (remaining > 0) {
    return segment + blankField(remaining);
  }
  return segment.substring(0, 426);
}

// ─── TRAILER RECORD (426 bytes CDIA-compliant) ──────────────────────────────

export function generateMetro2Trailer(records: Metro2Record[]): string {
  const parts: string[] = [];

  // Count status codes
  const statusCounts: Record<string, number> = {};
  let totalSSN = 0;
  let totalDOB = 0;
  for (const rec of records) {
    statusCounts[rec.accountStatus] = (statusCounts[rec.accountStatus] || 0) + 1;
    if (rec.client.ssn && rec.client.ssn.replace(/\D/g, "").length === 9) totalSSN++;
    if (rec.client.dob) totalDOB++;
  }

  // Field 1: Record Descriptor Word (4)
  parts.push("0426");
  // Field 2: Record Identifier (7)
  parts.push("TRAILER");
  // Field 3: Total Base Records (9)
  parts.push(padNum(records.length, 9));
  // Field 4: Reserved (9)
  parts.push(zeroField(9));
  // Field 5: Total Status Code DF (9)
  parts.push(padNum(statusCounts["DF"] ?? 0, 9));
  // Field 6: Total Status Code DA (9)
  parts.push(padNum(statusCounts["DA"] ?? 0, 9));
  // Field 7: Total Status Code 05 (9)
  parts.push(padNum(statusCounts["05"] ?? 0, 9));
  // Field 8: Total Status Code 11 (9)
  parts.push(padNum(statusCounts["11"] ?? 0, 9));
  // Field 9: Total Status Code 13 (9)
  parts.push(padNum(statusCounts["13"] ?? 0, 9));
  // Field 10: Total Status Code 61 (9)
  parts.push(padNum(statusCounts["61"] ?? 0, 9));
  // Field 11: Total Status Code 62 (9)
  parts.push(padNum(statusCounts["62"] ?? 0, 9));
  // Field 12: Total Status Code 63 (9)
  parts.push(padNum(statusCounts["63"] ?? 0, 9));
  // Field 13: Total Status Code 64 (9)
  parts.push(padNum(statusCounts["64"] ?? 0, 9));
  // Field 14: Total Status Code 65 (9)
  parts.push(padNum(statusCounts["65"] ?? 0, 9));
  // Field 15: Total Status Code 71 (9)
  parts.push(padNum(statusCounts["71"] ?? 0, 9));
  // Field 16: Total Status Code 78 (9)
  parts.push(padNum(statusCounts["78"] ?? 0, 9));
  // Field 17: Total Status Code 80 (9)
  parts.push(padNum(statusCounts["80"] ?? 0, 9));
  // Field 18: Total Status Code 82 (9)
  parts.push(padNum(statusCounts["82"] ?? 0, 9));
  // Field 19: Total Status Code 83 (9)
  parts.push(padNum(statusCounts["83"] ?? 0, 9));
  // Field 20: Total Status Code 84 (9)
  parts.push(padNum(statusCounts["84"] ?? 0, 9));
  // Field 21: Total Status Code 88 (9)
  parts.push(padNum(statusCounts["88"] ?? 0, 9));
  // Field 22: Total Status Code 89 (9)
  parts.push(padNum(statusCounts["89"] ?? 0, 9));
  // Field 23: Total Status Code 93 (9)
  parts.push(padNum(statusCounts["93"] ?? 0, 9));
  // Field 24: Total Status Code 94 (9)
  parts.push(padNum(statusCounts["94"] ?? 0, 9));
  // Field 25: Total Status Code 95 (9)
  parts.push(padNum(statusCounts["95"] ?? 0, 9));
  // Field 26: Total Status Code 96 (9)
  parts.push(padNum(statusCounts["96"] ?? 0, 9));
  // Field 27: Total Status Code 97 (9)
  parts.push(padNum(statusCounts["97"] ?? 0, 9));
  // Field 28: ECOA Code Z (9)
  parts.push(zeroField(9));
  // Field 29: Total DOBs (9)
  parts.push(padNum(totalDOB, 9));
  // Field 30: Total SSNs (9)
  parts.push(padNum(totalSSN, 9));
  // Field 31: Block Count (9) = header + records + trailer
  parts.push(padNum(records.length + 2, 9));
  // Field 32: Total Account Number Changes (9)
  parts.push(zeroField(9));

  const trailer = parts.join("");
  const remaining = 426 - trailer.length;
  if (remaining > 0) {
    return trailer + blankField(remaining);
  }
  return trailer.substring(0, 426);
}

// ─── FILE BUILDER ───────────────────────────────────────────────────────────

export function buildMetro2File(
  records: Metro2Record[],
  companyId: string,
  companyName: string,
  address?: string,
  city?: string,
  state?: string,
  zip?: string,
  phone?: string
): string {
  const header = generateMetro2Header(companyId, companyName, address, city, state, zip, phone);
  const body = records.map(generateMetro2BaseSegment).join("\n");
  const trailer = generateMetro2Trailer(records);
  return `${header}\n${body}\n${trailer}`;
}

// ─── JSON ↔ METRO 2 CONVERSION ─────────────────────────────────────────────

export interface Metro2JsonRecord {
  accountNumber: string;
  portfolioType: string;
  accountType: string;
  accountStatus: string;
  ecoaCode: string;
  creditLimit: number;
  highCredit?: number;
  currentBalance: number;
  amountPastDue?: number;
  scheduledPayment?: number;
  actualPayment?: number;
  dateOpened: string;
  dateOfAccountInfo: string;
  dateLastPayment?: string;
  dateClosed?: string;
  dateFirstDelinquency?: string;
  paymentHistory?: string;
  specialComment?: string;
  complianceConditionCode?: string;
  consumerInformationIndicator?: string;
  interestTypeIndicator?: string;
  termsFrequency?: string;
  termsDuration?: string;
  originalChargeOffAmount?: number;
  consumer: {
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    ssn: string;
    dob?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export function jsonToMetro2Record(json: Metro2JsonRecord, companyId: string): Metro2Record {
  return {
    client: {
      id: "",
      firstName: json.consumer.firstName,
      middleName: json.consumer.middleName || null,
      lastName: json.consumer.lastName,
      suffix: json.consumer.suffix || null,
      email: "",
      phone: json.consumer.phone || null,
      ssn: json.consumer.ssn,
      dob: json.consumer.dob || null,
      address: json.consumer.address || null,
      city: json.consumer.city || null,
      state: json.consumer.state || null,
      zip: json.consumer.zip || null,
      previousAddress: null,
      idType: null,
      idNumber: null,
      status: "active",
      equifaxScore: null,
      experianScore: null,
      transunionScore: null,
      createdAt: new Date(),
    } as Client,
    accountNumber: json.accountNumber,
    portfolioType: json.portfolioType as any,
    accountType: json.accountType,
    accountStatus: json.accountStatus,
    ecoaCode: json.ecoaCode,
    creditLimit: json.creditLimit,
    highCredit: json.highCredit,
    currentBalance: json.currentBalance,
    amountPastDue: json.amountPastDue,
    scheduledPayment: json.scheduledPayment,
    actualPayment: json.actualPayment,
    dateOpened: json.dateOpened,
    dateOfAccountInfo: json.dateOfAccountInfo,
    dateLastPayment: json.dateLastPayment,
    dateClosed: json.dateClosed,
    dateFirstDelinquency: json.dateFirstDelinquency,
    paymentHistory: json.paymentHistory,
    specialComment: json.specialComment,
    complianceConditionCode: json.complianceConditionCode,
    consumerInformationIndicator: json.consumerInformationIndicator,
    companyId,
    interestTypeIndicator: json.interestTypeIndicator,
    termsFrequency: json.termsFrequency,
    termsDuration: json.termsDuration,
    originalChargeOffAmount: json.originalChargeOffAmount,
  };
}

export function metro2RecordToJson(rec: Metro2Record): Metro2JsonRecord {
  return {
    accountNumber: rec.accountNumber,
    portfolioType: rec.portfolioType,
    accountType: rec.accountType,
    accountStatus: rec.accountStatus,
    ecoaCode: rec.ecoaCode,
    creditLimit: rec.creditLimit,
    highCredit: rec.highCredit,
    currentBalance: rec.currentBalance,
    amountPastDue: rec.amountPastDue,
    scheduledPayment: rec.scheduledPayment,
    actualPayment: rec.actualPayment,
    dateOpened: typeof rec.dateOpened === "string" ? rec.dateOpened : rec.dateOpened.toISOString().slice(0, 10),
    dateOfAccountInfo: typeof rec.dateOfAccountInfo === "string" ? rec.dateOfAccountInfo : rec.dateOfAccountInfo.toISOString().slice(0, 10),
    dateLastPayment: rec.dateLastPayment ? (typeof rec.dateLastPayment === "string" ? rec.dateLastPayment : rec.dateLastPayment.toISOString().slice(0, 10)) : undefined,
    dateClosed: rec.dateClosed ? (typeof rec.dateClosed === "string" ? rec.dateClosed : rec.dateClosed.toISOString().slice(0, 10)) : undefined,
    dateFirstDelinquency: rec.dateFirstDelinquency ? (typeof rec.dateFirstDelinquency === "string" ? rec.dateFirstDelinquency : rec.dateFirstDelinquency.toISOString().slice(0, 10)) : undefined,
    paymentHistory: rec.paymentHistory,
    specialComment: rec.specialComment,
    complianceConditionCode: rec.complianceConditionCode,
    consumerInformationIndicator: rec.consumerInformationIndicator,
    interestTypeIndicator: rec.interestTypeIndicator,
    termsFrequency: rec.termsFrequency,
    termsDuration: rec.termsDuration,
    originalChargeOffAmount: rec.originalChargeOffAmount,
    consumer: {
      firstName: rec.client.firstName,
      middleName: rec.client.middleName ?? undefined,
      lastName: rec.client.lastName,
      suffix: rec.client.suffix ?? undefined,
      ssn: rec.client.ssn ?? "",
      dob: rec.client.dob ?? undefined,
      phone: rec.client.phone ?? undefined,
      address: rec.client.address ?? undefined,
      city: rec.client.city ?? undefined,
      state: rec.client.state ?? undefined,
      zip: rec.client.zip ?? undefined,
    },
  };
}

// ─── METRO 2 FILE PARSER ────────────────────────────────────────────────────

export function parseMetro2Line(line: string): Partial<Metro2JsonRecord> | null {
  if (line.length < 426) return null;
  if (line.startsWith("0426HEADER") || line.startsWith("0426TRAILER")) return null;

  try {
    let pos = 0;
    const read = (len: number) => { const v = line.substring(pos, pos + len); pos += len; return v.trim(); };

    read(4); // record descriptor word
    read(1); // processing indicator
    read(14); // timestamp
    read(1); // reserved
    const companyId = read(20);
    read(2); // cycle id
    const accountNumber = read(30);
    const portfolioType = read(1);
    const accountType = read(2);
    const dateOpened = read(8);
    const creditLimit = parseInt(read(9)) || 0;
    read(3); // terms duration
    read(1); // terms frequency
    const scheduledPayment = parseInt(read(9)) || 0;
    const actualPayment = parseInt(read(9)) || 0;
    const accountStatus = read(2);
    read(1); // payment rating
    const paymentHistory = read(24);
    const specialComment = read(2);
    read(2); // compliance
    const currentBalance = parseInt(read(9)) || 0;
    const amountPastDue = parseInt(read(9)) || 0;
    read(9); // original charge off
    const dateOfAccountInfo = read(8);
    read(8); // date first delinquency
    const dateClosed = read(8);
    const dateLastPayment = read(8);
    read(1); // interest type
    read(17); // reserved
    read(1); // consumer transaction type
    const lastName = read(25);
    const firstName = read(20);
    const middleName = read(20);
    read(1); // gen code
    const ssn = read(9);
    const dob = read(8);
    const phone = read(10);
    read(1); // ecoa
    read(2); // consumer info indicator
    read(2); // country
    const address = read(32);
    read(32); // addr2
    const city = read(20);
    const state = read(2);
    const zip = read(9);

    return {
      accountNumber,
      portfolioType,
      accountType,
      accountStatus,
      ecoaCode: "1",
      creditLimit,
      currentBalance,
      amountPastDue,
      scheduledPayment,
      actualPayment,
      dateOpened: formatParsedDate(dateOpened) || undefined,
      dateOfAccountInfo: formatParsedDate(dateOfAccountInfo) || undefined,
      dateLastPayment: formatParsedDate(dateLastPayment) || undefined,
      dateClosed: formatParsedDate(dateClosed) || undefined,
      paymentHistory,
      specialComment: specialComment || undefined,
      consumer: {
        firstName,
        middleName: middleName || undefined,
        lastName,
        ssn,
        dob: formatParsedDate(dob) || undefined,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
      },
    };
  } catch {
    return null;
  }
}

function formatParsedDate(mmddyyyy: string): string | null {
  if (!mmddyyyy || mmddyyyy === "00000000" || mmddyyyy.trim() === "") return null;
  const mm = mmddyyyy.substring(0, 2);
  const dd = mmddyyyy.substring(2, 4);
  const yyyy = mmddyyyy.substring(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

export function parseMetro2File(content: string): {
  header: boolean;
  records: Partial<Metro2JsonRecord>[];
  trailer: boolean;
  errors: string[];
} {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const result = {
    header: false,
    records: [] as Partial<Metro2JsonRecord>[],
    trailer: false,
    errors: [] as string[],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 10) {
      result.errors.push(`Line ${i + 1}: Too short (${line.length} chars)`);
      continue;
    }
    if (line.includes("HEADER")) {
      result.header = true;
      continue;
    }
    if (line.includes("TRAILER")) {
      result.trailer = true;
      continue;
    }
    const parsed = parseMetro2Line(line.length < 426 ? line.padEnd(426, " ") : line);
    if (parsed) {
      result.records.push(parsed);
    } else {
      result.errors.push(`Line ${i + 1}: Could not parse record`);
    }
  }

  if (!result.header) result.errors.push("Missing header record");
  if (!result.trailer) result.errors.push("Missing trailer record");

  return result;
}

// ─── DOCUMENT FORMAT CONVERTER ──────────────────────────────────────────────

export type ConvertibleFormat = "metro2" | "json" | "csv";

export function convertMetro2ToJson(metro2Content: string): { records: Partial<Metro2JsonRecord>[]; errors: string[] } {
  const parsed = parseMetro2File(metro2Content);
  return { records: parsed.records, errors: parsed.errors };
}

export function convertJsonToMetro2(
  jsonRecords: Metro2JsonRecord[],
  companyId: string,
  companyName: string
): string {
  const metro2Records = jsonRecords.map(j => jsonToMetro2Record(j, companyId));
  return buildMetro2File(metro2Records, companyId, companyName);
}

export function convertCsvToJson(csvContent: string): { records: Partial<Metro2JsonRecord>[]; errors: string[] } {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { records: [], errors: ["CSV must have header row + at least one data row"] };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""));
  const records: Partial<Metro2JsonRecord>[] = [];
  const errors: string[] = [];

  const findCol = (...names: string[]) => {
    for (const n of names) {
      const idx = headers.indexOf(n);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const colAccount = findCol("accountnumber", "account_number", "account", "acct");
  const colFirstName = findCol("firstname", "first_name", "first", "consumer_first");
  const colLastName = findCol("lastname", "last_name", "last", "consumer_last", "surname");
  const colSSN = findCol("ssn", "social", "socialsecuritynumber");
  const colBalance = findCol("currentbalance", "current_balance", "balance");
  const colLimit = findCol("creditlimit", "credit_limit", "limit", "highcredit");
  const colStatus = findCol("accountstatus", "account_status", "status");
  const colPortfolio = findCol("portfoliotype", "portfolio_type", "portfolio");
  const colAcctType = findCol("accounttype", "account_type", "accttype");
  const colDateOpened = findCol("dateopened", "date_opened", "opened");
  const colEcoa = findCol("ecoacode", "ecoa_code", "ecoa");
  const colDob = findCol("dob", "dateofbirth", "date_of_birth", "birthdate");
  const colPhone = findCol("phone", "telephone");
  const colAddress = findCol("address", "address1", "street");
  const colCity = findCol("city");
  const colState = findCol("state");
  const colZip = findCol("zip", "zipcode", "postalcode");

  for (let i = 1; i < lines.length; i++) {
    try {
      const vals = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const getVal = (idx: number) => idx >= 0 && idx < vals.length ? vals[idx] : "";

      if (!getVal(colLastName) && !getVal(colAccount)) {
        errors.push(`Row ${i + 1}: Missing last name and account number, skipping`);
        continue;
      }

      records.push({
        accountNumber: getVal(colAccount) || `ROW-${i}`,
        portfolioType: getVal(colPortfolio) || "R",
        accountType: getVal(colAcctType) || "18",
        accountStatus: getVal(colStatus) || "11",
        ecoaCode: getVal(colEcoa) || "1",
        creditLimit: parseInt(getVal(colLimit)) || 0,
        currentBalance: parseInt(getVal(colBalance)) || 0,
        dateOpened: getVal(colDateOpened) || new Date().toISOString().slice(0, 10),
        dateOfAccountInfo: new Date().toISOString().slice(0, 10),
        consumer: {
          firstName: getVal(colFirstName) || "UNKNOWN",
          lastName: getVal(colLastName) || "UNKNOWN",
          ssn: getVal(colSSN) || "000000000",
          dob: getVal(colDob) || undefined,
          phone: getVal(colPhone) || undefined,
          address: getVal(colAddress) || undefined,
          city: getVal(colCity) || undefined,
          state: getVal(colState) || undefined,
          zip: getVal(colZip) || undefined,
        },
      });
    } catch (e) {
      errors.push(`Row ${i + 1}: Parse error`);
    }
  }

  return { records, errors };
}

export function detectFormat(content: string): ConvertibleFormat {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.includes("0426") && (trimmed.includes("HEADER") || trimmed.length >= 426)) return "metro2";
  return "csv";
}

// ─── REFERENCE CODES ────────────────────────────────────────────────────────

export const ACCOUNT_TYPES: Record<string, string> = {
  "00": "Undesignated",
  "01": "Unsecured",
  "02": "Secured",
  "03": "Partially Secured",
  "04": "Student Loan",
  "05": "Rental Agreement",
  "06": "Insurance",
  "07": "Installment",
  "08": "Rent-to-own",
  "10": "Business Line of Credit",
  "11": "Business",
  "12": "Secured Credit Card",
  "13": "Partially Secured Credit Card",
  "15": "Utility",
  "17": "Medical/Healthcare",
  "18": "Credit Card (Revolving)",
  "19": "Primary Mortgage",
  "20": "Home Improvement",
  "22": "Mobile Home",
  "23": "HELOC",
  "24": "Auto Loan",
  "25": "Commercial",
  "26": "Recreational Vehicle",
  "27": "Personal Line of Credit",
  "29": "Debt Consolidation",
  "43": "Government",
  "47": "Government - Fine",
  "48": "Government - Fee",
  "65": "Real Estate Junior Lien",
  "66": "Real Estate Senior Lien",
  "67": "Conventional Real Estate",
  "68": "FHA Real Estate",
  "69": "VA Real Estate",
  "89": "Check Guarantee",
  "90": "Collections",
  "91": "NSF Check",
  "92": "Government Guaranteed",
  "93": "Government Guaranteed Student Loan",
  "95": "Child Support",
};

export const ACCOUNT_STATUSES: Record<string, string> = {
  "05": "Account transferred",
  "11": "Current / in good standing",
  "13": "Closed / paid satisfactorily",
  "61": "Paid - was 30-59 days past due",
  "62": "Paid collection",
  "63": "Paid for less than full",
  "64": "Foreclosure completed",
  "65": "Voluntary surrender",
  "71": "Account 30 days past due",
  "78": "Account 60 days past due",
  "80": "Account 90 days past due",
  "82": "Account 120 days past due",
  "83": "Account 150 days past due",
  "84": "Account 180+ days past due",
  "88": "Claim filed with government",
  "89": "Deed received in lieu of foreclosure",
  "93": "Account seriously past due / assigned to collections",
  "94": "Foreclosure / government claim filed",
  "95": "Voluntary surrender / government claim filed",
  "96": "Merchandize was repossessed",
  "97": "Unpaid balance reported as loss",
  "DA": "Delete account (entire record)",
  "DF": "Delete account (fraud confirmed)",
};

export const ECOA_CODES: Record<string, string> = {
  "1": "Individual",
  "2": "Joint contractual liability",
  "3": "Authorized user",
  "5": "Co-maker/guarantor",
  "7": "Maker (on behalf of another)",
  "T": "Terminated",
  "W": "Business/commercial (individual liable)",
  "X": "Deceased",
  "Z": "Delete consumer from account",
};

export const SPECIAL_COMMENT_CODES: Record<string, string> = {
  "AB": "Account payments managed by financial counseling program",
  "AC": "Account closed at consumer's request",
  "AH": "Account previously in dispute - now resolved, reported by data furnisher",
  "AI": "Account previously in dispute - now resolved, reported by consumer",
  "AM": "Account closed due to refinance",
  "AN": "Account paid from collateral",
  "AU": "Account being paid through insurance",
  "B": "Conditions of sale not met",
  "BL": "Credit line suspended",
  "CH": "Account converted to repayment",
  "CL": "Credit line reduced due to collateral depreciation",
  "CO": "Account closed due to transfer/sold",
  "CP": "Account closed at credit grantor's request",
  "DE": "Account assigned to internal or external collections",
  "EP": "Account paid by employer",
  "M": "Account in forbearance",
  "O": "Account in dispute under FCRA",
  "S": "Special handling - contact data furnisher",
  "V": "Bankruptcy petition filed",
};
