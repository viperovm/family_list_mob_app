import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalize any Russian phone representation to E.164 (+7XXXXXXXXXX).
 * The backend stores and validates phones in E.164 (without spaces/dashes).
 */
export function normalizePhone(input: string): string {
  const parsed = parsePhoneNumberFromString(input, 'RU');
  if (!parsed) {
    // Fallback: strip everything but digits and leading +
    const digits = input.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+${digits}`;
  }
  return parsed.format('E.164');
}

export function isValidPhone(input: string): boolean {
  const parsed = parsePhoneNumberFromString(input, 'RU');
  return !!parsed && parsed.isValid();
}

export function formatPhoneForDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164, 'RU');
  return parsed ? parsed.formatInternational() : e164;
}

/**
 * Apply the visual mask for RU numbers while typing:
 * +7 (___) ___-__-__
 *
 * The closing parenthesis is added only once the 4th digit exists. This keeps
 * backspace from re-inserting a trailing ")" (a "sticky" literal) when the user
 * deletes digits inside the area code.
 */
export function maskPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let d = digits;
  if (d.startsWith('7') || d.startsWith('8')) {
    d = d.slice(1);
  }
  if (d.length > 10) d = d.slice(0, 10);

  if (d.length === 0) return '+7 ';

  let out = `+7 (${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
