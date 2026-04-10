const SUPPORT_MESSAGE_PREFIX = "support_message::";

export function isMissingSupportMessageColumnError(error: { message?: string; details?: string } | null): boolean {
  if (!error) {
    return false;
  }
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return text.includes("support_message") && (text.includes("column") || text.includes("schema cache"));
}

export function embedSupportMessageInUserAgent(userAgent: string, supportMessage: string): string {
  const ua = (userAgent ?? "").trim();
  const support = (supportMessage ?? "").trim();
  if (!support) {
    return ua;
  }
  return ua ? `${ua}\n${SUPPORT_MESSAGE_PREFIX}${support}` : `${SUPPORT_MESSAGE_PREFIX}${support}`;
}

export function extractSupportMessageFromUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return "";
  }
  const line = userAgent
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value.startsWith(SUPPORT_MESSAGE_PREFIX));

  if (!line) {
    return "";
  }
  return line.slice(SUPPORT_MESSAGE_PREFIX.length).trim();
}
