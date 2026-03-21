/**
 * Metro 2 Format File Generator
 * CDIA Credit Reporting Resource Guide compliant
 * Base Segment: 426 characters fixed-width ASCII
 */

import type { Client } from "@shared/schema";

// Pad or truncate a string to exactly `len` characters (left-justified, space-padded)
function padStr(val: string | null | undefined, len: number): string {
  const s = (val ?? "").toUpperCase().replace(/[^A-Z0-9 \-\.\/]/g, "").substring(0, len);
  return s.padEnd(len, " ");
}

// Pad a numeric value to exactly `len` characters (right-justified, zero-padded)
function padNum(val: number | null | undefined, len: number): string {
  const n = Math.abs(Math.round(val ?? 0)).toString().substring(0, len);
  return n.padStart(len, "0");
}

// Format date as MMDDYYYY
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "        ";
  const dt = typeof d === "string" ? new Date(d) : d;
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${mm}${dd}${yyyy}`;
}

export interface Metro2Record {
  client: Client;
  accountNumber: string;
  portfolioType: "I" | "M" | "O" | "R"; // Installment/Mortgage/Open/Revolving
  accountType: string; // 2-char code, e.g. "18" = credit card, "26" = auto loan
  accountStatus: string; // "11"=current, "13"=paid, "62"=collection, "71"=30dpd, "78"=60dpd, "80"=90dpd
  ecoaCode: string; // "1"=individual, "3"=AU, "2"=joint
  creditLimit: number;
  currentBalance: number;
  amountPastDue?: number;
  scheduledPayment?: number;
  actualPayment?: number;
  dateOpened: Date | string;
  dateOfAccountInfo: Date | string;
  dateLastPayment?: Date | string;
  dateClosed?: Date | string;
  paymentHistory?: string; // 24-char string, 1=current, 2=30dpd, etc.
  specialComment?: string; // 2-char
  companyId: string; // your data furnisher ID
  reportType?: "M" | "C" | "D"; // Monthly/Corrected/Delete
}

export function generateMetro2BaseSegment(rec: Metro2Record): string {
  const today = new Date();

  // --- Field 1: Record Descriptor Word (5) ---
  const field1 = "0426 "; // 426-char record + space

  // --- Field 2: Processing Indicator (1) ---
  const field2 = " ";

  // --- Field 3: Time Stamp (14) MMDDYYYYHHMM00 ---
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const yyyy = String(today.getFullYear());
  const hh = String(today.getHours()).padStart(2, "0");
  const mi = String(today.getMinutes()).padStart(2, "0");
  const field3 = `${mm}${dd}${yyyy}${hh}${mi}00`;

  // --- Field 4: Reserved (1) ---
  const field4 = " ";

  // --- Field 5: Report Type Indicator (1) ---
  const field5 = rec.reportType ?? "M";

  // --- Field 6: ID Number / Furnisher ID (20) ---
  const field6 = padStr(rec.companyId, 20);

  // --- Field 7: Cycle Identifier (2) ---
  const field7 = "01";

  // --- Field 8: Consumer Account Number (30) ---
  const field8 = padStr(rec.accountNumber, 30);

  // --- Field 9: Portfolio Type (1) ---
  const field9 = rec.portfolioType;

  // --- Field 10: Account Type (2) ---
  const field10 = padStr(rec.accountType || "18", 2);

  // --- Field 11: Date Opened (8) ---
  const field11 = fmtDate(rec.dateOpened);

  // --- Field 12: Credit Limit / High Credit (9) ---
  const field12 = padNum(rec.creditLimit, 9);

  // --- Field 13: Terms Duration (3) ---
  const field13 = "   ";

  // --- Field 14: Terms Frequency (1) ---
  const field14 = rec.portfolioType === "R" ? "M" : "M";

  // --- Field 15: Scheduled Monthly Payment (9) ---
  const field15 = padNum(rec.scheduledPayment ?? 0, 9);

  // --- Field 16: Actual Payment Amount (9) ---
  const field16 = padNum(rec.actualPayment ?? 0, 9);

  // --- Field 17: Account Status (2) ---
  const field17 = padStr(rec.accountStatus, 2);

  // --- Field 18: Payment Rating (1) ---
  const field18 = rec.accountStatus === "11" ? "0" : "1";

  // --- Field 19: Payment History Profile (24) ---
  const ph = (rec.paymentHistory ?? "111111111111111111111111").substring(0, 24).padEnd(24, "1");
  const field19 = ph;

  // --- Field 20: Special Comment (2) ---
  const field20 = padStr(rec.specialComment ?? "  ", 2);

  // --- Field 21: Compliance Condition Code (2) ---
  const field21 = "  ";

  // --- Field 22: Current Balance (9) ---
  const field22 = padNum(rec.currentBalance, 9);

  // --- Field 23: Amount Past Due (9) ---
  const field23 = padNum(rec.amountPastDue ?? 0, 9);

  // --- Field 24: Original Charge-off Amount (9) ---
  const field24 = "000000000";

  // --- Field 25: Date of Account Information (8) ---
  const field25 = fmtDate(rec.dateOfAccountInfo);

  // --- Field 26: FCRA Compliance Date (8) ---
  const field26 = "        ";

  // --- Field 27: Date Closed (8) ---
  const field27 = fmtDate(rec.dateClosed);

  // --- Field 28: Date of Last Payment (8) ---
  const field28 = fmtDate(rec.dateLastPayment);

  // --- Field 29: Interest Type Indicator (1) ---
  const field29 = " ";

  // --- Field 30: Reserved (16) ---
  const field30 = "                ";

  // --- J1: Consumer Information (Surname 25, First 20, Middle 20, Gen 1) ---
  const surname = padStr(rec.client.lastName, 25);
  const firstName = padStr(rec.client.firstName, 20);
  const middleName = padStr("", 20);
  const genCode = " ";

  // --- J2: SSN (9) ---
  const ssn = padNum(parseInt((rec.client.ssn ?? "").replace(/\D/g, "") || "0"), 9);

  // --- J3: DOB (8) ---
  const dob = rec.client.dob ? fmtDate(new Date(rec.client.dob)) : "        ";

  // --- J4: Phone (10) ---
  const phone = padNum(parseInt((rec.client.phone ?? "").replace(/\D/g, "") || "0"), 10);

  // --- J5: ECOA Code (1) ---
  const ecoaCode = rec.ecoaCode; // "3" = authorized user

  // --- J6: Consumer Information Indicator (2) ---
  const consumerInfo = "  ";

  // --- J7: Country Code (2) ---
  const countryCode = "US";

  // --- J8: Address Line 1 (32) ---
  const addr1 = padStr(rec.client.address ?? "", 32);

  // --- J9: Address Line 2 (32) ---
  const addr2 = padStr("", 32);

  // --- J10: City (20) ---
  const city = padStr(rec.client.city ?? "", 20);

  // --- J11: State (2) ---
  const state = padStr(rec.client.state ?? "", 2);

  // --- J12: Postal Code (9) ---
  const zip = padStr(rec.client.zip ?? "", 9);

  // --- J13: Address Indicator (1) ---
  const addrIndicator = " ";

  // --- J14: Residence Code (1) ---
  const residenceCode = " ";

  const segment =
    field1 + field2 + field3 + field4 + field5 + field6 + field7 + field8 +
    field9 + field10 + field11 + field12 + field13 + field14 + field15 + field16 +
    field17 + field18 + field19 + field20 + field21 + field22 + field23 + field24 +
    field25 + field26 + field27 + field28 + field29 + field30 +
    surname + firstName + middleName + genCode +
    ssn + dob + phone + ecoaCode + consumerInfo + countryCode +
    addr1 + addr2 + city + state + zip + addrIndicator + residenceCode;

  return segment;
}

export function generateMetro2Header(companyId: string, companyName: string, reportDate: Date = new Date()): string {
  const mm = String(reportDate.getMonth() + 1).padStart(2, "0");
  const dd = String(reportDate.getDate()).padStart(2, "0");
  const yyyy = String(reportDate.getFullYear());
  const hh = String(reportDate.getHours()).padStart(2, "0");
  const mi = String(reportDate.getMinutes()).padStart(2, "0");

  return [
    "HEADER RECORD",
    `VERSION     : 426`,
    `CYCLE       : 01`,
    `INNOVIS DATE: ${mm}${dd}${yyyy}`,
    `TIME        : ${hh}${mi}`,
    `REPORTER ID : ${padStr(companyId, 20)}`,
    `COMPANY NAME: ${padStr(companyName, 40)}`,
    `PROGRAM     : CREDITREPAIR PRO METRO2 ENGINE`,
    "",
  ].join("\n");
}

export function generateMetro2Trailer(recordCount: number): string {
  return [
    "",
    "TRAILER RECORD",
    `BLOCK COUNT : ${String(recordCount).padStart(10, "0")}`,
    `END OF FILE`,
  ].join("\n");
}

export function buildMetro2File(
  records: Metro2Record[],
  companyId: string,
  companyName: string
): string {
  const header = generateMetro2Header(companyId, companyName);
  const body = records.map(generateMetro2BaseSegment).join("\n");
  const trailer = generateMetro2Trailer(records.length);
  return `${header}${body}\n${trailer}`;
}

// Account Type Codes reference (CDIA Metro 2)
export const ACCOUNT_TYPES = {
  "01": "Unsecured",
  "04": "Student loan",
  "05": "Rental agreement",
  "06": "Insurance",
  "07": "Installment (not auto/student)",
  "08": "Rent-to-own",
  "12": "Secured",
  "13": "Partial secured",
  "15": "Utility",
  "17": "Medical/healthcare",
  "18": "Credit card (revolving)",
  "19": "Primary mortgage",
  "23": "HELOC",
  "24": "Auto",
  "25": "Commercial",
  "26": "Recreational vehicle",
  "27": "Personal line of credit",
};

// Account Status Codes
export const ACCOUNT_STATUSES = {
  "11": "Current / in good standing",
  "13": "Closed / paid satisfactorily",
  "62": "Paid collection",
  "63": "Collection paid for less than full",
  "64": "Foreclosure completed",
  "71": "Account 30 days past due",
  "78": "Account 60 days past due",
  "80": "Account 90 days past due",
  "82": "Account 120 days past due",
  "83": "Account 150 days past due",
  "84": "Account 180 days past due",
  "88": "Claim filed",
  "89": "Deed received",
  "93": "Account seriously past due",
  "97": "Unpaid balance reported as loss",
};
