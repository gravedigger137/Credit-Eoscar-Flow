import {
  Metro2BaseRecord,
  STATUSES_REQUIRING_PAYMENT_RATING,
  PAYMENT_RATINGS,
  COMPLIANCE_CONDITION_CODES
} from '../types/metro2-crrg2026';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export function validateMetro2BaseRecord(record: Metro2BaseRecord): ValidationError[] {
  const errors: ValidationError[] = [];

  const isValidDate = (d?: string): boolean => {
    if (!d || d === '00000000') return false;
    if (!/^\d{8}$/.test(d)) return false;
    const month = parseInt(d.substring(0, 2), 10);
    const day = parseInt(d.substring(2, 4), 10);
    const year = parseInt(d.substring(4, 8), 10);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2099;
  };

  // Rule 1: Account Status & Payment Rating Coupling (Fields 17A & 17B)
  if (STATUSES_REQUIRING_PAYMENT_RATING.has(record.accountStatus)) {
    if (!record.paymentRating || record.paymentRating.trim() === '') {
      errors.push({
        field: 'paymentRating',
        code: 'ERR_PAYMENT_RATING_REQUIRED',
        message: `Account Status '${record.accountStatus}' requires Payment Rating (Field 17B).`
      });
    } else if (!PAYMENT_RATINGS.includes(record.paymentRating as any)) {
      errors.push({
        field: 'paymentRating',
        code: 'ERR_INVALID_PAYMENT_RATING',
        message: `Value '${record.paymentRating}' is not a valid Payment Rating.`
      });
    }
  } else {
    if (record.paymentRating && record.paymentRating.trim() !== '') {
      errors.push({
        field: 'paymentRating',
        code: 'ERR_PAYMENT_RATING_MUST_BE_BLANK',
        message: `Account Status '${record.accountStatus}' requires Payment Rating to be blank.`
      });
    }
  }

  // Rule 2: FCRA Compliance / Date of First Delinquency (Field 25)
  const derogatoryStatuses = new Set([
    '61', '62', '63', '64', '65',
    '71', '78', '80', '82', '83', '84', '88', '89',
    '93', '94', '95', '96', '97'
  ]);

  if (derogatoryStatuses.has(record.accountStatus)) {
    if (!record.dateOfFirstDelinquency || record.dateOfFirstDelinquency === '00000000' || !isValidDate(record.dateOfFirstDelinquency)) {
      errors.push({
        field: 'dateOfFirstDelinquency',
        code: 'ERR_DOFD_REQUIRED',
        message: `Derogatory Account Status '${record.accountStatus}' mandates a valid Date of First Delinquency.`
      });
    }
  } else if (record.accountStatus === '11') {
    if (record.dateOfFirstDelinquency && record.dateOfFirstDelinquency !== '00000000' && record.dateOfFirstDelinquency.trim() !== '') {
      errors.push({
        field: 'dateOfFirstDelinquency',
        code: 'ERR_DOFD_MUST_BE_ZERO_FILLED',
        message: `Current Account Status (11) requires Date of First Delinquency to be zero-filled.`
      });
    }
  }

  // Rule 3: Compliance Condition Code (Field 20)
  if (record.complianceConditionCode && record.complianceConditionCode.trim() !== '') {
    if (!COMPLIANCE_CONDITION_CODES.includes(record.complianceConditionCode as any)) {
      errors.push({
        field: 'complianceConditionCode',
        code: 'ERR_INVALID_CCC',
        message: `Compliance Condition Code '${record.complianceConditionCode}' is unrecognized.`
      });
    }
  }

  // Rule 4: Paid Derogatory Zero-Balance Checks
  const paidDerogatoryCodes = new Set(['61', '62', '63', '64']);
  if (paidDerogatoryCodes.has(record.accountStatus)) {
    if (record.currentBalance !== 0 || record.amountPastDue !== 0) {
      errors.push({
        field: 'currentBalance',
        code: 'ERR_PAID_STATUS_BALANCE_MUST_BE_ZERO',
        message: `Account Status '${record.accountStatus}' requires Current Balance and Amount Past Due to equal zero.`
      });
    }
  }

  // Rule 5: Charge-Off Specifics (Status 97)
  if (record.accountStatus === '97') {
    if (record.originalChargeOffAmount === undefined || record.originalChargeOffAmount <= 0) {
      errors.push({
        field: 'originalChargeOffAmount',
        code: 'ERR_ORIGINAL_CHARGE_OFF_REQUIRED',
        message: `Account Status 97 requires Original Charge-off Amount to be greater than zero.`
      });
    }
  }

  // Rule 6: Payment History Profile Length (Field 18)
  if (!record.paymentHistoryProfile || record.paymentHistoryProfile.length !== 24) {
    errors.push({
      field: 'paymentHistoryProfile',
      code: 'ERR_PHP_LENGTH_MISMATCH',
      message: `Payment History Profile must be exactly 24 characters.`
    });
  }

  return errors;
}
