/**
 * Credit Report Parser
 * Extracts account data, negative items, and scores from credit report PDFs/text
 * Supports Equifax, Experian, and TransUnion report formats
 */

import fs from "fs";

let pdf: any = null;
async function loadPdfParse() {
  if (pdf) return pdf;
  try {
    pdf = (await import("pdf-parse")).default;
  } catch {
    pdf = null;
  }
  return pdf;
}

export interface ParsedAccount {
  creditorName: string;
  accountNumber: string;
  accountType: string;
  bureau: "equifax" | "experian" | "transunion" | "unknown";
  dateOpened: string | null;
  dateClosed: string | null;
  creditLimit: number | null;
  highBalance: number | null;
  currentBalance: number | null;
  pastDueAmount: number | null;
  monthlyPayment: number | null;
  paymentStatus: string;
  accountStatus: string;
  isNegative: boolean;
  negativeReason: string | null;
  lastReported: string | null;
  remarks: string[];
}

export interface ParsedCreditReport {
  bureau: "equifax" | "experian" | "transunion" | "unknown";
  reportDate: string | null;
  scores: {
    equifax: number | null;
    experian: number | null;
    transunion: number | null;
  };
  personalInfo: {
    name: string | null;
    address: string | null;
    ssn: string | null;
    dob: string | null;
  };
  accounts: ParsedAccount[];
  negativeItems: ParsedAccount[];
  inquiries: { creditor: string; date: string; bureau: string }[];
  publicRecords: { type: string; date: string; amount: number | null; status: string }[];
  summary: {
    totalAccounts: number;
    openAccounts: number;
    closedAccounts: number;
    negativeAccounts: number;
    totalBalance: number;
    totalCreditLimit: number;
    utilizationPercent: number;
    inquiryCount: number;
    publicRecordCount: number;
  };
}

const NEGATIVE_KEYWORDS = [
  "charge-off", "charged off", "chargeoff",
  "collection", "collections", "placed for collection",
  "late payment", "past due", "delinquent", "delinquency",
  "30 days", "60 days", "90 days", "120 days", "150 days", "180 days",
  "repossession", "repossessed", "repo",
  "foreclosure", "foreclosed",
  "bankruptcy", "chapter 7", "chapter 13", "chapter 11",
  "judgment", "tax lien", "lien",
  "settled", "settled for less",
  "written off", "write-off", "profit and loss",
  "seriously past due", "severely delinquent",
  "account in dispute", "disputed",
  "closed by grantor", "closed by credit grantor",
  "voluntary surrender",
  "included in bankruptcy",
];

const ACCOUNT_TYPE_PATTERNS: Record<string, RegExp> = {
  "Credit Card": /credit\s*card|revolving|visa|mastercard|amex|american\s*express|discover|capital\s*one|chase/i,
  "Auto Loan": /auto\s*loan|vehicle|car\s*loan|motor|automobile/i,
  "Mortgage": /mortgage|home\s*loan|real\s*estate|heloc|home\s*equity/i,
  "Student Loan": /student\s*loan|education|dept\s*of\s*ed|navient|sallie\s*mae|nelnet|great\s*lakes/i,
  "Personal Loan": /personal\s*loan|unsecured\s*loan|installment/i,
  "Medical": /medical|hospital|clinic|physician|healthcare|doctor/i,
  "Collection": /collection|collect|debt\s*buyer|portfolio\s*recovery|midland|cavalry|lvnv/i,
  "Utility": /utility|electric|gas|water|phone|telecom|cable|internet/i,
  "Retail": /retail|store\s*card|department\s*store|sears|jcpenney|macy|target|walmart/i,
};

function detectBureau(text: string): "equifax" | "experian" | "transunion" | "unknown" {
  const lower = text.toLowerCase();
  if (lower.includes("equifax") || lower.includes("efx") || lower.includes("beacon")) return "equifax";
  if (lower.includes("experian") || lower.includes("expn") || lower.includes("fico® score 8")) return "experian";
  if (lower.includes("transunion") || lower.includes("trans union") || lower.includes("vantage")) return "transunion";
  return "unknown";
}

function extractScores(text: string): { equifax: number | null; experian: number | null; transunion: number | null } {
  const scores = { equifax: null as number | null, experian: null as number | null, transunion: null as number | null };

  const scorePatterns = [
    /equifax[:\s]*(\d{3})/i,
    /efx[:\s]*(\d{3})/i,
    /beacon[:\s]*(\d{3})/i,
  ];
  for (const p of scorePatterns) {
    const m = text.match(p);
    if (m && parseInt(m[1]) >= 300 && parseInt(m[1]) <= 850) { scores.equifax = parseInt(m[1]); break; }
  }

  const expPatterns = [
    /experian[:\s]*(\d{3})/i,
    /expn[:\s]*(\d{3})/i,
  ];
  for (const p of expPatterns) {
    const m = text.match(p);
    if (m && parseInt(m[1]) >= 300 && parseInt(m[1]) <= 850) { scores.experian = parseInt(m[1]); break; }
  }

  const tuPatterns = [
    /transunion[:\s]*(\d{3})/i,
    /trans\s*union[:\s]*(\d{3})/i,
    /vantage[:\s]*(\d{3})/i,
  ];
  for (const p of tuPatterns) {
    const m = text.match(p);
    if (m && parseInt(m[1]) >= 300 && parseInt(m[1]) <= 850) { scores.transunion = parseInt(m[1]); break; }
  }

  if (!scores.equifax && !scores.experian && !scores.transunion) {
    const genericScores = text.match(/(?:score|fico|rating)[:\s]*(\d{3})/gi);
    if (genericScores) {
      for (const match of genericScores) {
        const num = parseInt(match.match(/(\d{3})/)![1]);
        if (num >= 300 && num <= 850) {
          if (!scores.equifax) scores.equifax = num;
          else if (!scores.experian) scores.experian = num;
          else if (!scores.transunion) scores.transunion = num;
        }
      }
    }
  }

  return scores;
}

function extractDate(text: string): string | null {
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{1,2})[\/\-](\d{4})/,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

function extractMoney(text: string): number | null {
  const m = text.match(/\$?([\d,]+\.?\d*)/);
  if (m) return Math.round(parseFloat(m[1].replace(/,/g, "")));
  return null;
}

function classifyAccountType(text: string): string {
  for (const [type, pattern] of Object.entries(ACCOUNT_TYPE_PATTERNS)) {
    if (pattern.test(text)) return type;
  }
  return "Other";
}

function isNegativeItem(text: string): { isNeg: boolean; reason: string | null } {
  const lower = text.toLowerCase();
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) {
      return { isNeg: true, reason: kw.charAt(0).toUpperCase() + kw.slice(1) };
    }
  }
  return { isNeg: false, reason: null };
}

function parseAccountBlocks(text: string, bureau: "equifax" | "experian" | "transunion" | "unknown"): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];

  const blockSplitters = [
    /(?=(?:account\s*(?:name|#|number)|creditor\s*name|company\s*name)[:\s])/gi,
    /(?=\n[A-Z][A-Z\s&\.']+(?:\n|\s{2,})(?:account|acct|type|status))/g,
  ];

  let blocks: string[] = [];
  for (const splitter of blockSplitters) {
    blocks = text.split(splitter).filter(b => b.trim().length > 30);
    if (blocks.length > 1) break;
  }

  if (blocks.length <= 1) {
    const lines = text.split("\n");
    let currentBlock = "";
    for (const line of lines) {
      if (/^[A-Z][A-Z\s&\.\',]+$/.test(line.trim()) && line.trim().length > 3 && currentBlock.length > 50) {
        if (currentBlock.trim()) blocks.push(currentBlock);
        currentBlock = line + "\n";
      } else {
        currentBlock += line + "\n";
      }
    }
    if (currentBlock.trim()) blocks.push(currentBlock);
  }

  for (const block of blocks) {
    const lower = block.toLowerCase();
    if (lower.includes("inquiry") || lower.includes("personal information") || lower.includes("public record")) continue;

    const nameMatch = block.match(/(?:account\s*(?:name|#)|creditor)[:\s]*([A-Z][A-Za-z\s&\.\',]+)/i)
      || block.match(/^([A-Z][A-Z\s&\.\',]{2,40})/m);
    if (!nameMatch) continue;

    const creditorName = nameMatch[1].trim().replace(/\s+/g, " ");
    if (creditorName.length < 2 || creditorName.length > 50) continue;
    if (/^(account|status|type|balance|payment|date|credit|open|close)/i.test(creditorName)) continue;

    const acctMatch = block.match(/(?:account\s*(?:#|number|no))[:\s]*([A-Z0-9\-\*x]+)/i);
    const { isNeg, reason } = isNegativeItem(block);

    const balMatch = block.match(/(?:balance|current\s*balance|amount\s*owed)[:\s]*\$?([\d,]+\.?\d*)/i);
    const limitMatch = block.match(/(?:credit\s*limit|high\s*credit|original\s*amount)[:\s]*\$?([\d,]+\.?\d*)/i);
    const pastDueMatch = block.match(/(?:past\s*due|amount\s*past\s*due|delinquent)[:\s]*\$?([\d,]+\.?\d*)/i);
    const paymentMatch = block.match(/(?:monthly\s*payment|payment\s*amount|scheduled\s*payment)[:\s]*\$?([\d,]+\.?\d*)/i);
    const dateOpenedMatch = block.match(/(?:date\s*opened|opened|open\s*date)[:\s]*([^\n]{6,15})/i);
    const dateClosedMatch = block.match(/(?:date\s*closed|closed|close\s*date)[:\s]*([^\n]{6,15})/i);
    const statusMatch = block.match(/(?:account\s*status|status|pay\s*status|condition)[:\s]*([^\n]{3,40})/i);
    const lastReportedMatch = block.match(/(?:last\s*reported|reported|date\s*reported|date\s*updated)[:\s]*([^\n]{6,15})/i);

    const remarks: string[] = [];
    const remarkMatch = block.match(/(?:remark|comment|note)[:\s]*([^\n]+)/gi);
    if (remarkMatch) remarkMatch.forEach(r => remarks.push(r.replace(/^(?:remark|comment|note)[:\s]*/i, "").trim()));

    const payStatus = statusMatch ? statusMatch[1].trim() : (isNeg ? "Derogatory" : "Current");

    accounts.push({
      creditorName,
      accountNumber: acctMatch ? acctMatch[1] : "",
      accountType: classifyAccountType(block),
      bureau,
      dateOpened: dateOpenedMatch ? extractDate(dateOpenedMatch[1]) : null,
      dateClosed: dateClosedMatch ? extractDate(dateClosedMatch[1]) : null,
      creditLimit: limitMatch ? Math.round(parseFloat(limitMatch[1].replace(/,/g, ""))) : null,
      highBalance: null,
      currentBalance: balMatch ? Math.round(parseFloat(balMatch[1].replace(/,/g, ""))) : null,
      pastDueAmount: pastDueMatch ? Math.round(parseFloat(pastDueMatch[1].replace(/,/g, ""))) : null,
      monthlyPayment: paymentMatch ? Math.round(parseFloat(paymentMatch[1].replace(/,/g, ""))) : null,
      paymentStatus: payStatus,
      accountStatus: isNeg ? "Negative" : (lower.includes("closed") ? "Closed" : "Open"),
      isNegative: isNeg,
      negativeReason: reason,
      lastReported: lastReportedMatch ? extractDate(lastReportedMatch[1]) : null,
      remarks,
    });
  }

  return accounts;
}

function extractInquiries(text: string): { creditor: string; date: string; bureau: string }[] {
  const inquiries: { creditor: string; date: string; bureau: string }[] = [];
  const inquirySection = text.match(/(?:inquiries|credit\s*inquir)[^]*?(?=(?:public\s*record|end\s*of|account\s*information|\z))/i);
  if (!inquirySection) return inquiries;

  const section = inquirySection[0];
  const lines = section.split("\n");
  for (const line of lines) {
    const m = line.match(/([A-Z][A-Za-z\s&\.\',]+)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (m) {
      inquiries.push({
        creditor: m[1].trim(),
        date: m[2],
        bureau: detectBureau(line) || "unknown",
      });
    }
  }
  return inquiries;
}

function extractPublicRecords(text: string): { type: string; date: string; amount: number | null; status: string }[] {
  const records: { type: string; date: string; amount: number | null; status: string }[] = [];
  const prSection = text.match(/(?:public\s*record)[^]*?(?=(?:account\s*information|inquir|end\s*of|\z))/i);
  if (!prSection) return records;

  const section = prSection[0];
  const types = ["bankruptcy", "judgment", "tax lien", "civil", "foreclosure"];
  for (const type of types) {
    if (section.toLowerCase().includes(type)) {
      const dateMatch = extractDate(section);
      const amountMatch = extractMoney(section);
      records.push({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        date: dateMatch || "Unknown",
        amount: amountMatch,
        status: section.toLowerCase().includes("discharged") || section.toLowerCase().includes("released") ? "Resolved" : "Active",
      });
    }
  }
  return records;
}

export async function parseCreditReportPDF(filePath: string): Promise<ParsedCreditReport> {
  const pdfParse = await loadPdfParse();
  if (!pdfParse) throw new Error("PDF parsing is not available");
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return parseCreditReportText(data.text);
}

export function parseCreditReportText(text: string): ParsedCreditReport {
  const bureau = detectBureau(text);
  const scores = extractScores(text);
  const accounts = parseAccountBlocks(text, bureau);
  const negativeItems = accounts.filter(a => a.isNegative);
  const inquiries = extractInquiries(text);
  const publicRecords = extractPublicRecords(text);

  const nameMatch = text.match(/(?:name|consumer)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  const addressMatch = text.match(/(?:address|residence)[:\s]*([^\n]{10,60})/i);
  const reportDateMatch = text.match(/(?:report\s*date|date\s*(?:of|generated)|prepared)[:\s]*([^\n]{6,15})/i);

  const openAccounts = accounts.filter(a => a.accountStatus !== "Closed");
  const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  const totalCreditLimit = accounts.reduce((sum, a) => sum + (a.creditLimit || 0), 0);

  return {
    bureau,
    reportDate: reportDateMatch ? extractDate(reportDateMatch[1]) : null,
    scores,
    personalInfo: {
      name: nameMatch ? nameMatch[1].trim() : null,
      address: addressMatch ? addressMatch[1].trim() : null,
      ssn: null,
      dob: null,
    },
    accounts,
    negativeItems,
    inquiries,
    publicRecords,
    summary: {
      totalAccounts: accounts.length,
      openAccounts: openAccounts.length,
      closedAccounts: accounts.length - openAccounts.length,
      negativeAccounts: negativeItems.length,
      totalBalance,
      totalCreditLimit,
      utilizationPercent: totalCreditLimit > 0 ? Math.round((totalBalance / totalCreditLimit) * 100) : 0,
      inquiryCount: inquiries.length,
      publicRecordCount: publicRecords.length,
    },
  };
}
