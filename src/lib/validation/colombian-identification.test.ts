import { describe, expect, it } from "vitest";
import { isValidColombianIdentification, isValidPhone, normalizeIdentification } from "./colombian-identification";

describe("validación de identificación colombiana", () => {
  it("acepta cédulas de 6 a 10 dígitos con separadores comunes", () => {
    expect(isValidColombianIdentification("1.234.567", "natural_person")).toBe(true);
    expect(isValidColombianIdentification("12345", "natural_person")).toBe(false);
    expect(isValidColombianIdentification("12A4567", "natural_person")).toBe(false);
  });

  it("valida el dígito de verificación del NIT", () => {
    expect(isValidColombianIdentification("900.123.456-3", "legal_entity")).toBe(true);
    expect(isValidColombianIdentification("900123456-7", "legal_entity")).toBe(false);
    expect(isValidColombianIdentification("900123456", "legal_entity")).toBe(false);
  });

  it("normaliza el número y valida teléfonos con indicativo opcional", () => {
    expect(normalizeIdentification("900.123.456-3")).toBe("9001234563");
    expect(isValidPhone("+57 300 123 4567")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });
});
