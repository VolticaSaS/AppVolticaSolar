import { describe, expect, it } from "vitest";
import { isStrongPassword } from "./password-policy";

describe("password policy", () => {
  it("accepts 12+ characters with letters, numbers and a symbol", () => {
    expect(isStrongPassword("Sol#2026Volti")).toBe(true);
  });

  it("rejects passwords missing a required character class", () => {
    expect(isStrongPassword("Solar2026Voltica")).toBe(false);
    expect(isStrongPassword("Solar!Voltica")).toBe(false);
    expect(isStrongPassword("1234567890!#")).toBe(false);
    expect(isStrongPassword("Ab1!short")).toBe(false);
  });
});
