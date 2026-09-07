import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Plus, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import {
  DiscardChangesDialog,
  InfoTip,
  UnsavedChangesBar,
} from "@/components/admin/AdminFormFeedback";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { sameAdminDraft } from "@/lib/admin-drafts";

type Scene = { id: string; slug: string; title: string; ambience: AdminAmbience | null };
type Props = {
  scene: Scene;
  assets: AdminAsset[];
  onChanged: () => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};
type DraftStem = Omit<AdminAmbienceStem, "id"> & { id?: string };
type ProfileDraft = {
  enabled: boolean;
  maxMasterGain: number;
  musicDuckRatio: number;
  fadeInMs: number;
  fadeOutMs: number;
  audioTheme: Record<string, Record<string, number>>;
};

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

const profileSnapshot = (profile: AdminAmbience | null): ProfileDraft => ({
  enabled: profile?.enabled ?? false,
  maxMasterGain: profile?.maxMasterGain ?? 0.3,
  musicDuckRatio: profile?.musicDuckRatio ?? 0.4,
  fadeInMs: profile?.fadeInMs ?? 900,
  fadeOutMs: profile?.fadeOutMs ?? 700,
  audioTheme: profile?.audioTheme ?? {},
});

export function AmbienceAudioPanel({ scene, assets, onChanged, onDirtyChange }: Props) {
  const profile = scene.ambience;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<DraftStem | null>(null);
  const [editingBaseline, setEditingBaseline] = useState<DraftStem | null>(null);
  const [confirmStemClose, setConfirmStemClose] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => profileSnapshot(profile));
  const [profileBaseline, setProfileBaseline] = useState<ProfileDraft>(() =>
    profileSnapshot(profile),
  );
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [decoded, setDecoded] = useState<DecodedWav | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [uploadRole, setUploadRole] = useState<AmbienceRole>("texture");
  const [uploadName, setUploadName] = useState("");
  const [trim, setTrim] = useState({ startSeconds: 0, durationSeconds: 0 });
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const next = profileSnapshot(profile);
    setProfileBaseline((previousBaseline) => {
      setProfileDraft((current) => (sameAdminDraft(current, previousBaseline) ? next : current));
      return next;
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
  const profileDirty = !sameAdminDraft(profileDraft, profileBaseline);
  const availabilityChanged = profileDraft.enabled !== profileBaseline.enabled;
  const stemDirty = Boolean(editing && !sameAdminDraft(editing, editingBaseline));
  const uploadDirty = Boolean(sourceFile || uploadName.trim() || sourceUrl.trim() || previewUrl);
  const hasUnsavedChanges = profileDirty || stemDirty || uploadDirty;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);
  useEffect(
    () => () => {
      onDirtyChange?.(false);
    },
    [onDirtyChange],
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
    const saved = { ...profileDraft, audioTheme: { ...profileDraft.audioTheme } };
    setBusy("Saving ambience");
    setMessage("");
    try {
      await saveAdminAmbienceProfile({ data: { sceneId: scene.id, ...saved } });
      setProfileBaseline(saved);
      setMessage("Ambience settings saved.");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save ambience settings");
    } finally {
      setBusy(null);
    }
  }

  async function saveStem() {
    if (!editing) return;
    await run("Saving sound", async () => {
      await saveAdminAmbienceStem({ data: { ...editing, sceneId: scene.id } });
      setEditing(null);
      setEditingBaseline(null);
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
      clearPreview();
    });
  }

  function beginEditing(draft: DraftStem) {
    setEditing({ ...draft });
    setEditingBaseline(draft.id ? { ...draft } : null);
  }

  function discardUpload() {
    setSourceFile(null);
    setDecoded(null);
    setSourceUrl("");
    setUploadName("");
    setTrim({ startSeconds: 0, durationSeconds: 0 });
    clearPreview();
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
    <TooltipProvider delayDuration={180}>
      <section aria-label={`${scene.title} ambience audio`} className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{scene.title} ambience audio</h2>
            <p className="mt-1 max-w-4xl text-sm text-zinc-400">
              Build the atmosphere in layers: Base creates the room, Texture adds quiet detail, and
              Effects are occasional foreground sounds.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              availabilityChanged
                ? "bg-amber-500/15 text-amber-300"
                : profileDraft.enabled
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {availabilityChanged
              ? profileDraft.enabled
                ? "Will become available after saving"
                : "Will become unavailable after saving"
              : profileDraft.enabled
                ? "Available to listeners"
                : "Unavailable to listeners"}
          </span>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="font-semibold">Mix & playback</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Everyday controls for how ambience sits underneath the music.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={profileDraft.enabled}
                  onChange={(event) =>
                    setProfileDraft((draft) => ({ ...draft, enabled: event.target.checked }))
                  }
                />
                Enable ambience
              </label>
              <InfoTip label="Enable ambience">
                Turning this off stops ambience for this Jagah and marks the player control as
                unavailable for listeners.
              </InfoTip>
            </div>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Master ambience volume",
                key: "maxMasterGain",
                min: 0,
                max: 1,
                step: 0.01,
                help: "The overall ceiling for every ambience layer in this Jagah.",
              },
              {
                label: "Music volume while ambience plays",
                key: "musicDuckRatio",
                min: 0,
                max: 1,
                step: 0.01,
                help: "Songs play at this percentage of each listener’s chosen music volume while ambience is active.",
              },
              {
                label: "Fade in",
                key: "fadeInMs",
                min: 0,
                max: 10000,
                step: 50,
                help: "How gradually ambience becomes audible when it starts.",
              },
              {
                label: "Fade out",
                key: "fadeOutMs",
                min: 0,
                max: 10000,
                step: 50,
                help: "How gradually ambience becomes silent when it stops or changes.",
              },
            ].map((setting) => {
              const key = setting.key as
                "maxMasterGain" | "musicDuckRatio" | "fadeInMs" | "fadeOutMs";
              const percentage = key === "maxMasterGain" || key === "musicDuckRatio";
              return (
                <label key={key} className="text-sm">
                  <span className="flex min-h-6 items-center gap-1 font-medium">
                    {setting.label}
                    <InfoTip label={setting.label}>{setting.help}</InfoTip>
                  </span>
                  <input
                    className="mt-2 w-full accent-amber-500"
                    type="range"
                    min={setting.min}
                    max={setting.max}
                    step={setting.step}
                    value={profileDraft[key]}
                    onChange={(event) =>
                      setProfileDraft((draft) => ({ ...draft, [key]: value(event) }))
                    }
                  />
                  <span className="text-xs text-zinc-400">
                    {percentage
                      ? `${Math.round(profileDraft[key] * 100)}%`
                      : `${profileDraft[key]} ms`}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <div className="rounded-lg border border-zinc-700 bg-zinc-950/40">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span className="flex items-center gap-3">
                  <SlidersHorizontal className="size-4 text-amber-300" aria-hidden />
                  <span>
                    <span className="block font-semibold">Advanced sound shaping</span>
                    <span className="block text-xs font-normal text-zinc-400">
                      Optional EQ controls for experienced audio editors
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-3 border-t border-zinc-800 p-4 lg:grid-cols-3">
                {roles.map((role) => (
                  <fieldset key={role.value} className="rounded border border-zinc-700 p-3">
                    <legend className="px-1 font-medium">{role.label} EQ</legend>
                    <p className="mb-3 text-xs text-zinc-400">{role.description}</p>
                    {[
                      [
                        "High-pass",
                        "highpass_hz",
                        10,
                        2000,
                        "Removes low rumble below this frequency.",
                      ],
                      [
                        "Low-pass",
                        "lowpass_hz",
                        1000,
                        20000,
                        "Softens high frequencies above this point.",
                      ],
                      [
                        "Focus frequency",
                        "peak_hz",
                        40,
                        16000,
                        "The part of the sound adjusted by Focus gain.",
                      ],
                      [
                        "Focus gain",
                        "peak_gain_db",
                        -12,
                        12,
                        "Boosts or reduces the selected focus frequency.",
                      ],
                      [
                        "Focus width",
                        "peak_q",
                        0.1,
                        12,
                        "Higher values affect a narrower range of frequencies.",
                      ],
                    ].map(([label, key, min, max, help]) => (
                      <label key={key} className="mb-3 block text-xs">
                        <span className="flex items-center gap-1">
                          {label} {key === "peak_gain_db" ? "(dB)" : key === "peak_q" ? "" : "(Hz)"}
                          <InfoTip label={`${role.label} ${label}`}>{help}</InfoTip>
                        </span>
                        <input
                          className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 p-2"
                          type="number"
                          min={min}
                          max={max}
                          step={key === "peak_q" ? 0.1 : 1}
                          value={
                            filter(role.value)[String(key)] ??
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
            </CollapsibleContent>
          </div>
        </Collapsible>

        <UnsavedChangesBar
          dirty={profileDirty}
          saving={busy === "Saving ambience"}
          onSave={() => void saveProfile()}
          onDiscard={() => setProfileDraft(profileBaseline)}
        />
        <div className="rounded border border-zinc-700 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Sounds</h3>
            <button
              className="rounded border border-zinc-600 px-3 py-2 text-sm"
              disabled={!!busy || !usableAssets.length}
              onClick={() => beginEditing(defaults("texture", usableAssets[0]?.id ?? ""))}
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
                    <td className="p-2 capitalize">
                      {stem.role === "event" ? "effect" : stem.role}
                    </td>
                    <td className="p-2">{Math.round(stem.defaultVolume * 100)}%</td>
                    <td className="p-2">{stem.isActive ? "Active" : "Removed"}</td>
                    <td className="p-2 text-right">
                      <button
                        className="mr-2 rounded border border-zinc-600 px-2 py-1"
                        disabled={!!busy}
                        onClick={() => beginEditing(stem)}
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
            The original remains on this device. The published file is a 32 kHz mono WAV under 12
            MiB.
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
              <span className="flex items-center gap-1">
                Role
                <InfoTip label="upload role">
                  Base loops as the room foundation, Texture adds quieter repeating detail, and an
                  Effect plays occasionally in the foreground.
                </InfoTip>
              </span>
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
            <span className="flex items-center gap-1">
              Original WAV
              <InfoTip label="original WAV">
                Choose an original WAV up to 64 MiB. It stays on this device; only the trimmed,
                optimized playback copy is uploaded.
              </InfoTip>
            </span>
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
                  <span className="flex items-center gap-1">
                    Start (seconds)
                    <InfoTip label="segment start">
                      The point in the original recording where the published excerpt begins.
                    </InfoTip>
                  </span>
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
                  <span className="flex items-center gap-1">
                    Duration (max {ambienceProcessing.maxDurationSeconds[uploadRole]} s)
                    <InfoTip label="segment duration">
                      The length of the excerpt. Shorter files load faster; each role has a safe
                      maximum.
                    </InfoTip>
                  </span>
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
                <button
                  type="button"
                  className="rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-50"
                  disabled={!!busy || !uploadDirty}
                  onClick={discardUpload}
                >
                  Discard upload draft
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
            onCancel={() => {
              if (stemDirty) setConfirmStemClose(true);
              else setEditing(null);
            }}
            onSave={() => void saveStem()}
          />
        ) : null}
        <DiscardChangesDialog
          open={confirmStemClose}
          description="This sound has edits that have not been saved."
          onStay={() => setConfirmStemClose(false)}
          onDiscard={() => {
            setConfirmStemClose(false);
            setEditing(null);
            setEditingBaseline(null);
          }}
        />
        {message ? (
          <p role="status" className="rounded border border-zinc-700 bg-zinc-900 p-3 text-sm">
            {message}
          </p>
        ) : null}
      </section>
    </TooltipProvider>
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
          <button className="rounded border border-zinc-600 px-3 py-1.5 text-sm" onClick={onCancel}>
            Cancel
          </button>
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
            <span className="flex items-center gap-1">
              Role
              <InfoTip label="sound role">
                Base is the continuous room bed, Texture adds a quieter loop, and Effect is an
                occasional foreground sound.
              </InfoTip>
            </span>
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
            <span className="flex items-center gap-1">
              Playback asset
              <InfoTip label="playback asset">
                The optimized audio file used by this sound. One asset can be reused across Jagahs.
              </InfoTip>
            </span>
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
            [
              "Default volume",
              "defaultVolume",
              0,
              1,
              0.01,
              "The normal level used when this sound begins.",
            ],
            [
              "Minimum volume",
              "minGain",
              0,
              1,
              0.01,
              "The quietest level automatic variation may use.",
            ],
            [
              "Maximum volume",
              "maxGain",
              0,
              1,
              0.01,
              "The loudest level automatic variation may use.",
            ],
            [
              "Order",
              "sortOrder",
              0,
              999,
              1,
              "Lower numbers load and appear before higher numbers.",
            ],
            [
              "Crossfade (ms)",
              "crossfadeMs",
              0,
              10000,
              50,
              "How long overlapping loop copies blend to hide the join.",
            ],
            [
              "Loop start (s)",
              "loopStartSeconds",
              0,
              3600,
              0.1,
              "The point in the file where looping begins.",
            ],
          ].map(([label, key, min, max, step, help]) => (
            <label key={key} className="text-sm">
              <span className="flex items-center gap-1">
                {label}
                <InfoTip label={String(label)}>{help}</InfoTip>
              </span>
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
          <label className="text-sm">
            <span className="flex items-center gap-1">
              Loop end (s)
              <InfoTip label="loop end">
                The point where looping stops. Leave it blank to use the end of the file.
              </InfoTip>
            </span>
            <input
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
              type="number"
              min={0.1}
              max={3600}
              step={0.1}
              value={draft.loopEndSeconds ?? ""}
              placeholder="End of file"
              onChange={(event) =>
                update("loopEndSeconds", event.target.value ? value(event) : null)
              }
            />
          </label>
          {draft.role === "event" ? (
            <>
              <label className="text-sm">
                <span className="flex items-center gap-1">
                  Effect minimum delay (s)
                  <InfoTip label="minimum effect delay">
                    The shortest wait before this effect may play automatically again.
                  </InfoTip>
                </span>
                <input
                  className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                  type="number"
                  min={5}
                  value={draft.eventMinSeconds ?? 35}
                  onChange={(event) => update("eventMinSeconds", value(event))}
                />
              </label>
              <label className="text-sm">
                <span className="flex items-center gap-1">
                  Effect maximum delay (s)
                  <InfoTip label="maximum effect delay">
                    The longest automatic wait; a random time is chosen between both limits.
                  </InfoTip>
                </span>
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
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
            />{" "}
            Active
            <InfoTip label="active sound">
              Inactive sounds stay configured but are not sent to listeners or played.
            </InfoTip>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-zinc-700 pt-4">
          <button className="rounded border border-zinc-600 px-3 py-2 text-sm" onClick={onCancel}>
            Discard
          </button>
          <button
            className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950"
            disabled={busy || !draft.name.trim() || !draft.assetId}
            onClick={onSave}
          >
            {busy ? "Saving…" : "Save sound"}
          </button>
        </div>
      </div>
    </div>
  );
}
