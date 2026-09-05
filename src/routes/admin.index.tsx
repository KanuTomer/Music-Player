import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, UserRound } from "lucide-react";
import { AmbienceAudioPanel } from "@/components/admin/AmbienceAudioPanel";
import { supabase } from "@/integrations/supabase/client";
import { retainComparedSceneIds, sortComparedAnalytics } from "@/lib/admin-analytics";
import {
  addAdminSongs,
  getAdminData,
  previewAdminSongs,
  removeAdminSongs,
  updateAdminSong,
} from "@/lib/admin.functions";

type Range = "7d" | "30d" | "all";
type Section = "songs" | "analytics" | "ambience";
type Draft = {
  input: string;
  title: string;
  artist: string;
  year: number | null;
  providerTitle?: string;
  providerChannel?: string;
};
type Track = {
  membershipId: string;
  trackId: string;
  position: number;
  title: string;
  artist: string | null;
  year: number | null;
  videoId: string;
  sourceUrl: string;
  sharedActiveUses: number;
};
type AmbienceStem = {
  id: string;
  name: string;
  role: "base" | "texture" | "event";
  assetId: string;
  isActive: boolean;
  sortOrder: number;
  defaultVolume: number;
  minGain: number;
  maxGain: number;
  crossfadeMs: number;
  loopStartSeconds: number;
  loopEndSeconds: number | null;
  eventMinSeconds: number | null;
  eventMaxSeconds: number | null;
};
type Ambience = {
  id: string;
  enabled: boolean;
  maxMasterGain: number;
  fadeInMs: number;
  fadeOutMs: number;
  audioTheme: Record<string, Record<string, number>>;
  stems: AmbienceStem[];
};
type Asset = {
  id: string;
  storagePath: string;
  byteSize: number;
  durationSeconds: number;
  publicUrl: string;
};
type Scene = {
  id: string;
  slug: string;
  title: string;
  queueId: string;
  tracks: Track[];
  ambience: Ambience | null;
};
type Analytics = {
  sceneId: string;
  title: string;
  visits: number;
  playedVisits: number;
  listeningSeconds: number;
  averageListeningSeconds: number;
};

const seconds = (value: number) => `${Math.floor(value / 60)}m ${value % 60}s`;
const ADMIN_SIGN_IN_NOTICE_KEY = "sainik-dhaba.admin.sign-in-notice";

export const Route = createFileRoute("/admin/")({ component: AdminPage });

function AdminPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("30d");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [identity, setIdentity] = useState<{
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [expandedSlug, setExpandedSlug] = useState("");
  const [comparedSceneIds, setComparedSceneIds] = useState<string[]>([]);
  const [section, setSection] = useState<Section>("songs");
  const [selected, setSelected] = useState<string[]>([]);
  const [urls, setUrls] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [edit, setEdit] = useState<Track | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [songPage, setSongPage] = useState(0);
  const selectedSlugRef = useRef(selectedSlug);

  const current = scenes.find((scene) => scene.slug === selectedSlug) ?? scenes[0];
  const totalTracks = current?.tracks.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalTracks / rowsPerPage));
  const activeSongPage = Math.min(songPage, pageCount - 1);
  const pageTracks =
    current?.tracks.slice(activeSongPage * rowsPerPage, (activeSongPage + 1) * rowsPerPage) ?? [];
  const comparedAnalytics = sortComparedAnalytics(analytics, comparedSceneIds);
  const singleComparedAnalytics = comparedAnalytics.length === 1 ? comparedAnalytics[0] : null;

  function selectJagah(slug: string) {
    if (slug === current?.slug) {
      setExpandedSlug((previous) => (previous === slug ? "" : slug));
      return;
    }
    const nextScene = scenes.find((scene) => scene.slug === slug);
    setSelectedSlug(slug);
    setExpandedSlug(slug);
    setComparedSceneIds(nextScene ? [nextScene.id] : []);
    setSection("songs");
    setSelected([]);
    setUrls("");
    setDrafts([]);
    setEdit(null);
    setSongPage(0);
    setMessage("");
  }

  useEffect(() => {
    selectedSlugRef.current = selectedSlug;
  }, [selectedSlug]);

  const load = useCallback(async () => {
    setBusy(true);
    setBusyAction("Loading admin data");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        void navigate({ to: "/admin/login" });
        return;
      }
      const result = await getAdminData({ data: { range } });
      setScenes(result.scenes as Scene[]);
      setAnalytics(result.analytics as Analytics[]);
      setAssets(result.assets as Asset[]);
      setIdentity(result.identity);
      setSelectedSlug((previous) => previous || result.scenes[0]?.slug || "");
      setComparedSceneIds((previous) => {
        const defaultScene =
          result.scenes.find((scene) => scene.slug === selectedSlugRef.current) ?? result.scenes[0];
        return retainComparedSceneIds(
          previous,
          result.scenes.map((scene) => scene.id),
          defaultScene?.id,
        );
      });
      setSelected([]);
      setExpandedSlug((previous) => previous || result.scenes[0]?.slug || "");
      setMessage("");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to load admin data";
      if (/sign in|administrator|session/i.test(text)) {
        window.sessionStorage.setItem(
          ADMIN_SIGN_IN_NOTICE_KEY,
          "Your sign-in session expired. Please sign in again.",
        );
        try {
          await supabase.auth.signOut();
        } finally {
          await navigate({ to: "/admin/login" });
        }
        return;
      }
      setMessage(text);
    } finally {
      setBusy(false);
      setBusyAction("");
    }
  }, [navigate, range]);

  function toggleComparedScene(sceneId: string) {
    setComparedSceneIds((ids) =>
      ids.includes(sceneId) ? ids.filter((id) => id !== sceneId) : [...ids, sceneId],
    );
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function preview() {
    const inputs = urls
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!inputs.length) return;
    setBusy(true);
    setBusyAction("Previewing import");
    try {
      setDrafts(await previewAdminSongs({ data: { inputs } }));
      setMessage("Review the imported metadata before saving.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to preview songs");
    } finally {
      setBusy(false);
      setBusyAction("");
    }
  }

  async function saveDrafts() {
    if (!current || !drafts.length) return;
    setBusy(true);
    setBusyAction("Adding songs");
    try {
      await addAdminSongs({ data: { queueId: current.queueId, songs: drafts } });
      setUrls("");
      setDrafts([]);
      await load();
      setMessage("Songs added to the active Jagah queue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add songs");
    } finally {
      setBusy(false);
      setBusyAction("");
    }
  }

  async function removeSelected() {
    if (
      !current ||
      !selected.length ||
      !window.confirm(`Remove ${selected.length} song(s) from ${current.title}?`)
    )
      return;
    setBusy(true);
    setBusyAction("Removing songs");
    try {
      await removeAdminSongs({ data: { queueId: current.queueId, membershipIds: selected } });
      await load();
      setMessage("Selected songs removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove songs");
    } finally {
      setBusy(false);
      setBusyAction("");
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;
    const form = new FormData(event.currentTarget);
    const scope =
      edit.sharedActiveUses > 1 &&
      !window.confirm(
        `This song is used by ${edit.sharedActiveUses} active Jagahs. OK updates all of them; Cancel edits only ${current?.title}.`,
      )
        ? "local"
        : "shared";
    setBusy(true);
    setBusyAction("Saving song");
    try {
      await updateAdminSong({
        data: {
          membershipId: edit.membershipId,
          title: String(form.get("title")),
          artist: String(form.get("artist")),
          year: form.get("year") ? Number(form.get("year")) : null,
          source: String(form.get("source")),
          scope,
        },
      });
      setEdit(null);
      await load();
      setMessage(
        scope === "shared"
          ? "Shared song data updated."
          : "A Jagah-specific song copy was created.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update the song");
    } finally {
      setBusy(false);
      setBusyAction("");
    }
  }

  return (
    <main
      className="min-h-dvh bg-zinc-950 p-4 text-zinc-100 [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed md:p-8"
      aria-busy={busy}
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-700 pb-4">
        <div>
          <h1 className="text-xl font-bold">Sainik Dhaba admin</h1>
          <p className="text-sm text-amber-300">Catalogue and analytics</p>
        </div>
        <details className="relative">
          <summary className="flex list-none items-center gap-2 rounded border border-zinc-600 px-3 py-2 text-sm">
            {identity?.avatarUrl ? (
              <img className="size-6 rounded-full" src={identity.avatarUrl} alt="" />
            ) : (
              <span className="grid size-6 place-items-center rounded-full bg-amber-600 text-xs font-bold text-zinc-950">
                {(identity?.displayName ?? identity?.email ?? "A").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="max-w-44 truncate">
              {identity?.displayName ?? identity?.email ?? "Administrator"}
            </span>
            <ChevronDown className="size-4" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-64 rounded border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
            <div className="flex items-center gap-2 text-sm">
              <UserRound className="size-4 text-amber-300" />
              <span className="truncate">{identity?.email ?? "Administrator"}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">Administrator account</p>
            <button
              className="mt-3 w-full rounded border border-zinc-600 px-3 py-2 text-sm"
              onClick={() =>
                void supabase.auth.signOut().then(() => navigate({ to: "/admin/login" }))
              }
            >
              Log out
            </button>
          </div>
        </details>
      </header>
      <section className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Jagah administration">
          <h2 className="mb-3 font-semibold">Jagahs</h2>
          <ul className="space-y-2">
            {scenes.map((scene) => (
              <li key={scene.id}>
                <button
                  type="button"
                  className={`flex min-h-11 w-full items-center justify-between gap-2 rounded border px-3 py-2 text-left text-sm disabled:opacity-60 ${current?.id === scene.id ? "border-amber-500 bg-zinc-800" : "border-zinc-700 hover:bg-zinc-900"}`}
                  aria-expanded={expandedSlug === scene.slug}
                  aria-controls={`jagah-menu-${scene.id}`}
                  disabled={busy}
                  onClick={() => selectJagah(scene.slug)}
                >
                  <span>{scene.title}</span>
                  <span aria-hidden className="text-zinc-400">
                    {expandedSlug === scene.slug ? "▾" : "▸"}
                  </span>
                </button>
                {expandedSlug === scene.slug ? (
                  <ul
                    id={`jagah-menu-${scene.id}`}
                    className="mt-1 ml-3 space-y-1 border-l border-zinc-700 pl-2"
                  >
                    {(
                      [
                        { id: "songs", label: "Songs" },
                        { id: "analytics", label: "Analytics" },
                        { id: "ambience", label: "Ambience audio" },
                      ] as const
                    ).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`min-h-10 w-full rounded px-3 py-2 text-left text-sm ${section === item.id ? "bg-zinc-800 font-semibold text-amber-300" : "text-zinc-300 hover:bg-zinc-900"}`}
                          aria-current={section === item.id ? "page" : undefined}
                          onClick={() => setSection(item.id)}
                        >
                          {item.label}
                          {item.id === "songs" ? ` (${scene.tracks.length})` : ""}
                        </button>
                      </li>
                    ))}
                    {["Background", "Ambience visual"].map((label) => (
                      <li key={label}>
                        <button
                          type="button"
                          disabled
                          className="min-h-10 w-full cursor-not-allowed rounded px-3 py-2 text-left text-sm text-zinc-500"
                        >
                          {label}
                          <span className="block text-xs">Coming later</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          {!scenes.length ? (
            <p className="text-sm text-zinc-400">
              {busy ? "Loading Jagahs…" : "No Jagahs available."}
            </p>
          ) : null}
        </nav>
        <div className="min-w-0">
          <p className="mb-3 text-sm text-zinc-400">
            Jagahs / {current?.title ?? "…"} /{" "}
            {section === "songs"
              ? "Songs"
              : section === "analytics"
                ? "Analytics"
                : "Ambience audio"}
          </p>
          {section === "ambience" && current ? (
            <AmbienceAudioPanel scene={current} assets={assets} onChanged={load} />
          ) : section === "analytics" ? (
            <section aria-labelledby="jagah-analytics-title">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="jagah-analytics-title" className="font-semibold">
                  {current?.title} analytics
                </h2>
                <label className="flex items-center gap-2 text-sm">
                  Period
                  <select
                    className="rounded border border-zinc-600 bg-zinc-900 p-2"
                    value={range}
                    disabled={busy}
                    onChange={(event) => setRange(event.target.value as Range)}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>
                </label>
              </div>
              <fieldset className="mb-5 rounded border border-zinc-700 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <legend className="px-1 text-sm font-medium">Compare Jagahs</legend>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border border-zinc-600 px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => setComparedSceneIds(scenes.map((scene) => scene.id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="rounded border border-zinc-600 px-2 py-1 text-xs"
                      disabled={busy || !comparedSceneIds.length}
                      onClick={() => setComparedSceneIds([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {scenes.map((scene) => (
                    <label
                      key={scene.id}
                      className="flex min-h-10 items-center gap-2 rounded border border-zinc-700 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={comparedSceneIds.includes(scene.id)}
                        disabled={busy}
                        onChange={() => toggleComparedScene(scene.id)}
                      />
                      <span>{scene.title}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {comparedAnalytics.length === 1 ? (
                <>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Visits", singleComparedAnalytics?.visits ?? 0],
                      ["Played visits", singleComparedAnalytics?.playedVisits ?? 0],
                      ["Total listening", seconds(singleComparedAnalytics?.listeningSeconds ?? 0)],
                      [
                        "Average listening time",
                        seconds(singleComparedAnalytics?.averageListeningSeconds ?? 0),
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded border border-zinc-700 p-4">
                        <dt className="text-sm text-zinc-400">{label}</dt>
                        <dd className="mt-2 text-2xl font-semibold">{busy ? "…" : value}</dd>
                      </div>
                    ))}
                  </dl>
                  {!busy && !singleComparedAnalytics?.visits ? (
                    <p className="mt-2 text-sm text-zinc-400">
                      No visits recorded for this Jagah in the selected period.
                    </p>
                  ) : null}
                </>
              ) : comparedAnalytics.length > 1 ? (
                <div className="overflow-x-auto rounded border border-zinc-700">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-700 text-zinc-400">
                      <tr>
                        <th className="p-3">Jagah</th>
                        <th className="p-3">Visits</th>
                        <th className="p-3">Played visits</th>
                        <th className="p-3">Total listening</th>
                        <th className="p-3">Average listening</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparedAnalytics.map((row) => (
                        <tr key={row.sceneId} className="border-b border-zinc-800 last:border-0">
                          <td className="p-3 font-medium">{row.title}</td>
                          <td className="p-3">{busy ? "…" : row.visits}</td>
                          <td className="p-3">{busy ? "…" : row.playedVisits}</td>
                          <td className="p-3">{busy ? "…" : seconds(row.listeningSeconds)}</td>
                          <td className="p-3">
                            {busy ? "…" : seconds(row.averageListeningSeconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                  Select at least one Jagah to view analytics.
                </p>
              )}
              <p className="mt-4 text-sm text-zinc-400">
                Average listening time is calculated across visits that played music.
              </p>
            </section>
          ) : (
            <section aria-label={`${current?.title ?? "Jagah"} songs`}>
              <h2 className="font-semibold">{current?.title ?? "Loading…"} song library</h2>
              <div className="mt-3 rounded border border-zinc-700 p-3">
                <label className="block text-sm font-medium">Add one or more YouTube links</label>
                <textarea
                  className="mt-2 min-h-24 w-full rounded border border-zinc-600 bg-zinc-900 p-2 text-sm"
                  value={urls}
                  onChange={(event) => setUrls(event.target.value)}
                  placeholder="One URL per line"
                />
                <button
                  className="mt-2 rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => void preview()}
                >
                  {busyAction === "Previewing import" ? "Previewing…" : "Preview import"}
                </button>
                {drafts.length ? (
                  <div className="mt-4 space-y-2">
                    {drafts.map((draft, index) => (
                      <div
                        key={`${draft.input}-${index}`}
                        className="grid gap-2 rounded border border-zinc-700 p-2 md:grid-cols-4"
                      >
                        <input
                          className="rounded border border-zinc-600 bg-zinc-900 p-2 text-sm"
                          value={draft.title}
                          placeholder="Title"
                          onChange={(event) =>
                            setDrafts((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, title: event.target.value } : item,
                              ),
                            )
                          }
                        />
                        <input
                          className="rounded border border-zinc-600 bg-zinc-900 p-2 text-sm"
                          value={draft.artist}
                          placeholder="Artist"
                          onChange={(event) =>
                            setDrafts((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, artist: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                        <input
                          className="rounded border border-zinc-600 bg-zinc-900 p-2 text-sm"
                          type="number"
                          value={draft.year ?? ""}
                          placeholder="Year"
                          onChange={(event) =>
                            setDrafts((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      year: event.target.value ? Number(event.target.value) : null,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                        <span className="truncate p-2 text-xs text-zinc-400">{draft.input}</span>
                      </div>
                    ))}
                    <button
                      className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
                      disabled={busy}
                      onClick={() => void saveDrafts()}
                    >
                      {busyAction === "Adding songs"
                        ? "Adding songs…"
                        : `Add ${drafts.length} song(s)`}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">{selected.length} selected</p>
                <div className="flex gap-2">
                  <button
                    className="rounded border border-zinc-600 px-3 py-2 text-sm"
                    disabled={busy || !totalTracks}
                    onClick={() =>
                      setSelected(
                        selected.length === totalTracks
                          ? []
                          : (current?.tracks.map((track) => track.membershipId) ?? []),
                      )
                    }
                  >
                    {selected.length === totalTracks && totalTracks
                      ? "Deselect all"
                      : `Select all (${totalTracks})`}
                  </button>
                  <button
                    className="rounded bg-red-700 px-3 py-2 text-sm disabled:opacity-60"
                    disabled={!selected.length || busy}
                    onClick={() => void removeSelected()}
                  >
                    {busyAction === "Removing songs" ? "Removing…" : "Remove selected"}
                  </button>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-700 text-zinc-400">
                    <tr>
                      <th className="p-2"></th>
                      <th className="p-2">#</th>
                      <th className="p-2">Song</th>
                      <th className="p-2">Year</th>
                      <th className="p-2">YouTube</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageTracks.map((track) => (
                      <tr key={track.membershipId} className="border-b border-zinc-800">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selected.includes(track.membershipId)}
                            onChange={(event) =>
                              setSelected((items) =>
                                event.target.checked
                                  ? [...items, track.membershipId]
                                  : items.filter((id) => id !== track.membershipId),
                              )
                            }
                          />
                        </td>
                        <td className="p-2">{track.position}</td>
                        <td className="p-2">
                          <div>{track.title}</div>
                          <div className="text-zinc-400">
                            {track.artist ?? "—"}
                            {track.sharedActiveUses > 1
                              ? ` · shared by ${track.sharedActiveUses}`
                              : ""}
                          </div>
                        </td>
                        <td className="p-2">{track.year ?? "—"}</td>
                        <td className="p-2">
                          <a
                            className="text-amber-300 underline"
                            href={track.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {track.videoId}
                          </a>
                        </td>
                        <td className="p-2">
                          <button
                            className="rounded border border-zinc-600 px-2 py-1"
                            onClick={() => setEdit(track)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
                <label className="flex items-center gap-2">
                  Rows
                  <select
                    className="rounded border border-zinc-600 bg-zinc-900 p-2 text-zinc-100"
                    value={rowsPerPage}
                    disabled={busy}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setSongPage(0);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <span>
                  {totalTracks
                    ? `${activeSongPage * rowsPerPage + 1}–${Math.min(totalTracks, (activeSongPage + 1) * rowsPerPage)} of ${totalTracks}`
                    : "No songs"}
                </span>
                <div className="flex gap-2">
                  <button
                    className="rounded border border-zinc-600 px-3 py-2"
                    disabled={busy || activeSongPage === 0}
                    onClick={() => setSongPage((page) => Math.max(0, page - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="rounded border border-zinc-600 px-3 py-2"
                    disabled={busy || activeSongPage >= pageCount - 1}
                    onClick={() => setSongPage((page) => Math.min(pageCount - 1, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
      {edit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <form className="w-full max-w-lg space-y-3 rounded bg-zinc-900 p-5" onSubmit={saveEdit}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Edit song</h2>
              <button type="button" className="text-zinc-400" onClick={() => setEdit(null)}>
                Close
              </button>
            </div>
            <label className="block text-sm">
              Title
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                name="title"
                defaultValue={edit.title}
                required
              />
            </label>
            <label className="block text-sm">
              Artist
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                name="artist"
                defaultValue={edit.artist ?? ""}
              />
            </label>
            <label className="block text-sm">
              Year
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                name="year"
                type="number"
                defaultValue={edit.year ?? ""}
              />
            </label>
            <label className="block text-sm">
              YouTube URL or video ID
              <input
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 p-2"
                name="source"
                defaultValue={edit.sourceUrl}
                required
              />
            </label>
            {edit.sharedActiveUses > 1 ? (
              <p className="text-xs text-amber-300">
                This record is shared. Saving will ask whether to update all Jagahs or create a
                local copy.
              </p>
            ) : null}
            <button
              className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-zinc-950"
              disabled={busy}
              type="submit"
            >
              {busyAction === "Saving song" ? (
                <>
                  <Loader2 className="mr-1 inline size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </form>
        </div>
      ) : null}
      {message ? (
        <p
          className="fixed bottom-4 right-4 max-w-md rounded bg-zinc-800 p-3 text-sm shadow-lg"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {busyAction ? (
        <p
          className="fixed bottom-4 left-4 rounded bg-zinc-800 p-3 text-sm shadow-lg"
          role="status"
        >
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          {busyAction}…
        </p>
      ) : null}
    </main>
  );
}
