import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { InfoTip, UnsavedChangesBar } from "./AdminFormFeedback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  discardAdminBackgroundUpload,
  reserveAdminBackgroundUpload,
  saveAdminScenePresentation,
} from "@/lib/admin.functions";
import type { AdminBackground, AdminOneLiner } from "@/lib/admin.server";
import { artFor } from "@/lib/scene-art";
import {
  DARK_SCENE_TEXT,
  isLightTextColor,
  sceneTextShadow,
  LIGHT_SCENE_TEXT,
  prepareBackgroundImage,
  suggestTextColorFromImageUrl,
  type PreparedBackground,
} from "@/lib/scene-presentation";

type Daypart = AdminOneLiner["daypart"];
type DraftLine = AdminOneLiner & { draft?: boolean };
type Draft = {
  foregroundTextColor: string;
  gagLabel: string;
  backgroundStoragePath: string | null;
  oneliners: DraftLine[];
};

const dayparts: Array<{ value: Daypart; label: string }> = [
  { value: "all", label: "All day" },
  { value: "morning", label: "Morning" },
  { value: "day", label: "Day" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

const snapshot = (data: AdminBackground): Draft => ({
  foregroundTextColor: data.scene.foregroundTextColor,
  gagLabel: data.scene.gagLabel ?? "",
  backgroundStoragePath: data.scene.backgroundStoragePath,
  oneliners: data.oneliners.map((line) => ({ ...line })),
});

const serialize = (draft: Draft) =>
  JSON.stringify({
    ...draft,
    oneliners: draft.oneliners.map(({ draft: _draft, ...line }) => line),
  });

export function BackgroundPanel({
  data,
  onChanged,
  onDirtyChange,
}: {
  data: AdminBackground;
  onChanged: () => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [baseline, setBaseline] = useState(() => snapshot(data));
  const [draft, setDraft] = useState(() => snapshot(data));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [bulkDaypart, setBulkDaypart] = useState<Daypart>("all");
  const [prepared, setPrepared] = useState<PreparedBackground | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const dirty = Boolean(prepared) || serialize(draft) !== serialize(baseline);
  const allSelected =
    Boolean(draft.oneliners.length) && selectedIds.length === draft.oneliners.length;
  const representative = draft.oneliners[0]?.text || "Jagah ki apni kahaani yahan dikhegi";
  const background = previewUrl || data.scene.backgroundUrl || artFor(data.scene.artKey);
  const previewTextColor = /^#[0-9A-Fa-f]{6}$/.test(draft.foregroundTextColor)
    ? draft.foregroundTextColor
    : baseline.foregroundTextColor;

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function selectImage(file: File | null) {
    if (!file) return;
    setBusy("Preparing image");
    setMessage("");
    try {
      const next = await prepareBackgroundImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPrepared(next);
      setPreviewUrl(URL.createObjectURL(next.blob));
      setDraft((current) => ({
        ...current,
        foregroundTextColor: next.suggestedTextColor,
      }));
      setMessage(
        `Ready: ${next.width}×${next.height} WebP, ${(next.blob.size / 1024 / 1024).toFixed(2)} MiB.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to prepare this image");
    } finally {
      setBusy("");
    }
  }

  function addBulk() {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;
    if (draft.oneliners.length + lines.length > 100) {
      setMessage("A Jagah can have up to 100 one-liners.");
      return;
    }
    setDraft((current) => ({
      ...current,
      oneliners: [
        ...current.oneliners,
        ...lines.map((text) => ({
          id: `draft-${crypto.randomUUID()}`,
          text,
          daypart: bulkDaypart,
          draft: true,
        })),
      ],
    }));
    setBulkText("");
  }

  function removeLines(ids: string[]) {
    const removed = new Set(ids);
    setDraft((current) => ({
      ...current,
      oneliners: current.oneliners.filter((line) => !removed.has(line.id)),
    }));
    setSelectedIds((current) => current.filter((id) => !removed.has(id)));
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setPrepared(null);
    setDraft({ ...baseline, oneliners: baseline.oneliners.map((line) => ({ ...line })) });
    setSelectedIds([]);
    setBulkText("");
    setMessage("Draft discarded.");
  }

  async function chooseAutomatically() {
    setBusy("Choosing text color");
    setMessage("");
    try {
      const color =
        prepared?.suggestedTextColor ?? (await suggestTextColorFromImageUrl(background));
      setDraft((current) => ({ ...current, foregroundTextColor: color }));
      setMessage("The most readable text color has been selected.");
    } catch (error) {
      setDraft((current) => ({
        ...current,
        foregroundTextColor: data.scene.isDark ? LIGHT_SCENE_TEXT : DARK_SCENE_TEXT,
      }));
      setMessage(error instanceof Error ? error.message : "Unable to sample this background");
    } finally {
      setBusy("");
    }
  }

  async function save() {
    if (!dirty) return;
    const blank = draft.oneliners.find((line) => !line.text.trim());
    if (blank) {
      setMessage("Every one-liner needs text, or remove the empty row.");
      return;
    }
    setBusy("Saving background");
    setMessage("");
    let uploadedPath: string | null = null;
    try {
      let path = draft.backgroundStoragePath;
      if (prepared) {
        const reservation = await reserveAdminBackgroundUpload({
          data: { sceneId: data.scene.id },
        });
        const upload = await supabase.storage
          .from("scene-media")
          .uploadToSignedUrl(reservation.path, reservation.token, prepared.blob, {
            contentType: "image/webp",
          });
        if (upload.error) throw upload.error;
        path = reservation.path;
        uploadedPath = reservation.path;
      }
      const result = await saveAdminScenePresentation({
        data: {
          sceneId: data.scene.id,
          backgroundStoragePath: path,
          foregroundTextColor: draft.foregroundTextColor,
          gagLabel: draft.gagLabel,
          oneliners: draft.oneliners.map((line) => ({
            ...(line.draft ? {} : { id: line.id }),
            text: line.text.trim(),
            daypart: line.daypart,
          })),
        },
      });
      uploadedPath = null;
      const next = snapshot(result);
      setBaseline(next);
      setDraft(next);
      setPrepared(null);
      setSelectedIds([]);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      await onChanged();
      setMessage("Background presentation saved. Open rooms will update automatically.");
    } catch (error) {
      if (uploadedPath) {
        await discardAdminBackgroundUpload({
          data: { sceneId: data.scene.id, path: uploadedPath },
        }).catch(() => undefined);
      }
      setMessage(error instanceof Error ? error.message : "Unable to save background changes");
    } finally {
      setBusy("");
    }
  }

  const scrim = useMemo(
    () =>
      isLightTextColor(previewTextColor)
        ? "linear-gradient(to bottom, rgba(0,0,0,.48), transparent 46%, rgba(0,0,0,.30))"
        : "linear-gradient(to bottom, rgba(255,255,255,.30), transparent 46%, rgba(255,255,255,.16))",
    [previewTextColor],
  );
  const previewTextShadow = sceneTextShadow(previewTextColor);

  return (
    <TooltipProvider delayDuration={180}>
      <section className="space-y-5" aria-labelledby="background-title">
        <div>
          <h2 id="background-title" className="text-lg font-semibold">
            {data.scene.title} background
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Change the scene image and the short messages visitors see. Everything below saves
            together.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,.85fr)]">
          <div className="space-y-5">
            <section className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Background image</h3>
                <InfoTip label="background image">
                  JPEG, PNG, WebP and AVIF files up to 15 MiB are accepted. Your browser creates a
                  smaller WebP copy for visitors; the original stays on your computer.
                </InfoTip>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950">
                  <ImagePlus className="size-4" aria-hidden /> Choose image
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={Boolean(busy)}
                    onChange={(event) => void selectImage(event.target.files?.[0] ?? null)}
                  />
                </label>
                {(draft.backgroundStoragePath || prepared) && (
                  <button
                    type="button"
                    className="rounded border border-zinc-600 px-3 py-2 text-sm"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl("");
                      setPrepared(null);
                      setDraft((current) => ({ ...current, backgroundStoragePath: null }));
                    }}
                  >
                    Use bundled image
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Text and effect label</h3>
                <InfoTip label="foreground text color">
                  One color is used for both Jagah titles and one-liners. A new image gets the most
                  readable of warm cream or deep charcoal automatically.
                </InfoTip>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Text color
                  <span className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-14 cursor-pointer rounded border border-zinc-600 bg-zinc-950 p-1"
                      value={previewTextColor}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          foregroundTextColor: event.target.value.toUpperCase(),
                        }))
                      }
                    />
                    <input
                      className="h-10 min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-950 px-3 font-mono"
                      value={draft.foregroundTextColor}
                      pattern="#[0-9A-Fa-f]{6}"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          foregroundTextColor: event.target.value,
                        }))
                      }
                    />
                  </span>
                </label>
                <div className="text-sm">
                  Choose automatically
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      className="h-10 rounded border border-zinc-600 px-3"
                      disabled={Boolean(busy)}
                      onClick={() => void chooseAutomatically()}
                    >
                      Best contrast
                    </button>
                  </div>
                </div>
                <label className="text-sm sm:col-span-2">
                  Effect button text
                  <input
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                    maxLength={80}
                    value={draft.gagLabel}
                    placeholder="Jagah ki awaaz sunao 🔊"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, gagLabel: event.target.value }))
                    }
                  />
                </label>
              </div>
            </section>
          </div>

          <section className="xl:sticky xl:top-4 xl:self-start">
            <h3 className="mb-2 font-semibold">Visitor preview</h3>
            <div className="relative aspect-video overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
              <img src={background} alt="" className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0" style={{ background: scrim }} aria-hidden />
              <div
                className="absolute inset-x-4 top-[11%] text-center"
                style={{ color: previewTextColor, textShadow: previewTextShadow }}
              >
                <p className="font-deva text-3xl font-bold leading-none sm:text-4xl">
                  {data.scene.titleHi}
                </p>
                <p className="mt-2 text-xs font-bold tracking-[.22em] uppercase">
                  {data.scene.title}
                </p>
              </div>
              <div className="absolute inset-x-4 bottom-[12%] flex flex-col items-center gap-2 text-center">
                <span
                  lang="hi"
                  className="max-w-[21ch] font-vintage-deva text-lg font-black leading-tight"
                  style={{ color: previewTextColor, textShadow: previewTextShadow }}
                >
                  {representative}
                </span>
                <span className="rounded-full bg-black/70 px-3 py-1 text-[10px] text-amber-200">
                  {draft.gagLabel.trim() || "Jagah ki awaaz sunao 🔊"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">Preview only — controls do not play audio.</p>
          </section>
        </div>

        <section className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">One-liners</h3>
              <p className="text-sm text-zinc-400">Short messages shown over this Jagah.</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400">{selectedIds.length} selected</span>
              <button
                type="button"
                className="rounded border border-zinc-600 px-3 py-2"
                disabled={!draft.oneliners.length}
                onClick={() =>
                  setSelectedIds(allSelected ? [] : draft.oneliners.map((line) => line.id))
                }
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <button
                type="button"
                className="rounded border border-red-700 px-3 py-2 text-red-300 disabled:opacity-50"
                disabled={!selectedIds.length}
                onClick={() => removeLines(selectedIds)}
              >
                Remove selected
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {draft.oneliners.map((line) => (
              <div
                key={line.id}
                className="grid gap-2 rounded border border-zinc-700 p-2 sm:grid-cols-[auto_minmax(0,1fr)_9rem_auto]"
              >
                <input
                  type="checkbox"
                  className="mt-3 size-4"
                  aria-label={`Select ${line.text}`}
                  checked={selectedIds.includes(line.id)}
                  onChange={() =>
                    setSelectedIds((current) =>
                      current.includes(line.id)
                        ? current.filter((id) => id !== line.id)
                        : [...current, line.id],
                    )
                  }
                />
                <input
                  className="min-w-0 rounded border border-zinc-600 bg-zinc-950 p-2 text-sm"
                  maxLength={200}
                  value={line.text}
                  aria-label="One-liner text"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      oneliners: current.oneliners.map((item) =>
                        item.id === line.id ? { ...item, text: event.target.value } : item,
                      ),
                    }))
                  }
                />
                <select
                  className="rounded border border-zinc-600 bg-zinc-950 p-2 text-sm"
                  value={line.daypart}
                  aria-label="One-liner daypart"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      oneliners: current.oneliners.map((item) =>
                        item.id === line.id
                          ? { ...item, daypart: event.target.value as Daypart }
                          : item,
                      ),
                    }))
                  }
                >
                  {dayparts.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded border border-zinc-600 text-red-300"
                  aria-label="Remove one-liner"
                  onClick={() => removeLines([line.id])}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}
            {!draft.oneliners.length && (
              <p className="rounded border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                No one-liners yet. Add one or paste a batch below.
              </p>
            )}
          </div>
          <div className="mt-5 rounded border border-zinc-700 bg-zinc-950/50 p-3">
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-amber-300" />
              <h4 className="text-sm font-semibold">Add several at once</h4>
            </div>
            <textarea
              className="mt-2 min-h-24 w-full rounded border border-zinc-600 bg-zinc-950 p-2 text-sm"
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder="Paste one sentence per line"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                className="rounded border border-zinc-600 bg-zinc-950 p-2 text-sm"
                value={bulkDaypart}
                onChange={(event) => setBulkDaypart(event.target.value as Daypart)}
              >
                {dayparts.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                disabled={!bulkText.trim()}
                onClick={addBulk}
              >
                Add to draft
              </button>
            </div>
          </div>
        </section>

        {message && (
          <p className="text-sm text-amber-200" role="status">
            {message}
          </p>
        )}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-zinc-300" role="status">
            <Loader2 className="size-4 animate-spin" />
            {busy}…
          </p>
        )}
        <UnsavedChangesBar
          dirty={dirty}
          saving={Boolean(busy)}
          onSave={() => void save()}
          onDiscard={discard}
          title="Unsaved background changes"
          description="This save includes the image, text color, effect label, and every one-liner change."
        />
      </section>
    </TooltipProvider>
  );
}
