import type { AdminOnboardingStatus } from "./admin-authorization";

export function classifyBetterAuthAdminSession(input: {
  hasSession: boolean;
  allowlisted: boolean;
  twoFactorEnabled: boolean;
  sessionCreatedAt?: Date;
  userUpdatedAt?: Date;
}): AdminOnboardingStatus {
  if (!input.hasSession || !input.allowlisted) return "not_authorized";
  if (!input.twoFactorEnabled) return "mfa_enrollment_required";
  if (
    !input.sessionCreatedAt ||
    !input.userUpdatedAt ||
    input.sessionCreatedAt <= input.userUpdatedAt
  )
    return "mfa_challenge_required";
  return "ready";
}
