import { type FormEvent, useEffect, useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { authClient } from "@/lib/better-auth.client";
import { validateAdminPasswordChange } from "@/lib/admin-password";
import { getAdminOnboarding } from "@/lib/admin.functions";

export function AdminSecurityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setMessage("");
    void authClient
      .getSession()
      .then(({ data }) => setMfaEnabled(Boolean(data?.user.twoFactorEnabled)));
  }, [open]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateAdminPasswordChange({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (validationError) return setMessage(validationError);
    setBusy(true);
    setMessage("");
    try {
      if ((await getAdminOnboarding()) !== "ready")
        throw new Error("Verify administrator MFA again before changing the password.");
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed. Other sessions have been signed out.");
    } catch (value) {
      setMessage(value instanceof Error ? value.message : "Unable to change password");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-title"
    >
      <section className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="security-title" className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="size-5 text-amber-300" /> Account security
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Manage the password for this administrator account.
            </p>
          </div>
          <button
            className="rounded p-2 hover:bg-zinc-800"
            onClick={onClose}
            aria-label="Close account security"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-5 rounded border border-zinc-700 p-3 text-sm">
          <p className="font-medium">Authenticator</p>
          <p className={mfaEnabled ? "text-emerald-300" : "text-amber-300"}>
            {mfaEnabled ? "Enabled" : "Enrollment required at next sign-in"}
          </p>
        </div>
        <form className="mt-6 border-t border-zinc-800 pt-5" onSubmit={changePassword}>
          <h3 className="font-semibold">Change password</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Confirm your current password, then choose at least 12 characters.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              Current password
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-2"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                disabled={busy}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              New password
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-2"
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={newPassword}
                disabled={busy}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Confirm new password
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-2"
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={confirmPassword}
                disabled={busy}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
          </div>
          <button
            className="mt-4 w-full rounded bg-amber-600 px-3 py-2 font-semibold text-zinc-950 disabled:opacity-50"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 inline size-4 animate-spin" /> Changing password…
              </>
            ) : (
              "Change password"
            )}
          </button>
          {message ? (
            <p className="mt-3 text-sm text-amber-200" role="status">
              {message}
            </p>
          ) : null}
        </form>
        <p className="mt-5 text-xs text-zinc-500">
          Keep the backup codes shown during enrolment. Losing both the authenticator and backup
          codes requires a one-time operator reset.
        </p>
      </section>
    </div>
  );
}
