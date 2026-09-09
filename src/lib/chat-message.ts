export const CHAT_LINK_BLOCKED_MESSAGE = "Links aren't allowed in live chat.";

const HTTP_OR_WWW_LINK = /(?:https?:\/\/|www\.)\S+/i;
const MARKDOWN_LINK = /\[[^\]\r\n]*\]\(\s*[^\s)]+\s*\)/i;
const BARE_DOMAIN =
  /(?:^|[^\w@-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?=$|[^\w-])/i;

export function hasChatLink(text: string): boolean {
  return HTTP_OR_WWW_LINK.test(text) || MARKDOWN_LINK.test(text) || BARE_DOMAIN.test(text);
}

export function validateChatMessageText(text: string): string | null {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length > 300) {
    return "Message text must be between 1 and 300 characters";
  }

  return hasChatLink(trimmed) ? CHAT_LINK_BLOCKED_MESSAGE : null;
}

export function isAllowedChatMessageText(text: unknown): text is string {
  return typeof text === "string" && validateChatMessageText(text) === null;
}
