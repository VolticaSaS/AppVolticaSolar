import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./origin";

function makeRequest(url: string, headers: Record<string, string>): Request {
  return new Request(url, { method: "POST", headers });
}

describe("same-origin validation behind Railway", () => {
  it("accepts the public origin forwarded to an internal Railway host", () => {
    const request = makeRequest("http://app.internal/api/auth/login", {
      origin: "https://solar.example.com",
      host: "app.internal",
      "x-forwarded-host": "solar.example.com",
      "x-forwarded-proto": "https",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects a different origin", () => {
    const request = makeRequest("http://app.internal/api/auth/login", {
      origin: "https://attacker.example",
      host: "app.internal",
      "x-forwarded-host": "solar.example.com",
      "x-forwarded-proto": "https",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("uses the request host for local development", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects a scheme mismatch", () => {
    const request = makeRequest("http://localhost:3000/api/auth/login", {
      origin: "https://localhost:3000",
      host: "localhost:3000",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });
});
