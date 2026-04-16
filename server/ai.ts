import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Dispute Letter Generator ────────────────────────────────────────────────
export async function generateDisputeLetter(params: {
  clientName: string;
  bureau: string;
  accountName: string;
  accountNumber?: string;
  reason: string;
  type: string;
}) {
  const { clientName, bureau, accountName, accountNumber, reason, type } = params;
  const prompt = `You are a professional credit repair attorney drafting FCRA-compliant dispute letters.

Write a formal dispute letter for:
- Client: ${clientName}
- Bureau: ${bureau}
- Account/Item: ${accountName}${accountNumber ? ` (#${accountNumber})` : ""}
- Item Type: ${type}
- Dispute Reason: ${reason}

The letter must:
1. Cite specific FCRA sections (§ 611, § 623, etc.)
2. Demand investigation within 30 days
3. Request method of verification
4. Be professional, assertive, and legally sound
5. Include placeholders for [DATE], [CLIENT ADDRESS], [CLIENT SSN LAST 4], [ENCLOSURES]
6. End with a signature block

Write only the letter body, no commentary.`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1200,
    temperature: 0.4,
  });
  return resp.choices[0].message.content ?? "";
}

// ── Credit Report Analysis ──────────────────────────────────────────────────
export async function analyzeClientCredit(params: {
  clientName: string;
  scores: { equifax?: number; experian?: number; transunion?: number };
  negativeItems: string[];
  goal?: string;
}) {
  const { clientName, scores, negativeItems, goal } = params;
  const scoreStr = Object.entries(scores).map(([b, s]) => `${b}: ${s}`).join(", ");
  const itemsStr = negativeItems.length > 0 ? negativeItems.join("\n- ") : "None provided";

  const prompt = `You are a senior credit repair strategist. Analyze this client's profile and provide a structured action plan.

Client: ${clientName}
Credit Scores: ${scoreStr || "Not provided"}
Goal: ${goal || "Maximize score improvement"}

Negative Items:
- ${itemsStr}

Provide:
1. **Score Assessment** — Current standing and gaps
2. **Priority Disputes** — Which items to challenge first and why (highest impact)
3. **Tradeline Strategy** — AU tradeline recommendations (credit limit, age, utilization targets)
4. **Credit Builder Plan** — Any revolving/installment accounts to add
5. **Timeline Estimate** — Realistic months to goal
6. **Risk Flags** — Any compliance or legal concerns

Be specific, data-driven, and actionable. Format with clear headers.`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1400,
    temperature: 0.3,
  });
  return resp.choices[0].message.content ?? "";
}

// ── AI Chat Assistant ───────────────────────────────────────────────────────
export async function chatWithAI(messages: { role: "user" | "assistant"; content: string }[]) {
  const systemPrompt = `You are an expert AI assistant for CreditRepair Pro, a professional credit repair business platform. You have deep knowledge of:
- FCRA, FDCPA, CROA compliance and consumer rights
- e-OSCAR dispute process and Metro 2 data furnishing
- Credit scoring models (FICO 8, FICO 9, VantageScore 3/4)
- Authorized user tradeline strategies and ECOA codes
- Bureau investigation timelines and procedures
- Equifax, Experian, TransUnion, Innovis, ChexSystems, LexisNexis
- Credit builder products (Self, Kikoff, Credit Strong, Grow Credit)
- Stripe billing, business compliance, and cybersecurity for credit businesses

Answer questions concisely and professionally. When relevant, cite specific laws or bureau codes. Help staff optimize their credit repair workflows.`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 800,
    temperature: 0.5,
  });
  return resp.choices[0].message.content ?? "";
}

// ── Bot ChatGPT Integration ──────────────────────────────────────────────────
export async function botChatWithAI(params: {
  botName: string;
  systemPrompt: string;
  taskDescription: string;
  contextData?: Record<string, any>;
}): Promise<{ analysis: string; recommendations: string[]; actionsTaken: string[]; status: string }> {
  const { botName, systemPrompt, taskDescription, contextData } = params;

  const contextStr = contextData ? `\n\nContext Data:\n${JSON.stringify(contextData, null, 2)}` : "";

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${taskDescription}${contextStr}\n\nRespond with a JSON object containing:\n- "analysis": a brief summary of your findings\n- "recommendations": an array of recommended actions\n- "actionsTaken": an array of actions you performed\n- "status": "success" or "needs_attention"` },
    ],
    max_tokens: 1200,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = resp.choices[0].message.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      analysis: parsed.analysis || `${botName} completed analysis`,
      recommendations: parsed.recommendations || [],
      actionsTaken: parsed.actionsTaken || [],
      status: parsed.status || "success",
    };
  } catch {
    return {
      analysis: `${botName} completed its run`,
      recommendations: [],
      actionsTaken: [`${botName} executed successfully`],
      status: "success",
    };
  }
}

// ── Consumer Credit Specialist AI — Post-Upload Analysis & Auto-Dispute ──

export interface NegativeItemAnalysis {
  creditorName: string;
  accountNumber: string;
  accountType: string;
  negativeReason: string;
  balance: number | null;
  bureau: string;
  disputeType: "collection" | "inquiry" | "late_payment" | "charge_off" | "identity_theft" | "outdated" | "general";
  disputeReason: string;
  legalBasis: string;
  removalProbability: "high" | "medium" | "low";
  priorityScore: number;
  strategy: string;
}

export interface CreditSpecialistReport {
  clientName: string;
  overallAssessment: string;
  scoreAnalysis: string;
  negativeItemAnalysis: NegativeItemAnalysis[];
  recommendedDisputeOrder: string[];
  estimatedTimeline: string;
  additionalRecommendations: string[];
}

export async function analyzeReportForDisputes(params: {
  clientName: string;
  reportData: {
    scores: { equifax: number | null; experian: number | null; transunion: number | null };
    negativeItems: {
      creditorName: string;
      accountNumber: string;
      accountType: string;
      negativeReason: string | null;
      currentBalance: number | null;
      bureau: string;
      paymentStatus: string;
      dateOpened: string | null;
      lastReported: string | null;
      remarks: string[];
    }[];
    inquiries: { creditor: string; date: string; bureau: string }[];
    publicRecords: { type: string; date: string; amount: number | null; status: string }[];
    summary: {
      totalAccounts: number;
      negativeAccounts: number;
      utilizationPercent: number;
      inquiryCount: number;
    };
  };
}): Promise<CreditSpecialistReport> {
  const { clientName, reportData } = params;
  const negItemsList = reportData.negativeItems
    .map((item, i) => `${i + 1}. ${item.creditorName} (${item.accountType}) — ${item.negativeReason || "Derogatory"} — Balance: $${item.currentBalance || 0} — Bureau: ${item.bureau} — Status: ${item.paymentStatus}${item.dateOpened ? ` — Opened: ${item.dateOpened}` : ""}${item.lastReported ? ` — Last reported: ${item.lastReported}` : ""}${item.remarks.length ? ` — Remarks: ${item.remarks.join("; ")}` : ""}`)
    .join("\n");

  const inquiriesList = reportData.inquiries
    .map((inq, i) => `${i + 1}. ${inq.creditor} — ${inq.date} (${inq.bureau})`)
    .join("\n");

  const publicRecordsList = reportData.publicRecords
    .map((pr, i) => `${i + 1}. ${pr.type} — ${pr.date} — $${pr.amount || 0} — ${pr.status}`)
    .join("\n");

  const scoreStr = Object.entries(reportData.scores)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ") || "Not available";

  const prompt = `You are a Consumer Credit Specialist AI with expertise in FCRA, FDCPA, CROA, UCC, and e-OSCAR dispute systems. You are analyzing a credit report to identify every disputable negative item and build an aggressive legal removal strategy.

CLIENT: ${clientName}
CREDIT SCORES: ${scoreStr}
UTILIZATION: ${reportData.summary.utilizationPercent}%
TOTAL ACCOUNTS: ${reportData.summary.totalAccounts} (${reportData.summary.negativeAccounts} negative)
INQUIRIES: ${reportData.summary.inquiryCount}

NEGATIVE ITEMS:
${negItemsList || "None found"}

HARD INQUIRIES:
${inquiriesList || "None found"}

PUBLIC RECORDS:
${publicRecordsList || "None found"}

For EACH negative item, provide a JSON analysis. Respond ONLY with valid JSON matching this exact schema:
{
  "overallAssessment": "2-3 sentence summary of credit standing and primary issues",
  "scoreAnalysis": "Analysis of current scores and estimated improvement potential",
  "items": [
    {
      "creditorName": "exact creditor name",
      "accountNumber": "account number if available",
      "accountType": "Collection|Credit Card|Auto Loan|etc",
      "negativeReason": "what makes this item negative",
      "balance": null or number,
      "bureau": "equifax|experian|transunion|unknown",
      "disputeType": "collection|inquiry|late_payment|charge_off|identity_theft|outdated|general",
      "disputeReason": "specific legal reason for dispute — cite the exact FCRA/FDCPA section",
      "legalBasis": "FCRA § 611(a)(1)|FDCPA § 809(b)|FCRA § 605|etc",
      "removalProbability": "high|medium|low",
      "priorityScore": 1-10 (10 = highest impact on score),
      "strategy": "specific dispute strategy for this item"
    }
  ],
  "recommendedDisputeOrder": ["creditor names in recommended filing order"],
  "estimatedTimeline": "realistic timeline estimate",
  "additionalRecommendations": ["list of credit-building actions to take alongside disputes"]
}

RULES:
- Collections under $500 with no original contract → HIGH removal probability
- Inquiries older than 1 year → MEDIUM removal probability
- Late payments with any reporting inconsistency → HIGH removal probability
- Charge-offs that were sold to collectors → dispute both original AND collector
- Always cite the strongest applicable legal section
- Prioritize items with highest score impact first
- For e-OSCAR filing, include the ACDV reason code approach in strategy`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 3000,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = resp.choices[0].message.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      clientName,
      overallAssessment: "Unable to parse AI analysis. Please try again.",
      scoreAnalysis: "",
      negativeItemAnalysis: [],
      recommendedDisputeOrder: [],
      estimatedTimeline: "",
      additionalRecommendations: [],
    };
  }

  return {
    clientName,
    overallAssessment: parsed.overallAssessment || "",
    scoreAnalysis: parsed.scoreAnalysis || "",
    negativeItemAnalysis: (parsed.items || []).map((item: any) => ({
      creditorName: item.creditorName || "",
      accountNumber: item.accountNumber || "",
      accountType: item.accountType || "Other",
      negativeReason: item.negativeReason || "",
      balance: item.balance ?? null,
      bureau: item.bureau || "unknown",
      disputeType: item.disputeType || "general",
      disputeReason: item.disputeReason || "",
      legalBasis: item.legalBasis || "",
      removalProbability: item.removalProbability || "medium",
      priorityScore: item.priorityScore || 5,
      strategy: item.strategy || "",
    })),
    recommendedDisputeOrder: parsed.recommendedDisputeOrder || [],
    estimatedTimeline: parsed.estimatedTimeline || "",
    additionalRecommendations: parsed.additionalRecommendations || [],
  };
}

// ── Metro 2 Validation ──────────────────────────────────────────────────────
export async function validateMetro2Record(recordData: string) {
  const prompt = `You are a CDIA Metro 2 format compliance expert. Review this Metro 2 record and identify any issues.

Record:
${recordData}

Check for:
1. Correct field lengths and positions (426-character base segment)
2. Valid ECOA codes (1=Individual, 2=Joint, 3=AU)
3. Valid account status codes
4. Valid portfolio type codes (R/I/O/M)
5. Date format compliance (MMDDYYYY)
6. Payment history string validity
7. Any missing required fields

Respond with: VALID or ISSUES FOUND, then a bulleted list of findings.`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
    temperature: 0.1,
  });
  return resp.choices[0].message.content ?? "";
}
