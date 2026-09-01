import { Heart, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type InfoPlaceholderDialogProps = {
  kind: "suggest" | "support";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug?: string | null;
};

type DialogTheme = {
  accentHex: string;
  iconBg: string;
  iconText: string;
  accentText: string;
  badgeBg: string;
  glowColor: string;
};

const defaultTheme: DialogTheme = {
  accentHex: "#E5A100", // Amber
  iconBg: "bg-ember",
  iconText: "text-charcoal",
  accentText: "text-ember",
  badgeBg: "bg-ember/15",
  glowColor: "border-ember/30",
};

const themeConfigs: Record<string, DialogTheme> = {
  "sainik-dhaba": defaultTheme,
  "nai-ki-dukaan": {
    accentHex: "#0E5E63", // Cool Teal
    iconBg: "bg-teal-600",
    iconText: "text-cream",
    accentText: "text-teal-400",
    badgeBg: "bg-teal-500/15",
    glowColor: "border-teal-500/30",
  },
  "bus-driver": {
    accentHex: "#E5A100", // Dark Slate/Yellow
    iconBg: "bg-amber-600",
    iconText: "text-charcoal",
    accentText: "text-amber-400",
    badgeBg: "bg-amber-500/15",
    glowColor: "border-amber-500/30",
  },
  "bartan-time": {
    accentHex: "#6B7B53", // Sage Green
    iconBg: "bg-emerald-700",
    iconText: "text-cream",
    accentText: "text-emerald-400",
    badgeBg: "bg-emerald-500/15",
    glowColor: "border-emerald-500/30",
  },
  "papa-ke-gaane": {
    accentHex: "#C1440E", // Warm TV Red
    iconBg: "bg-red-700",
    iconText: "text-cream",
    accentText: "text-red-400",
    badgeBg: "bg-red-500/15",
    glowColor: "border-red-500/30",
  },
  "raj-mistri": {
    accentHex: "#C1440E", // Terracotta/Brick
    iconBg: "bg-orange-600",
    iconText: "text-cream",
    accentText: "text-orange-400",
    badgeBg: "bg-orange-500/15",
    glowColor: "border-orange-500/30",
  },
  "corporate-majdoor": {
    accentHex: "#0E5E63", // Deep Blue/Teal
    iconBg: "bg-indigo-600",
    iconText: "text-cream",
    accentText: "text-indigo-400",
    badgeBg: "bg-indigo-500/15",
    glowColor: "border-indigo-500/30",
  },
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
      "Sainik Dhaba is an independent, ad-free space built on warm nostalgia. A transparent way to support the project will be added after the product and payment flow are approved.",
  },
} as const;

export function InfoPlaceholderDialog({
  kind,
  open,
  onOpenChange,
  slug,
}: InfoPlaceholderDialogProps) {
  const content = copy[kind];
  const Icon = kind === "support" ? Heart : Lightbulb;
  const theme = (slug ? themeConfigs[slug] : undefined) ?? defaultTheme;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`w-[calc(100%-1.5rem)] max-w-md rounded-2xl border-cream/15 bg-charcoal p-6 text-cream shadow-2xl transition-all duration-300`}
      >
        {kind === "support" ? (
          <div className="flex flex-col items-center text-center gap-4">
            <span
              className={`flex size-11 items-center justify-center rounded-full ${theme.iconBg} ${theme.iconText} transition-colors duration-300`}
            >
              <Heart className="size-5 fill-current" aria-hidden />
            </span>
            <div className="space-y-1">
              <DialogTitle className="font-signage text-2xl text-cream">
                {content.title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-cream/65">
                {content.description}
              </DialogDescription>
            </div>

            <div
              className={`flex w-full flex-col items-center gap-3 rounded-2xl border bg-night/55 p-5 transition-all duration-300 ${theme.glowColor}`}
            >
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.18em] uppercase ${theme.badgeBg} ${theme.accentText}`}
              >
                Coming soon
              </span>
              <p className="max-w-xs text-xs leading-relaxed text-cream/55">
                No payment details or transaction actions are enabled in this Preview.
              </p>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
