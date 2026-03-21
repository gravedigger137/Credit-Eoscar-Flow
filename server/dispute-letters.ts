type DisputeType = "collection" | "inquiry" | "late_payment" | "charge_off" | "repossession" | "foreclosure" | "bankruptcy" | "identity_theft" | "mixed_file" | "outdated" | "general";

interface LetterParams {
  clientName: string;
  clientAddress?: string;
  clientSSNLast4?: string;
  clientDOB?: string;
  bureau: string;
  accountName: string;
  accountNumber?: string;
  reason: string;
  disputeType: DisputeType;
  itemType?: string;
}

const BUREAU_ADDRESSES: Record<string, { name: string; address: string }> = {
  equifax: { name: "Equifax Information Services LLC", address: "P.O. Box 740256\nAtlanta, GA 30374-0256" },
  experian: { name: "Experian National Consumer Assistance Center", address: "P.O. Box 4500\nAllen, TX 75013" },
  transunion: { name: "TransUnion LLC Consumer Dispute Center", address: "P.O. Box 2000\nChester, PA 19016" },
};

function today(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function letterHeader(p: LetterParams): string {
  const bureau = BUREAU_ADDRESSES[p.bureau] || { name: p.bureau, address: "" };
  return `${p.clientName}
${p.clientAddress || "[CLIENT ADDRESS]"}

Date: ${today()}

${bureau.name}
${bureau.address}

RE: FORMAL DISPUTE — REQUEST FOR INVESTIGATION AND DELETION
Account/Item: ${p.accountName}${p.accountNumber ? ` (Account #: ${p.accountNumber})` : ""}
SSN (Last 4): ${p.clientSSNLast4 || "XXXX"}
DOB: ${p.clientDOB || "[DATE OF BIRTH]"}

To Whom It May Concern:`;
}

function letterFooter(p: LetterParams): string {
  return `
REQUIRED ACTIONS:

I demand that you conduct a thorough, meaningful investigation of this disputed item within thirty (30) days as mandated by the FCRA. If you cannot verify the accuracy of this information using permissible procedures, you are required by law to promptly delete it from my credit file.

Furthermore, I request:
1. A complete description of the investigation procedures used and the business name, address, and telephone number of any furnisher contacted.
2. A copy of my updated credit report reflecting corrections made, sent to me at no charge per 15 U.S.C. § 1681i(a)(6).
3. Notification sent to every party who received my report in the last two (2) years of any deletions or modifications.

Failure to comply with these requirements constitutes willful noncompliance with the FCRA, and I reserve all rights to pursue statutory damages of $100 to $1,000 per violation under 15 U.S.C. § 1681n, actual damages under 15 U.S.C. § 1681o, plus attorney fees and court costs. Additionally, I will file formal complaints with the Consumer Financial Protection Bureau (CFPB), the Federal Trade Commission (FTC), and my state Attorney General's office.

This letter is sent pursuant to my rights under federal law. Govern yourself accordingly.

Respectfully,

_________________________________
${p.clientName}

Enclosures:
- Copy of government-issued photo ID
- Copy of Social Security card or W-2
- Proof of current address (utility bill or bank statement)
- Copy of credit report with disputed item(s) highlighted`;
}

function collectionLetter(p: LetterParams): string {
  return `${letterHeader(p)}

I am writing to formally dispute the following collection account appearing on my credit report. This letter is submitted pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq., and the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692 et seq.

DISPUTED ITEM:
Creditor/Collector: ${p.accountName}
Account Number: ${p.accountNumber || "[ACCOUNT NUMBER]"}
Reason for Dispute: ${p.reason}

LEGAL BASIS FOR REMOVAL:

1. FCRA § 611(a) — 15 U.S.C. § 1681i(a): You are required to conduct a reasonable investigation into the completeness and accuracy of any disputed information within 30 days. The investigation must be meaningful and go beyond merely parroting information from the data furnisher. Metro 2 compliance requires the furnisher to verify the debt with original documentation — not merely confirm the data already in your system.

2. FCRA § 623(a)(1) — 15 U.S.C. § 1681s-2(a)(1): The furnisher is prohibited from reporting information it knows or has reasonable cause to believe is inaccurate. If the furnisher cannot produce the original signed contract, complete and unbroken chain of title, and full accounting of the alleged debt, this item must be deleted.

3. FCRA § 623(b) — 15 U.S.C. § 1681s-2(b): Upon receiving notice of this dispute from you, the furnisher must conduct its own investigation, review all relevant information, and report the results back to you. If the furnisher fails to respond or cannot verify with competent evidence, you must delete this tradeline.

4. FDCPA § 809(b) — 15 U.S.C. § 1692g(b): The debt collector is required to cease collection activity and reporting until the debt is validated with legally sufficient documentation, including the original creditor agreement, complete payment history, and assignment/purchase documentation.

5. UCC Article 3 — Uniform Commercial Code: Under trust law and commercial code principles, the alleged creditor must demonstrate they are the holder in due course of the original instrument. A purchased debt portfolio does not automatically confer standing to report to credit bureaus. The reporting entity must establish a documented chain of custody from the original creditor.

6. CFPB Supervision Bulletin 2022-01 & CFPB Circular 2022-04: The Consumer Financial Protection Bureau has issued guidance that furnishers must maintain reasonable policies and procedures to ensure the accuracy of reported information. Systemic failures to investigate disputes or reliance on automated verification without human review constitutes an unfair, deceptive, or abusive act or practice (UDAAP) under the Consumer Financial Protection Act, 12 U.S.C. § 5531.

7. FTC Act § 5 — 15 U.S.C. § 45: Reporting unverified or inaccurate collection information constitutes an unfair or deceptive trade practice. The FTC has pursued enforcement actions against both furnishers and CRAs for failing to maintain reasonable procedures per 15 U.S.C. § 1681e(b).

8. IRS Revenue Ruling 2004-55 & 26 U.S.C. § 61: If the original creditor charged off this debt and claimed a tax deduction or issued a 1099-C Cancellation of Debt, the obligation has been discharged for tax purposes. Continued reporting of a cancelled debt as outstanding is factually inaccurate and violates the FCRA's accuracy requirements.

I have not received validation of this debt as required by law. The continued reporting of this unverified collection account causes material harm to my creditworthiness, my ability to obtain housing, employment, and insurance, and constitutes ongoing injury under both federal and state consumer protection statutes.
${letterFooter(p)}`;
}

function inquiryLetter(p: LetterParams): string {
  return `${letterHeader(p)}

I am writing to formally dispute the following inquiry appearing on my credit report. This letter is submitted pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

DISPUTED ITEM:
Inquiring Entity: ${p.accountName}
Date of Inquiry: ${p.accountNumber || "[INQUIRY DATE]"}
Reason for Dispute: ${p.reason}

LEGAL BASIS FOR REMOVAL:

1. FCRA § 604 — 15 U.S.C. § 1681b — Permissible Purpose: A consumer reporting agency may furnish a consumer report only for permissible purposes as defined by law. I did not authorize this inquiry, and the inquiring party has no permissible purpose to access my credit file. An inquiry without written consent or a legitimate credit transaction violates this section.

2. FCRA § 611(a) — 15 U.S.C. § 1681i(a): I am exercising my right to dispute the accuracy and permissible purpose of this inquiry. You must investigate whether the inquiring entity had proper authorization to access my consumer report.

3. FCRA § 616 — 15 U.S.C. § 1681n — Willful Noncompliance: Any person who willfully fails to comply with any requirement of the FCRA is liable for actual damages, statutory damages of $100 to $1,000 per violation, punitive damages, and attorney fees. Allowing unauthorized access to my consumer file constitutes willful noncompliance.

4. FCRA § 617 — 15 U.S.C. § 1681o — Negligent Noncompliance: Even if the violation was not willful, negligent failure to maintain reasonable procedures to limit access to consumer reports subjects you to liability for actual damages and attorney fees.

5. FCRA § 619 — 15 U.S.C. § 1681q — False Pretenses: Any person who knowingly and willfully obtains a consumer report under false pretenses is subject to criminal penalties including fines and imprisonment. If the inquiring entity misrepresented its permissible purpose, this constitutes a criminal violation.

6. CFPB Circular 2022-07 — Unauthorized Inquiries: The Consumer Financial Protection Bureau has clarified that CRAs have an obligation to ensure that entities accessing consumer reports have demonstrated permissible purpose. Failure to verify permissible purpose before granting access is a violation of 15 U.S.C. § 1681e(a).

7. FTC Enforcement Precedent — In the Matter of CompuCredit Corp. (FTC Docket No. C-4220): The FTC has taken action against entities that accessed consumer reports without proper authorization, establishing that unauthorized inquiries cause concrete, particularized harm to consumers.

8. ECOA — 15 U.S.C. § 1691: If this inquiry was related to a credit application that I was denied or never completed, the Equal Credit Opportunity Act requires that the inquiring entity provide an adverse action notice. I have received no such notice, further evidencing the lack of permissible purpose.

I DEMAND that you verify the permissible purpose of this inquiry with written documentation from the inquiring entity. If they cannot produce my signed authorization or demonstrate a qualifying credit transaction, this inquiry must be immediately removed from my credit file.

Each unauthorized inquiry causes a measurable reduction in my credit score and constitutes ongoing harm. I will pursue all available remedies including CFPB complaints, FTC complaints, state Attorney General complaints, and private litigation if this unauthorized inquiry is not removed within 30 days.
${letterFooter(p)}`;
}

function latePaymentLetter(p: LetterParams): string {
  return `${letterHeader(p)}

I am writing to formally dispute the late payment notation(s) appearing on my credit report under the above-referenced account. This letter is submitted pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

DISPUTED ITEM:
Creditor: ${p.accountName}
Account Number: ${p.accountNumber || "[ACCOUNT NUMBER]"}
Reason for Dispute: ${p.reason}

LEGAL BASIS FOR CORRECTION/REMOVAL:

1. FCRA § 623(a)(1)(A) — 15 U.S.C. § 1681s-2(a)(1)(A): A furnisher shall not report information to a CRA that the furnisher knows or has reasonable cause to believe is inaccurate. The late payment notation on this account is inaccurate and does not reflect the true payment history.

2. FCRA § 623(a)(2) — 15 U.S.C. § 1681s-2(a)(2): If a furnisher determines that information previously reported is not complete or accurate, it must promptly notify the CRA and provide corrections.

3. FCRA § 611(a) — 15 U.S.C. § 1681i(a): You must conduct a reasonable reinvestigation of this disputed information and record the current status of the disputed information or delete the item within 30 days.

4. Metro 2 Compliance — CDIA Guidelines: The furnisher must report payment history using the exact Payment Rating codes as defined by the CDIA. Inaccurate delinquency codes, incorrect dates of first delinquency, or misapplied payment amounts constitute Metro 2 formatting violations that render the entire tradeline unreliable.

5. CFPB Bulletin 2013-09 — Accuracy of Furnished Information: The CFPB has issued clear guidance that furnishers must establish and implement reasonable written policies and procedures regarding the accuracy and integrity of the information they furnish. Systemic failure to correct known inaccuracies constitutes a UDAAP violation.

6. Regulation V — 12 CFR § 1022.42: Requires furnishers to establish reasonable written policies and procedures for the accuracy and integrity of furnished information and to conduct reasonable investigations of consumer disputes.

7. UCC § 3-603 — Discharge of Obligation: If payment was tendered and accepted by the creditor, the obligation for that payment period is discharged. Reporting a discharged payment obligation as delinquent is factually and legally inaccurate.

I demand that the furnisher produce complete payment records, bank-verified transaction records, and the original account agreement to substantiate this late payment claim. If they cannot produce competent evidence within 30 days, this item must be corrected or deleted.
${letterFooter(p)}`;
}

function chargeOffLetter(p: LetterParams): string {
  return `${letterHeader(p)}

I am writing to formally dispute the charge-off notation appearing on my credit report under the above-referenced account. This letter is submitted pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

DISPUTED ITEM:
Creditor: ${p.accountName}
Account Number: ${p.accountNumber || "[ACCOUNT NUMBER]"}
Reason for Dispute: ${p.reason}

LEGAL BASIS FOR REMOVAL:

1. FCRA § 623(a)(1) — 15 U.S.C. § 1681s-2(a)(1): The furnisher is prohibited from reporting information it knows or has reasonable cause to believe is inaccurate. A charge-off is an internal accounting classification, not a factual statement about debt validity. If the original creditor sold or assigned this debt, continued reporting by both the original creditor and a debt buyer constitutes double-reporting in violation of the FCRA.

2. FCRA § 605(a) — 15 U.S.C. § 1681c(a) — Reporting Time Limits: Charge-offs may only be reported for seven (7) years from the date of first delinquency that led to the charge-off. If this item exceeds the statutory reporting period, it must be immediately deleted.

3. FCRA § 611(a) — 15 U.S.C. § 1681i(a): You must reinvestigate this item and verify that the date of first delinquency, balance, payment history, and account status are all accurate according to original creditor records.

4. IRS 26 U.S.C. § 166 & Revenue Ruling 2004-55: When a creditor charges off an account, it typically claims a bad debt tax deduction. This tax benefit represents a partial or full recovery of the loss. Additionally, if a 1099-C Cancellation of Debt was issued, the debt is legally cancelled and continued reporting as an outstanding obligation is inaccurate.

5. UCC § 3-302 & Trust Law — Holder in Due Course Doctrine: If this debt was sold or securitized, the reporting entity must demonstrate it is the legitimate holder in due course with an unbroken chain of title from the original creditor. Securitized debts placed into special purpose vehicles (SPVs) or real estate mortgage investment conduits (REMICs) often cannot establish proper standing to report.

6. CFPB Supervisory Highlights, Issue 29 (2022): The CFPB has cited furnishers for failing to update charge-off accounts to reflect zero balance after sale, for reporting inaccurate charge-off dates, and for continuing to furnish after receiving valid disputes without conducting proper investigation.

7. FTC Act § 5 — 15 U.S.C. § 45: Continued reporting of a charged-off account with inaccurate balance, status, or dates constitutes an unfair or deceptive trade practice.

I demand full verification including the original signed credit agreement, complete transaction history, proof of standing to report, and documentation of any tax benefits claimed on this account.
${letterFooter(p)}`;
}

function identityTheftLetter(p: LetterParams): string {
  return `${letterHeader(p)}

I am writing as a victim of identity theft to formally dispute the following fraudulent account appearing on my credit report. This letter is submitted pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq., the Fair and Accurate Credit Transactions Act (FACTA), and the Identity Theft and Assumption Deterrence Act, 18 U.S.C. § 1028.

DISPUTED ITEM:
Fraudulent Account: ${p.accountName}
Account Number: ${p.accountNumber || "[ACCOUNT NUMBER]"}
Reason for Dispute: ${p.reason}

LEGAL BASIS FOR IMMEDIATE REMOVAL:

1. FCRA § 605B — 15 U.S.C. § 1681c-2 — Block of Information Resulting from Identity Theft: You are REQUIRED to block the reporting of any information that resulted from identity theft within four (4) business days of receiving an identity theft report, a copy of my identification, and a statement identifying the fraudulent information.

2. FCRA § 611(a) — 15 U.S.C. § 1681i(a): You must conduct a reinvestigation and delete any information that cannot be verified as belonging to me.

3. FACTA § 315 — 15 U.S.C. § 1681s-2(a)(6): A furnisher may not report information to a CRA if the consumer has submitted an identity theft report and the furnisher has been notified.

4. FCRA § 615(f) — 15 U.S.C. § 1681m(f): Any entity that has received a fraud alert must take reasonable steps to verify the identity of any applicant before extending credit. If this account was opened without proper identity verification, the creditor bears liability.

5. 18 U.S.C. § 1028 — Federal Identity Theft Statute: Identity theft is a federal crime. The continued reporting of accounts resulting from criminal activity causes ongoing harm to the victim and may subject the reporting entities to civil liability.

6. CFPB Bulletin 2017-01 — Identity Theft and Consumer Reporting: The CFPB has emphasized that CRAs must promptly block fraudulent information and maintain procedures to prevent re-insertion of blocked items.

This account was opened fraudulently without my knowledge or consent. I am enclosing a copy of my FTC Identity Theft Report and police report as required by 15 U.S.C. § 1681c-2. You must block this information within four (4) business days.
${letterFooter(p)}`;
}

function outdatedLetter(p: LetterParams): string {
  return `${letterHeader(p)}

I am writing to formally dispute the following item that has exceeded the maximum reporting period allowed by federal law. This letter is submitted pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

DISPUTED ITEM:
Account/Item: ${p.accountName}
Account Number: ${p.accountNumber || "[ACCOUNT NUMBER]"}
Reason for Dispute: ${p.reason}

LEGAL BASIS FOR IMMEDIATE DELETION:

1. FCRA § 605(a) — 15 U.S.C. § 1681c(a) — Reporting Time Limitations:
   - Civil judgments: 7 years from date of entry
   - Collections/charge-offs: 7 years from date of first delinquency (DOFD)
   - Tax liens (paid): 7 years from date of payment
   - Bankruptcies: 7 years (Chapter 13) or 10 years (Chapter 7) from filing date
   - Any other adverse information: 7 years

   This item has exceeded the statutory reporting period and must be IMMEDIATELY deleted.

2. FCRA § 605(c) — 15 U.S.C. § 1681c(c) — Running of Reporting Period: The 7-year reporting period begins on the date of the commencement of the delinquency that immediately preceded the collection activity, charge-off, or similar action. This date CANNOT be reset by sale, assignment, or transfer of the debt.

3. FCRA § 623(a)(5) — 15 U.S.C. § 1681s-2(a)(5): Furnishers must report the date of first delinquency accurately and cannot re-age accounts by reporting false dates.

4. CFPB Regulation V — 12 CFR § 1022.41(f): Establishes that the date of delinquency used for the 7-year reporting period must be the month and year of the commencement of the delinquency on the account that immediately preceded the action.

5. FTC Staff Opinion Letter (Vail, 2000): The FTC has clarified that the 7-year clock cannot be restarted by making a payment, acknowledging the debt, or selling the account to a new collector.

Continued reporting of time-barred information constitutes willful noncompliance with the FCRA, subjecting you to statutory damages of $100–$1,000 per violation under 15 U.S.C. § 1681n, plus punitive damages and attorney fees.
${letterFooter(p)}`;
}

function generalDisputeLetter(p: LetterParams): string {
  return `${letterHeader(p)}

I am writing to formally dispute the accuracy of information appearing on my credit report. This letter is submitted pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

DISPUTED ITEM:
Account/Item: ${p.accountName}
Account Number: ${p.accountNumber || "[ACCOUNT NUMBER]"}
Reason for Dispute: ${p.reason}

LEGAL BASIS FOR INVESTIGATION AND REMOVAL:

1. FCRA § 611(a) — 15 U.S.C. § 1681i(a) — Duty to Reinvestigate: Upon receiving this dispute, you are required to conduct a reasonable reinvestigation to determine whether the disputed information is inaccurate. This investigation must be completed within thirty (30) days. The reinvestigation must be meaningful — not merely a rubber-stamp of furnisher data.

2. FCRA § 611(a)(5)(A) — 15 U.S.C. § 1681i(a)(5)(A) — Deletion Required: If the information is found to be inaccurate or incomplete, or if the CRA cannot verify the information within 30 days, it must be promptly deleted from my file.

3. FCRA § 623(a)(1) — 15 U.S.C. § 1681s-2(a)(1) — Furnisher Accuracy: The information furnisher is prohibited from reporting information that it knows or has reasonable cause to believe is inaccurate.

4. FCRA § 623(b) — 15 U.S.C. § 1681s-2(b) — Furnisher Investigation Duty: Upon receiving notice of this dispute, the furnisher must investigate, review all relevant information provided, and report results to the CRA. If they fail to respond, this item must be deleted.

5. FCRA § 607(b) — 15 U.S.C. § 1681e(b) — Maximum Possible Accuracy: You must follow reasonable procedures to assure maximum possible accuracy of the information in consumer reports. Cushman v. Trans Union Corp. established that "maximum possible accuracy" means CRAs must do more than simply parrot information from furnishers.

6. CFPB Supervisory Highlights & Bulletin 2022-01: The CFPB has consistently emphasized that both CRAs and furnishers must conduct meaningful investigations of consumer disputes and cannot rely solely on automated systems (e-OSCAR ACDV responses) without human review of supporting documentation.

7. FTC Act § 5 — 15 U.S.C. § 45: Maintaining inaccurate information on a consumer's credit report after being notified of the inaccuracy constitutes an unfair or deceptive trade practice.

8. UCC § 3-501 — Presentment: Under commercial law principles, the furnisher bears the burden of producing the original instrument, agreement, or contract to substantiate the reported information. Failure to produce competent evidence renders the reported information unverifiable.

I demand a thorough investigation using original source documents — not simply an automated check with the furnisher. If this information cannot be verified with competent documentary evidence within 30 days, it must be permanently deleted.
${letterFooter(p)}`;
}

export function generateFCRADisputeLetter(params: LetterParams): string {
  switch (params.disputeType) {
    case "collection":
      return collectionLetter(params);
    case "inquiry":
      return inquiryLetter(params);
    case "late_payment":
      return latePaymentLetter(params);
    case "charge_off":
      return chargeOffLetter(params);
    case "identity_theft":
      return identityTheftLetter(params);
    case "outdated":
      return outdatedLetter(params);
    default:
      return generalDisputeLetter(params);
  }
}

export const DISPUTE_REASONS: Record<string, { label: string; type: DisputeType }[]> = {
  collection: [
    { label: "Not my debt — no signed contract exists", type: "collection" },
    { label: "Debt was paid in full — still reporting", type: "collection" },
    { label: "Debt was settled — balance inaccurate", type: "collection" },
    { label: "Original creditor charged off and claimed tax deduction", type: "collection" },
    { label: "Debt collector cannot produce original agreement", type: "collection" },
    { label: "No chain of title documentation", type: "collection" },
    { label: "1099-C issued — debt cancelled", type: "collection" },
    { label: "Statute of limitations expired", type: "collection" },
    { label: "FDCPA validation never provided", type: "collection" },
    { label: "Balance incorrect — includes unauthorized fees", type: "collection" },
  ],
  inquiry: [
    { label: "I did not authorize this inquiry", type: "inquiry" },
    { label: "No permissible purpose — never applied for credit", type: "inquiry" },
    { label: "Company cannot produce signed authorization", type: "inquiry" },
    { label: "Inquiry resulted from identity theft", type: "inquiry" },
    { label: "Promotional inquiry incorrectly listed as hard pull", type: "inquiry" },
    { label: "Duplicate inquiry from same creditor", type: "inquiry" },
  ],
  late_payment: [
    { label: "Payment was made on time — bank records confirm", type: "late_payment" },
    { label: "Incorrect late payment date reported", type: "late_payment" },
    { label: "Payment applied to wrong account", type: "late_payment" },
    { label: "Account was in forbearance/deferment during reported period", type: "late_payment" },
    { label: "Natural disaster/CARES Act protections apply", type: "late_payment" },
    { label: "Creditor agreed to goodwill adjustment", type: "late_payment" },
  ],
  charge_off: [
    { label: "Account was paid before charge-off", type: "charge_off" },
    { label: "Charge-off balance is inaccurate", type: "charge_off" },
    { label: "Creditor claimed tax deduction — double recovery", type: "charge_off" },
    { label: "Account sold to collector — original creditor should show $0", type: "charge_off" },
    { label: "Date of first delinquency is incorrect", type: "charge_off" },
  ],
  identity_theft: [
    { label: "Account opened without my knowledge or consent", type: "identity_theft" },
    { label: "Unauthorized charges on existing account", type: "identity_theft" },
    { label: "Personal information used fraudulently", type: "identity_theft" },
    { label: "FTC Identity Theft Report filed", type: "identity_theft" },
  ],
  outdated: [
    { label: "Item exceeds 7-year reporting period", type: "outdated" },
    { label: "Date of first delinquency has been re-aged", type: "outdated" },
    { label: "Bankruptcy exceeds 10-year reporting period", type: "outdated" },
    { label: "Paid tax lien exceeds 7-year period", type: "outdated" },
  ],
};

export type { DisputeType, LetterParams };
