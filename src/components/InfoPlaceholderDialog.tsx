import { Heart, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type InfoPlaceholderDialogProps = {
  kind: "suggest" | "support";
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const copy = {
  suggest: {
    title: "Suggest a Jagah",
    description:
      "Soon you’ll be able to suggest the places, sounds and memories that deserve their own room. We’re shaping the format before opening submissions.",
  },
  support: {
    title: "Support Us",
    description:
      "Sainik Dhaba is being built as an independent listening space. Support options will appear here only when they are ready and transparent.",
  },
} as const;

export function InfoPlaceholderDialog({ kind, open, onOpenChange }: InfoPlaceholderDialogProps) {
  const content = copy[kind];
  const Icon = kind === "support" ? Heart : Lightbulb;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-2xl border-cream/15 bg-charcoal p-6 text-cream shadow-2xl">
        <span className="flex size-11 items-center justify-center rounded-full bg-ember text-charcoal">
          <Icon className="size-5" aria-hidden />
        </span>
        <DialogTitle className="font-signage text-2xl text-cream">{content.title}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-cream/65">
          {content.description}
        </DialogDescription>
        <p className="text-xs font-semibold tracking-[0.18em] text-teal-deep uppercase">
          Coming in a later milestone
        </p>
      </DialogContent>
    </Dialog>
  );
}
