/**
 * Bureau API Clients
 * Wrappers for Equifax, Experian, and TransUnion APIs
 * Requires provider credentials to be configured in Settings
 */

import { storage } from "./storage";

export interface BureauCredentials {
  apiKey: string;
  apiSecret?: string;
  clientId?: string;
  memberId?: string;
  environment: "sandbox" | "production";
}

export interface BureauReportRequest {
  firstName: string;
  lastName: string;
  ssn: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface BureauReportResponse {
  bureau: "equifax" | "experian" | "transunion";
  score: number | null;
  reportId: string;
  rawData: string;
  success: boolean;
  error: string | null;
}

// ─── EQUIFAX CLIENT ─────────────────────────────────────────────────────────

export class EquifaxClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(credentials: BureauCredentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret || "";
    this.baseUrl = credentials.environment === "production"
      ? "https://api.equifax.com"
      : "https://api.sandbox.equifax.com";
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString("base64")}`,
        },
        body: "grant_type=client_credentials&scope=https://api.equifax.com/business/consumer-credit/v2",
      });
      if (!response.ok) return false;
      const data = await response.json();
      this.accessToken = data.access_token;
      return true;
    } catch {
      return false;
    }
  }

  async pullReport(request: BureauReportRequest): Promise<BureauReportResponse> {
    if (!this.accessToken) {
      const auth = await this.authenticate();
      if (!auth) return { bureau: "equifax", score: null, reportId: "", rawData: "", success: false, error: "Authentication failed. Check Equifax API credentials." };
    }

    try {
      const response = await fetch(`${this.baseUrl}/business/consumer-credit/v2/reports/credit-report`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consumers: {
            name: [{ firstName: request.firstName, lastName: request.lastName }],
            socialNum: [{ socialNum: request.ssn.replace(/\D/g, "") }],
            dateOfBirth: request.dob,
            addresses: [{
              addressLine1: request.address,
              city: request.city,
              state: request.state,
              zip: request.zip,
            }],
          },
          customerConfiguration: {
            equifaxUSConsumerCreditReport: {
              outputFormat: "JSON",
              riskModelCodeOnly: false,
              memberNumber: "",
              models: [{ identifier: "05540", ECOAInquiryType: "Individual" }],
            },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { bureau: "equifax", score: null, reportId: "", rawData: errText, success: false, error: `Equifax API error: ${response.status}` };
      }

      const data = await response.json();
      const rawData = JSON.stringify(data);
      const score = data?.consumers?.equifaxUSConsumerCreditReport?.[0]?.models?.[0]?.score ?? null;
      const reportId = data?.consumers?.equifaxUSConsumerCreditReport?.[0]?.identifier ?? `EFX-${Date.now()}`;

      return { bureau: "equifax", score: score ? parseInt(score) : null, reportId, rawData, success: true, error: null };
    } catch (e: any) {
      return { bureau: "equifax", score: null, reportId: "", rawData: "", success: false, error: e.message };
    }
  }
}

// ─── EXPERIAN CLIENT ────────────────────────────────────────────────────────

export class ExperianClient {
  private apiKey: string;
  private clientId: string;
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(credentials: BureauCredentials) {
    this.apiKey = credentials.apiKey;
    this.clientId = credentials.clientId || "";
    this.baseUrl = credentials.environment === "production"
      ? "https://us-api.experian.com"
      : "https://sandbox-us-api.experian.com";
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth2/v1/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "client_id": this.clientId,
          "client_secret": this.apiKey,
        },
        body: JSON.stringify({ grant_type: "client_credentials" }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      this.accessToken = data.access_token;
      return true;
    } catch {
      return false;
    }
  }

  async pullReport(request: BureauReportRequest): Promise<BureauReportResponse> {
    if (!this.accessToken) {
      const auth = await this.authenticate();
      if (!auth) return { bureau: "experian", score: null, reportId: "", rawData: "", success: false, error: "Authentication failed. Check Experian API credentials." };
    }

    try {
      const response = await fetch(`${this.baseUrl}/consumerservices/credit-profile/v2/credit-report`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          "clientReferenceId": `CRP-${Date.now()}`,
        },
        body: JSON.stringify({
          consumerPii: {
            primaryApplicant: {
              name: { firstName: request.firstName, lastName: request.lastName },
              ssn: { ssn: request.ssn.replace(/\D/g, "") },
              dob: { dob: request.dob },
              currentAddress: {
                line1: request.address,
                city: request.city,
                state: request.state,
                zipCode: request.zip,
              },
            },
          },
          requestor: { subscriberCode: "" },
          addOns: { riskModels: { modelIndicator: ["V4"], scorePercentile: "Y" } },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { bureau: "experian", score: null, reportId: "", rawData: errText, success: false, error: `Experian API error: ${response.status}` };
      }

      const data = await response.json();
      const rawData = JSON.stringify(data);
      const score = data?.creditProfile?.riskModel?.[0]?.score ?? null;
      const reportId = data?.creditProfile?.reportId ?? `EXP-${Date.now()}`;

      return { bureau: "experian", score: score ? parseInt(score) : null, reportId, rawData, success: true, error: null };
    } catch (e: any) {
      return { bureau: "experian", score: null, reportId: "", rawData: "", success: false, error: e.message };
    }
  }
}

// ─── TRANSUNION CLIENT ──────────────────────────────────────────────────────

export class TransUnionClient {
  private apiKey: string;
  private memberId: string;
  private baseUrl: string;

  constructor(credentials: BureauCredentials) {
    this.apiKey = credentials.apiKey;
    this.memberId = credentials.memberId || "";
    this.baseUrl = credentials.environment === "production"
      ? "https://netaccess.transunion.com"
      : "https://netaccess-test.transunion.com";
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  async pullReport(request: BureauReportRequest): Promise<BureauReportResponse> {
    try {
      const esc = this.escapeXml.bind(this);
      const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<creditBureau xmlns="http://www.transunion.com/namespace">
  <document>TUReportRequest</document>
  <version>2.33</version>
  <transactionControl>
    <userRefNumber>CRP-${Date.now()}</userRefNumber>
    <subscriber>
      <industryCode>F</industryCode>
      <memberCode>${esc(this.memberId)}</memberCode>
      <inquirySubscriberPrefixCode></inquirySubscriberPrefixCode>
    </subscriber>
  </transactionControl>
  <product>
    <code>07000</code>
    <subject>
      <number>1</number>
      <subjectRecord>
        <indicative>
          <name>
            <person>
              <first>${esc(request.firstName)}</first>
              <last>${esc(request.lastName)}</last>
            </person>
          </name>
          <address>
            <street><unparsed>${esc(request.address)}</unparsed></street>
            <location><city>${esc(request.city)}</city><state>${esc(request.state)}</state><zipCode>${esc(request.zip)}</zipCode></location>
          </address>
          <socialSecurity><number>${request.ssn.replace(/\D/g, "")}</number></socialSecurity>
          <dateOfBirth>${esc(request.dob)}</dateOfBirth>
        </indicative>
      </subjectRecord>
    </subject>
  </product>
</creditBureau>`;

      const response = await fetch(`${this.baseUrl}/IPDataService`, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          "Authorization": `Basic ${Buffer.from(`${this.memberId}:${this.apiKey}`).toString("base64")}`,
        },
        body: xmlBody,
      });

      if (!response.ok) {
        const errText = await response.text();
        return { bureau: "transunion", score: null, reportId: "", rawData: errText, success: false, error: `TransUnion API error: ${response.status}` };
      }

      const rawData = await response.text();
      const scoreMatch = rawData.match(/<score>(\d{3})<\/score>/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
      const reportId = `TU-${Date.now()}`;

      return { bureau: "transunion", score, reportId, rawData, success: true, error: null };
    } catch (e: any) {
      return { bureau: "transunion", score: null, reportId: "", rawData: "", success: false, error: e.message };
    }
  }
}

// ─── FACTORY ────────────────────────────────────────────────────────────────

export async function getBureauClient(bureau: "equifax" | "experian" | "transunion"): Promise<EquifaxClient | ExperianClient | TransUnionClient | null> {
  const apiKey = await storage.getApiConfig(`${bureau}_api_key`);
  if (!apiKey) return null;

  const apiSecret = await storage.getApiConfig(`${bureau}_api_secret`);
  const clientId = await storage.getApiConfig(`${bureau}_client_id`);
  const memberId = await storage.getApiConfig(`${bureau}_member_id`);
  const env = (await storage.getApiConfig(`${bureau}_environment`)) as "sandbox" | "production" || "sandbox";

  const creds: BureauCredentials = { apiKey, apiSecret: apiSecret || undefined, clientId: clientId || undefined, memberId: memberId || undefined, environment: env };

  switch (bureau) {
    case "equifax": return new EquifaxClient(creds);
    case "experian": return new ExperianClient(creds);
    case "transunion": return new TransUnionClient(creds);
  }
}

export async function pullAllBureauReports(request: BureauReportRequest): Promise<BureauReportResponse[]> {
  const results: BureauReportResponse[] = [];

  for (const bureau of ["equifax", "experian", "transunion"] as const) {
    const client = await getBureauClient(bureau);
    if (client) {
      const report = await client.pullReport(request);
      results.push(report);
    } else {
      results.push({
        bureau,
        score: null,
        reportId: "",
        rawData: "",
        success: false,
        error: `${bureau.charAt(0).toUpperCase() + bureau.slice(1)} API not configured. Add credentials in Settings.`,
      });
    }
  }

  return results;
}
