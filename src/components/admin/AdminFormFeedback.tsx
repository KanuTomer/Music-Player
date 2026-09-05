import { CircleHelp, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-grid size-6 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label={`About ${label}`}
        >
          <CircleHelp className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-balance leading-relaxed" sideOffset={6}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

export function UnsavedChangesBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      className={`sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-2xl backdrop-blur ${
        dirty
          ? "border-amber-500/70 bg-zinc-900/95"
          : "border-zinc-700 bg-zinc-950/90 text-zinc-400"
      }`}
      role="status"
    >
      <div>
        <p className={`text-sm font-semibold ${dirty ? "text-amber-300" : "text-zinc-300"}`}>
          {dirty ? "Unsaved mix changes" : "All mix changes saved"}
        </p>
        <p className="text-xs text-zinc-400">
          This save includes playback controls and Base, Texture, and Effect EQ.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-50"
          disabled={!dirty || saving}
          onClick={onDiscard}
        >
          Discard
        </button>
        <button
          type="button"
          className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          disabled={!dirty || saving}
          onClick={onSave}
        >
          {saving ? (
            <>
              <Loader2 className="mr-1 inline size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </div>
  );
}

export function DiscardChangesDialog({
  open,
  description,
  onStay,
  onDiscard,
}: {
  open: boolean;
  description?: string;
  onStay: () => void;
  onDiscard: () => void;
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              "You have edits that have not been saved. Discard them to continue, or stay here to finish saving."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>Stay and review</AlertDialogCancel>
          <AlertDialogAction className="bg-red-700 text-white hover:bg-red-600" onClick={onDiscard}>
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
