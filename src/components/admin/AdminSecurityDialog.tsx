import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Factor = { id: string; friendly_name?: string; status: "verified" | "unverified" };
type Enrollment = { factorId: string; qrCode: string; secret: string };

export function AdminSecurityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    setFactors(data.totp as Factor[]);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    void refresh().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Unable to load authenticators"),
    );
  }, [open, refresh]);

  async function addFactor() {
    setBusy("Adding authenticator");
    setMessage("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Backup authenticator ${factors.length + 1}`,
      });
      if (error) throw error;
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add authenticator");
    } finally {
      setBusy("");
    }
  }

  async function verifyFactor() {
    if (!enrollment || !/^\d{6}$/.test(code)) return;
    setBusy("Verifying authenticator");
    setMessage("");
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code,
      });
      if (error) throw error;
      setEnrollment(null);
      setCode("");
      await refresh();
      setMessage("Backup authenticator added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setBusy("");
    }
  }

  async function removeFactor(factorId: string) {
    const verified = factors.filter((factor) => factor.status === "verified");
    if (verified.length <= 1) {
      setMessage("Add and verify a backup authenticator before removing the last one.");
      return;
    }
    setBusy("Removing authenticator");
    setMessage("");
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await refresh();
      setMessage("Authenticator removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove authenticator");
    } finally {
      setBusy("");
    }
  }

  if (!open) return null;
  const verifiedCount = factors.filter((factor) => factor.status === "verified").length;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-title"
    >
      <section className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="security-title" className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="size-5 text-amber-300" /> Account security
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Manage the authenticators required for admin access.
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
        <div className="mt-5 space-y-2">
          {factors
            .filter((factor) => factor.status === "verified")
            .map((factor, index) => (
              <div
                key={factor.id}
                className="flex items-center justify-between gap-3 rounded border border-zinc-700 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {factor.friendly_name || `Authenticator ${index + 1}`}
                  </p>
                  <p className="text-xs text-emerald-300">Verified</p>
                </div>
                <button
                  className="rounded border border-red-900 px-2 py-1 text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={Boolean(busy) || verifiedCount <= 1}
                  onClick={() => void removeFactor(factor.id)}
                  title={
                    verifiedCount <= 1
                      ? "The last verified authenticator cannot be removed"
                      : undefined
                  }
                >
                  <Trash2 className="mr-1 inline size-3.5" /> Remove
                </button>
              </div>
            ))}
        </div>
        {enrollment ? (
          <div className="mt-5 space-y-3 rounded border border-amber-700/60 p-4">
            <p className="text-sm font-semibold">Scan the backup authenticator</p>
            <img
              className="mx-auto size-44 bg-white p-2"
              src={enrollment.qrCode}
              alt="Backup authenticator enrollment QR code"
            />
            <details className="text-xs text-zinc-300">
              <summary className="cursor-pointer">Manual setup code</summary>
              <code className="mt-2 block break-all rounded bg-zinc-900 p-2">
                {enrollment.secret}
              </code>
            </details>
            <input
              className="w-full rounded border border-zinc-600 bg-zinc-900 p-2 text-center font-mono text-lg tracking-[.3em]"
              aria-label="Verification code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <button
              className="w-full rounded bg-amber-600 px-3 py-2 font-semibold text-zinc-950 disabled:opacity-50"
              disabled={Boolean(busy) || code.length !== 6}
              onClick={() => void verifyFactor()}
            >
              Verify backup authenticator
            </button>
          </div>
        ) : (
          <button
            className="mt-5 w-full rounded border border-zinc-600 px-3 py-2 text-sm"
            disabled={Boolean(busy)}
            onClick={() => void addFactor()}
          >
            Add backup authenticator
          </button>
        )}
        {busy ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
            <Loader2 className="size-4 animate-spin" /> {busy}…
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 text-sm text-amber-200" role="status">
            {message}
          </p>
        ) : null}
        <p className="mt-5 text-xs text-zinc-500">
          Keep at least one backup authenticator. If every factor is lost, recovery requires a
          Supabase Auth administrator.
        </p>
      </section>
    </div>
  );
}
