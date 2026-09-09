import { describe, expect, test } from "bun:test";
import { validateAdminPasswordChange } from "./admin-password";

describe("admin password validation", () => {
  test("requires the current password", () => {
    expect(
      validateAdminPasswordChange({
        currentPassword: "",
        newPassword: "a-secure-new-password",
        confirmPassword: "a-secure-new-password",
      }),
    ).toBe("Enter your current password.");
  });

  test("requires twelve characters and matching confirmation", () => {
    expect(
      validateAdminPasswordChange({
        currentPassword: "old-password",
        newPassword: "too-short",
        confirmPassword: "too-short",
      }),
    ).toBe("The new password must be at least 12 characters.");
    expect(
      validateAdminPasswordChange({
        currentPassword: "old-password",
        newPassword: "a-secure-new-password",
        confirmPassword: "another-secure-password",
      }),
    ).toBe("The new passwords do not match.");
  });

  test("rejects reuse and accepts a valid change", () => {
    const same = "same-secure-password";
    expect(
      validateAdminPasswordChange({
        currentPassword: same,
        newPassword: same,
        confirmPassword: same,
      }),
    ).toBe("Choose a new password that is different from the current password.");
    expect(
      validateAdminPasswordChange({
        currentPassword: "old-secure-password",
        newPassword: "new-secure-password",
        confirmPassword: "new-secure-password",
      }),
    ).toBeNull();
  });
});
