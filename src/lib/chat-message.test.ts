import { describe, expect, test } from "bun:test";
import {
  CHAT_LINK_BLOCKED_MESSAGE,
  hasChatLink,
  isAllowedChatMessageText,
  validateChatMessageText,
} from "./chat-message";

describe("live chat message validation", () => {
  test("accepts ordinary messages and email addresses", () => {
    expect(validateChatMessageText("Aaj ka ambience mast hai!")).toBeNull();
    expect(validateChatMessageText("Email me at hello@example.com")).toBeNull();
    expect(validateChatMessageText("a".repeat(300))).toBeNull();
    expect(isAllowedChatMessageText("Namaste dosto")).toBe(true);
  });

  test.each([
    "https://example.com",
    "HTTP://EXAMPLE.COM/offer",
    "www.example.com",
    "[visit us](https://example.com)",
    "[room rules](/rules)",
    "Visit example.com for details",
    "(example.co.in), please avoid this",
  ])("rejects a link: %s", (text) => {
    expect(hasChatLink(text)).toBe(true);
    expect(validateChatMessageText(text)).toBe(CHAT_LINK_BLOCKED_MESSAGE);
    expect(isAllowedChatMessageText(text)).toBe(false);
  });

  test("keeps the existing length validation", () => {
    expect(validateChatMessageText("   ")).toBe(
      "Message text must be between 1 and 300 characters",
    );
    expect(validateChatMessageText("a".repeat(301))).toBe(
      "Message text must be between 1 and 300 characters",
    );
    expect(isAllowedChatMessageText(null)).toBe(false);
  });
});
