export const CHAT_CONTACT_BLOCKED_MESSAGE =
  "Links and email addresses aren't allowed in live chat.";

export type ChatMessage = {
  id: string;
  room_key: string;
  session_display_name: string;
  text: string;
  is_ai_host: boolean;
  created_at: string;
  expires_at: string;
};

const HTTP_OR_WWW_LINK = /(?:https?:\/\/|www\.)\S+/i;
const MARKDOWN_LINK = /\[[^\]\r\n]*\]\(\s*[^\s)]+\s*\)/i;
const BARE_DOMAIN =
  /(?:^|[^\w@-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?=$|[^\w-])/i;
const EMAIL_ADDRESS =
  /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/i;

export function hasProhibitedChatContent(text: string): boolean {
  return (
    HTTP_OR_WWW_LINK.test(text) ||
    MARKDOWN_LINK.test(text) ||
    BARE_DOMAIN.test(text) ||
    EMAIL_ADDRESS.test(text)
  );
}

export function validateChatMessageText(text: string): string | null {
  const trimmed = text.trim();

  if (!trimmed || trimmed.length > 300) {
    return "Message text must be between 1 and 300 characters";
  }

  return hasProhibitedChatContent(trimmed) ? CHAT_CONTACT_BLOCKED_MESSAGE : null;
}

export function isAllowedChatMessageText(text: unknown): text is string {
  return typeof text === "string" && validateChatMessageText(text) === null;
}
