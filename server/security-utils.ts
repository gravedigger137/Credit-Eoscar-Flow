const REDACTION_PATTERNS = [
  /\b\d{3}-?\d{2}-?\d{4}\b/g,
  /\b(?:\d[ -]*?){13,19}\b/g,
  /\bsk_(?:live|test)_[A-Za-z0-9_]+\b/g,
  /\bwhsec_[A-Za-z0-9_]+\b/g,
  /\b[A-Za-z0-9._%+-]+:[A-Za-z0-9._%+-]+@/g,
  /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+\b/gi,
];

export function redactSensitiveText(value: string) {
  return REDACTION_PATTERNS.reduce((current, pattern) => current.replace(pattern, "[REDACTED]"), value);
}

export function maskLast4(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `***-**-${digits.slice(-4)}`;
}

export function safeErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : String(err || "Unknown error");
  return redactSensitiveText(message);
}
