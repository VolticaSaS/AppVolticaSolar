export type LegalType = "natural_person" | "legal_entity";
export type TaxIdType = "cedula" | "nit";

export function normalizeIdentification(value: string): string {
  return value.replace(/[.\s-]/g, "");
}

export function isValidColombianIdentification(value: string, legalType: LegalType): boolean {
  const digits = normalizeIdentification(value);
  if (!/^\d+$/.test(digits)) return false;

  if (legalType === "natural_person") return digits.length >= 6 && digits.length <= 10;
  if (digits.length !== 10) return false;

  const weights = [71, 67, 59, 53, 47, 43, 41, 37, 29];
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
  const remainder = sum % 11;
  const checkDigit = remainder > 1 ? 11 - remainder : remainder;
  return Number(digits[9]) === checkDigit;
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return /^[+\d][\d\s().-]*$/.test(trimmed) && digits.length >= 7 && digits.length <= 15;
}
