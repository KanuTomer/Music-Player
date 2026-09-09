export type AdminPasswordDraft = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function validateAdminPasswordChange(draft: AdminPasswordDraft): string | null {
  if (!draft.currentPassword) return "Enter your current password.";
  if (draft.newPassword.length < 12) return "The new password must be at least 12 characters.";
  if (draft.newPassword !== draft.confirmPassword) return "The new passwords do not match.";
  if (draft.newPassword === draft.currentPassword) {
    return "Choose a new password that is different from the current password.";
  }
  return null;
}
