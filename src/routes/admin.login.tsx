import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({ component: AdminLogin });
const ADMIN_SIGN_IN_NOTICE_KEY = "sainik-dhaba.admin.sign-in-notice";

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
  const [error, setError] = useState("");
  const [notice] = useState(consumeSignInNotice);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      await navigate({ to: "/admin" });
    } catch (signInError) {
      setError(
        signInError instanceof Error ? signInError.message : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-16 text-zinc-100">
      <form
        onSubmit={submit}
        className="mx-auto max-w-sm space-y-4 rounded-lg border border-zinc-700 bg-zinc-900 p-6"
      >
        <div>
          <p className="text-sm font-semibold">Sainik Dhaba admin</p>
          <p className="mt-1 text-xs text-amber-300">Catalogue and analytics</p>
        </div>
        {notice ? (
          <p className="text-sm text-amber-200" role="status">
            {notice}
          </p>
        ) : null}
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            required
          />
        </label>
        {error ? (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="w-full rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
