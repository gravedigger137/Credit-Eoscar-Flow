export const ACCOUNT_STATUS_CODES = [
  '11', '13', '61', '62', '63', '64', '65',
  '71', '78', '80', '82', '83', '84', '88',
  '89', '93', '94', '95', '96', '97', 'DA', 'DF'
] as const;

export type AccountStatus = typeof ACCOUNT_STATUS_CODES[number];

export const STATUSES_REQUIRING_PAYMENT_RATING: ReadonlySet<string> = new Set([
  '13', '65', '88', '89', '94', '95'
]);

export const PAYMENT_RATINGS = ['0', '1', '2', '3', '4', '5', '6', 'G', 'L', ' '] as const;
export type PaymentRating = typeof PAYMENT_RATINGS[number];

export const COMPLIANCE_CONDITION_CODES = [
  'XA', 'XB', 'XC', 'XD', 'XE', 'XF', 'XG', 'XH', 'XJ', 'XR', '  '
] as const;

export type ComplianceConditionCode = typeof COMPLIANCE_CONDITION_CODES[number];

export const PORTFOLIO_TYPES = ['C', 'I', 'M', 'O', 'R'] as const;
export type PortfolioType = typeof PORTFOLIO_TYPES[number];

export interface Metro2BaseRecord {
  consumerAccountNumber: string;
  portfolioType: PortfolioType;
  accountType: string;
  dateOpened: string;
  scheduledMonthlyPaymentAmount: number;
  accountStatus: AccountStatus;
  paymentRating?: PaymentRating;
  paymentHistoryProfile: string;
  specialComment?: string;
  complianceConditionCode?: string;
  currentBalance: number;
  amountPastDue: number;
  originalChargeOffAmount?: number;
  dateOfAccountInformation: string;
  dateOfFirstDelinquency?: string;
  dateClosed?: string;
}
