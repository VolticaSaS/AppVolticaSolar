function firstHeaderValue(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

export function isSameOriginRequest(request: Pick<Request, "url" | "headers">): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
    const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
    const forwardedProto = forwardedHost
      ? firstHeaderValue(request.headers.get("x-forwarded-proto"))
      : null;
    const protocol = forwardedProto ?? requestUrl.protocol.replace(/:$/, "");
    if (protocol !== "http" && protocol !== "https") return false;

    return originUrl.origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}
