import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOnboarding } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({ component: AdminLogin });
const ADMIN_SIGN_IN_NOTICE_KEY = "sainik-dhaba.admin.sign-in-notice";
type MfaSetup = { factorId: string; qrCode?: string; secret?: string };

function consumeSignInNotice(): string {
  if (typeof window === "undefined") return "";
  const notice = window.sessionStorage.getItem(ADMIN_SIGN_IN_NOTICE_KEY) ?? "";
  window.sessionStorage.removeItem(ADMIN_SIGN_IN_NOTICE_KEY);
  return notice;
}

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfa, setMfa] = useState<MfaSetup | null>(null);
  const [error, setError] = useState("");
  const [notice] = useState(consumeSignInNotice);
  const [busy, setBusy] = useState(false);

  async function prepareMfa() {
    const status = await getAdminOnboarding();
    if (status === "not_authorized") {
      await supabase.auth.signOut();
      throw new Error("This account is not authorized for administration.");
    }
    if (status === "ready") {
      await navigate({ to: "/admin" });
      return;
    }
    if (status === "mfa_challenge_required") {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const factor = data.totp.find((item) => item.status === "verified");
      if (!factor) throw new Error("No verified authenticator could be found.");
      setMfa({ factorId: factor.id });
      return;
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Sainik Dhaba admin",
    });
    if (enrollError) throw enrollError;
    setMfa({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await prepareMfa();
    } catch (signInError) {
      setError(
        signInError instanceof Error ? signInError.message : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfa || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfa.factorId,
        code,
      });
      if (verifyError) throw verifyError;
      if ((await getAdminOnboarding()) !== "ready") {
        throw new Error("Authenticator verification did not complete.");
      }
      await navigate({ to: "/admin" });
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : "That verification code was rejected.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-16 text-zinc-100">
      <form
        onSubmit={mfa ? verifyMfa : submitPassword}
        className="mx-auto max-w-sm space-y-4 rounded-lg border border-zinc-700 bg-zinc-900 p-6"
      >
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-amber-300" /> Sainik Dhaba admin
          </p>
          <p className="mt-1 text-xs text-amber-300">
            {mfa ? "Verify your authenticator" : "Password and authenticator required"}
          </p>
        </div>
        {notice ? (
          <p className="text-sm text-amber-200" role="status">
            {notice}
          </p>
        ) : null}
        {!mfa ? (
          <>
            <label className="block text-sm">
              Email
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                minLength={12}
                required
              />
            </label>
          </>
        ) : (
          <>
            {mfa.qrCode ? (
              <div className="space-y-3 rounded border border-zinc-700 bg-white p-3 text-zinc-950">
                <p className="text-sm font-semibold">Set up an authenticator</p>
                <p className="text-xs">
                  Scan this QR code with your authenticator app, then enter the six-digit code.
                </p>
                <img
                  className="mx-auto size-48"
                  src={mfa.qrCode}
                  alt="Authenticator enrollment QR code"
                />
                {mfa.secret ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer">Can’t scan the code?</summary>
                    <code className="mt-2 block break-all rounded bg-zinc-100 p-2">
                      {mfa.secret}
                    </code>
                  </details>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-300">
                Enter the current six-digit code from your authenticator app.
              </p>
            )}
            <label className="block text-sm">
              Verification code
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2 text-center font-mono text-xl tracking-[.35em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                required
              />
            </label>
          </>
        )}
        {error ? (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="flex w-full items-center justify-center rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          type="submit"
          disabled={busy || Boolean(mfa && code.length !== 6)}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Checking…
            </>
          ) : mfa ? (
            "Verify and continue"
          ) : (
            "Continue"
          )}
        </button>
        {mfa ? (
          <button
            type="button"
            className="w-full rounded border border-zinc-600 px-3 py-2 text-sm"
            onClick={() =>
              void supabase.auth.signOut().finally(() => {
                setMfa(null);
                setCode("");
              })
            }
          >
            Use a different account
          </button>
        ) : null}
      </form>
    </main>
  );
}
