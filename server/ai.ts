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
