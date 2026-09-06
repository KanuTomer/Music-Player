import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  finalizeAdminAmbienceUpload,
  removeAdminAmbienceStem,
  reserveAdminAmbienceUpload,
  saveAdminAmbienceProfile,
  saveAdminAmbienceStem,
} from "@/lib/admin.functions";
import {
  ambienceProcessing,
  decodePcm16Wav,
  prepareAmbienceWav,
  sha256Hex,
  suggestedWindow,
  type AmbienceRole,
  type DecodedWav,
} from "@/lib/ambience-processing";
import type { AdminAmbience, AdminAsset, AdminAmbienceStem } from "@/lib/admin.server";

type Scene = { id: string; slug: string; title: string; ambience: AdminAmbience | null };
type Props = { scene: Scene; assets: AdminAsset[]; onChanged: () => Promise<void> };
type DraftStem = Omit<AdminAmbienceStem, "id"> & { id?: string };

const roles: Array<{ value: AmbienceRole; label: string; description: string }> = [
  { value: "base", label: "Base", description: "Continuous room tone that anchors the place." },
  {
    value: "texture",
    label: "Texture",
    description: "Quieter repeating detail layered over the base.",
  },
  {
    value: "event",
    label: "Effect",
    description: "Foreground sound that plays automatically and can be triggered manually.",
  },
];

const defaults = (role: AmbienceRole, assetId = ""): DraftStem => ({
  name: "",
  role,
  assetId,
  isActive: true,
  sortOrder: 99,
  defaultVolume: role === "base" ? 0.9 : role === "texture" ? 0.6 : 0.35,
  minGain: role === "base" ? 0.82 : role === "texture" ? 0.52 : 0.22,
  maxGain: role === "base" ? 0.96 : role === "texture" ? 0.68 : 0.48,
  crossfadeMs: role === "event" ? 0 : 2500,
  loopStartSeconds: 0,
  loopEndSeconds: null,
  eventMinSeconds: role === "event" ? 35 : null,
  eventMaxSeconds: role === "event" ? 110 : null,
});

const value = (event: React.ChangeEvent<HTMLInputElement>) => Number(event.target.value);

export function AmbienceAudioPanel({ scene, assets, onChanged }: Props) {
  const profile = scene.ambience;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<DraftStem | null>(null);
  const [profileDraft, setProfileDraft] = useState(() => ({
    enabled: profile?.enabled ?? false,
    maxMasterGain: profile?.maxMasterGain ?? 0.3,
    fadeInMs: profile?.fadeInMs ?? 900,
    fadeOutMs: profile?.fadeOutMs ?? 700,
    audioTheme: profile?.audioTheme ?? {},
  }));
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [decoded, setDecoded] = useState<DecodedWav | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [uploadRole, setUploadRole] = useState<AmbienceRole>("texture");
  const [uploadName, setUploadName] = useState("");
  const [trim, setTrim] = useState({ startSeconds: 0, durationSeconds: 0 });
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    setProfileDraft({
      enabled: profile?.enabled ?? false,
      maxMasterGain: profile?.maxMasterGain ?? 0.3,
      fadeInMs: profile?.fadeInMs ?? 900,
      fadeOutMs: profile?.fadeOutMs ?? 700,
      audioTheme: profile?.audioTheme ?? {},
    });
  }, [profile]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const activeStems = useMemo(() => profile?.stems ?? [], [profile]);
  const usableAssets = useMemo(
    () =>
      assets.filter(
        (asset) => !activeStems.some((stem) => stem.assetId === asset.id && stem.isActive),
      ),
    [assets, activeStems],
  );

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setMessage("");
    try {
      await action();
      setMessage(`${label} complete.`);
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to ${label.toLowerCase()}`);
    } finally {
      setBusy(null);
    }
  }

  async function saveProfile() {
    await run("Saving ambience", () =>
      saveAdminAmbienceProfile({ data: { sceneId: scene.id, ...profileDraft } }),
    );
  }

  async function saveStem() {
    if (!editing) return;
    await run("Saving sound", async () => {
      await saveAdminAmbienceStem({ data: { ...editing, sceneId: scene.id } });
      setEditing(null);
    });
  }

  async function chooseFile(file: File | null) {
    if (!file) return;
    if (file.size > ambienceProcessing.maxSourceBytes) {
      setMessage("Choose a WAV file no larger than 64 MiB.");
      return;
    }
    try {
      const next = decodePcm16Wav(await file.arrayBuffer());
      const window = suggestedWindow(next, uploadRole);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setSourceFile(file);
      setDecoded(next);
      setTrim(window);
      setUploadName(file.name.replace(/\.wav$/i, ""));
      setMessage("Preview and adjust the selected source segment before publishing.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to read WAV file");
    }
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
  }

  async function previewSelection() {
    if (!decoded) return;
    setBusy("Preparing preview");
    setMessage("");
    try {
      const prepared = prepareAmbienceWav(
        decoded,
        uploadRole,
        trim.startSeconds,
        trim.durationSeconds,
      );
      clearPreview();
      setPreviewUrl(URL.createObjectURL(prepared.blob));
      setMessage("Preview ready. Listen to it below, then adjust the segment or publish it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to prepare preview");
    } finally {
      setBusy(null);
    }
  }

  async function publishUpload() {
    if (!sourceFile || !decoded || !uploadName.trim()) return;
    await run("Processing and uploading sound", async () => {
      const prepared = prepareAmbienceWav(
        decoded,
        uploadRole,
        trim.startSeconds,
        trim.durationSeconds,
      );
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(prepared.blob));
      const originalHash = await sha256Hex(sourceFile);
      const reserved = await reserveAdminAmbienceUpload({ data: { sceneSlug: scene.slug } });
      const { error } = await supabase.storage
        .from("ambience-audio")
        .uploadToSignedUrl(reserved.path, reserved.token, prepared.blob, {
          contentType: "audio/wav",
        });
      if (error) throw new Error(error.message);
      await finalizeAdminAmbienceUpload({
        data: {
          sceneId: scene.id,
          path: reserved.path,
          name: uploadName.trim(),
          role: uploadRole,
          sourceFilename: sourceFile.name,
          sourceByteSize: sourceFile.size,
          sourceDurationSeconds: decoded.durationSeconds,
          sourceSha256: originalHash,
          ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
          selectedStartSeconds: prepared.selectedStartSeconds,
          selectedDurationSeconds: prepared.selectedDurationSeconds,
        },
      });
      setSourceFile(null);
      setDecoded(null);
      setSourceUrl("");
      setUploadName("");
    });
  }

  function setFilter(role: AmbienceRole, key: string, next: number) {
    setProfileDraft((current) => ({
      ...current,
      audioTheme: {
        ...current.audioTheme,
        [role]: {
          ...((current.audioTheme as Record<string, Record<string, number>>)[role] ?? {}),
          [key]: next,
        },
      },
    }));
  }
  const filter = (role: AmbienceRole) =>
    (profileDraft.audioTheme as Record<string, Record<string, number>>)[role] ?? {};

  return (
    <section aria-label={`${scene.title} ambience audio`} className="space-y-5">
      <div>
        <h2 className="font-semibold">{scene.title} ambience audio</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Base builds the room, texture adds subtle detail, and effects are occasional foreground
          sounds. Effects play on their configured schedule and remain manually triggerable for
          listeners.
        </p>
      </div>
      <div className="rounded border border-zinc-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={profileDraft.enabled}
              onChange={(event) =>
                setProfileDraft((draft) => ({ ...draft, enabled: event.target.checked }))
              }
            />{" "}
            Enable ambience for this Jagah
          </label>
          <button
            className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            disabled={!!busy}
            onClick={() => void saveProfile()}
          >
            {busy === "Saving ambience" ? (
              <>
                <Loader2 className="mr-1 inline size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save mix"
            )}
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Master volume", "maxMasterGain", 0, 1, 0.01],
            ["Fade in (ms)", "fadeInMs", 0, 10000, 50],
            ["Fade out (ms)", "fadeOutMs", 0, 10000, 50],
          ].map(([label, key, min, max, step]) => (
            <label key={String(key)} className="text-sm">
              {label}
              <input
                className="mt-1 w-full accent-amber-500"
                type="range"
                min={Number(min)}
                max={Number(max)}
                step={Number(step)}
                value={Number(profileDraft[key as "maxMasterGain" | "fadeInMs" | "fadeOutMs"])}
                onChange={(event) =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    [key as "maxMasterGain" | "fadeInMs" | "fadeOutMs"]: value(event),
                  }))
                }
              />
              <span className="text-xs text-zinc-400">
                {key === "maxMasterGain"
                  ? `${Math.round(profileDraft.maxMasterGain * 100)}%`
                  : `${profileDraft[key as "fadeInMs" | "fadeOutMs"]} ms`}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {roles.map((role) => (
          <fieldset key={role.value} className="rounded border border-zinc-700 p-3">
            <legend className="px-1 font-medium">{role.label} EQ</legend>
            <p className="mb-3 text-xs text-zinc-400">{role.description}</p>
            {[
              ["High-pass Hz", "highpass_hz", 10, 2000],
              ["Low-pass Hz", "lowpass_hz", 1000, 20000],
              ["Peak Hz", "peak_hz", 40, 16000],
              ["Peak dB", "peak_gain_db", -12, 12],
              ["Peak Q", "peak_q", 0.1, 12],
            ].map(([label, key, min, max]) => (
              <label key={key} className="mb-2 block text-xs">
                {label}
                <input
                  className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-1"
                  type="number"
                  min={min}
                  max={max}
                  step={key === "peak_q" ? 0.1 : 1}
                  value={
                    filter(role.value)[key as string] ??
                    (key === "lowpass_hz"
                      ? 20000
                      : key === "peak_hz"
                        ? 1000
                        : key === "peak_q"
                          ? 1
                          : key === "highpass_hz"
                            ? 20
                            : 0)
                  }
                  onChange={(event) => setFilter(role.value, String(key), value(event))}
                />
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <div className="rounded border border-zinc-700 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Sounds</h3>
          <button
            className="rounded border border-zinc-600 px-3 py-2 text-sm"
            disabled={!!busy || !usableAssets.length}
            onClick={() => setEditing(defaults("texture", usableAssets[0]?.id ?? ""))}
          >
            <Plus className="mr-1 inline size-4" />
            Use existing asset
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-700 text-zinc-400">
              <tr>
                <th className="p-2">Sound</th>
                <th className="p-2">Role</th>
                <th className="p-2">Volume</th>
                <th className="p-2">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {activeStems.map((stem) => (
                <tr key={stem.id} className="border-b border-zinc-800">
                  <td className="p-2">{stem.name}</td>
                  <td className="p-2 capitalize">{stem.role === "event" ? "effect" : stem.role}</td>
                  <td className="p-2">{Math.round(stem.defaultVolume * 100)}%</td>
                  <td className="p-2">{stem.isActive ? "Active" : "Removed"}</td>
                  <td className="p-2 text-right">
                    <button
                      className="mr-2 rounded border border-zinc-600 px-2 py-1"
                      disabled={!!busy}
                      onClick={() => setEditing(stem)}
                    >
                      Edit
                    </button>
                    {stem.isActive ? (
                      <button
                        className="rounded border border-red-800 px-2 py-1 text-red-300"
                        disabled={!!busy}
                        onClick={() =>
                          void run("Removing sound", () =>
                            removeAdminAmbienceStem({ data: { stemId: stem.id } }),
                          )
                        }
                      >
                        <Trash2 className="mr-1 inline size-3.5" />
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded border border-zinc-700 p-4">
        <div className="flex items-center gap-2">
          <Upload className="size-4 text-amber-300" />
          <h3 className="font-semibold">Process a local WAV</h3>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          The original remains on this device. The published file is a 32 kHz mono WAV under 12 MiB.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            Name
            <input
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-2"
              value={uploadName}
              onChange={(event) => setUploadName(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Role
            <select
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-2"
              value={uploadRole}
              onChange={(event) => {
                const role = event.target.value as AmbienceRole;
                setUploadRole(role);
                if (decoded) setTrim(suggestedWindow(decoded, role));
                clearPreview();
              }}
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Source link (optional)
            <input
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-2"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="Attribution URL"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          Original WAV
          <input
            className="mt-1 block w-full text-sm"
            type="file"
            accept="audio/wav,.wav"
            disabled={!!busy}
            onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {decoded ? (
          <div className="mt-3 rounded bg-zinc-900 p-3">
            <p className="text-sm text-zinc-300">
              Original: {decoded.durationSeconds.toFixed(1)} seconds. The selected segment will be
              normalized and faded for seamless playback.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Start (seconds)
                <input
                  className="mt-1 w-full"
                  type="number"
                  min={0}
                  max={Math.max(0, decoded.durationSeconds - 0.1)}
                  step={0.1}
                  value={trim.startSeconds}
                  onChange={(event) => {
                    setTrim((current) => ({ ...current, startSeconds: value(event) }));
                    clearPreview();
                  }}
                />
              </label>
              <label className="text-sm">
                Duration (max {ambienceProcessing.maxDurationSeconds[uploadRole]} s)
                <input
                  className="mt-1 w-full"
                  type="number"
                  min={0.1}
                  max={ambienceProcessing.maxDurationSeconds[uploadRole]}
                  step={0.1}
                  value={trim.durationSeconds}
                  onChange={(event) => {
                    setTrim((current) => ({ ...current, durationSeconds: value(event) }));
                    clearPreview();
                  }}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-60"
                disabled={!!busy}
                onClick={() => void previewSelection()}
              >
                {busy === "Preparing preview" ? (
                  <>
                    <Loader2 className="mr-1 inline size-4 animate-spin" />
                    Preparing preview…
                  </>
                ) : (
                  "Preview selected segment"
                )}
              </button>
              <button
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
                disabled={!!busy || !uploadName.trim()}
                onClick={() => void publishUpload()}
              >
                {busy === "Processing and uploading sound" ? (
                  <>
                    <Loader2 className="mr-1 inline size-4 animate-spin" />
                    Processing and uploading…
                  </>
                ) : (
                  "Process and publish sound"
                )}
              </button>
            </div>
          </div>
        ) : null}
        {previewUrl ? (
          <audio className="mt-3 w-full" controls src={previewUrl}>
            Prepared preview
          </audio>
        ) : null}
      </div>
      {editing ? (
        <StemEditor
          draft={editing}
          assets={assets}
          busy={!!busy}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={() => void saveStem()}
        />
      ) : null}
      {message ? (
        <p role="status" className="rounded border border-zinc-700 bg-zinc-900 p-3 text-sm">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function StemEditor({
  draft,
  assets,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  draft: DraftStem;
  assets: AdminAsset[];
  busy: boolean;
  onChange: (draft: DraftStem) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const update = <K extends keyof DraftStem>(key: K, next: DraftStem[K]) =>
    onChange({ ...draft, [key]: next });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded bg-zinc-900 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{draft.id ? "Edit sound" : "Add existing sound"}</h3>
          <button onClick={onCancel}>Close</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Name
            <input
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label className="text-sm">
            Role
            <select
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
              value={draft.role}
              onChange={(event) => update("role", event.target.value as AmbienceRole)}
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Playback asset
            <select
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
              value={draft.assetId}
              onChange={(event) => update("assetId", event.target.value)}
            >
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.storagePath} · {asset.durationSeconds.toFixed(1)}s
                </option>
              ))}
            </select>
          </label>
          {[
            ["Default volume", "defaultVolume", 0, 1, 0.01],
            ["Minimum volume", "minGain", 0, 1, 0.01],
            ["Maximum volume", "maxGain", 0, 1, 0.01],
            ["Order", "sortOrder", 0, 999, 1],
            ["Crossfade ms", "crossfadeMs", 0, 10000, 50],
            ["Loop start s", "loopStartSeconds", 0, 3600, 0.1],
          ].map(([label, key, min, max, step]) => (
            <label key={key} className="text-sm">
              {label}
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                type="number"
                min={min}
                max={max}
                step={step}
                value={draft[key as keyof DraftStem] as number}
                onChange={(event) => update(key as keyof DraftStem, value(event) as never)}
              />
            </label>
          ))}
          {draft.role === "event" ? (
            <>
              <label className="text-sm">
                Effect minimum delay (s)
                <input
                  className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                  type="number"
                  min={5}
                  value={draft.eventMinSeconds ?? 35}
                  onChange={(event) => update("eventMinSeconds", value(event))}
                />
              </label>
              <label className="text-sm">
                Effect maximum delay (s)
                <input
                  className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                  type="number"
                  min={5}
                  value={draft.eventMaxSeconds ?? 110}
                  onChange={(event) => update("eventMaxSeconds", value(event))}
                />
              </label>
            </>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
            />{" "}
            Active
          </label>
        </div>
        <button
          className="mt-5 rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950"
          disabled={busy || !draft.name.trim() || !draft.assetId}
          onClick={onSave}
        >
          {busy ? "Saving…" : "Save sound"}
        </button>
      </div>
    </div>
  );
}
