import { Heart, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type InfoPlaceholderDialogProps = {
  kind: "suggest" | "support";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug?: string;
};

type DialogTheme = {
  accentHex: string;
  iconBg: string;
  iconText: string;
  accentText: string;
  badgeBg: string;
  glowColor: string;
};

const themeConfigs: Record<string, DialogTheme> = {
  "sainik-dhaba": {
    accentHex: "#E5A100", // Amber
    iconBg: "bg-ember",
    iconText: "text-charcoal",
    accentText: "text-ember",
    badgeBg: "bg-ember/15",
    glowColor: "border-ember/30",
  },
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
      "An independent, ad-free space built on warm nostalgia. If the music kept you company today, scan this QR code with GPay, PhonePe, Paytm or any UPI app to help keep our virtual kettle boiling!",
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
  const theme = themeConfigs[slug ?? ""] ?? themeConfigs["sainik-dhaba"];

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

            {/* QR Code Container styled with the active theme */}
            <div
              className={`flex flex-col items-center gap-2 rounded-2xl border bg-night/45 p-5 w-full transition-all duration-300 ${theme.glowColor}`}
            >
              <svg
                width="160"
                height="160"
                viewBox="0 0 100 100"
                className="bg-white p-3 rounded-xl shadow-lg"
                aria-label="Payment QR Code Placeholder"
              >
                {/* Corner locator square Top-Left */}
                <rect x="5" y="5" width="20" height="20" fill="#18181B" rx="2" />
                <rect x="9" y="9" width="12" height="12" fill="#FFFFFF" rx="1" />
                <rect x="12" y="12" width="6" height="6" fill="#18181B" rx="0.5" />

                {/* Corner locator square Top-Right */}
                <rect x="75" y="5" width="20" height="20" fill="#18181B" rx="2" />
                <rect x="79" y="9" width="12" height="12" fill="#FFFFFF" rx="1" />
                <rect x="82" y="12" width="6" height="6" fill="#18181B" rx="0.5" />

                {/* Corner locator square Bottom-Left */}
                <rect x="5" y="75" width="20" height="20" fill="#18181B" rx="2" />
                <rect x="9" y="79" width="12" height="12" fill="#FFFFFF" rx="1" />
                <rect x="12" y="82" width="6" height="6" fill="#18181B" rx="0.5" />

                {/* Central logo box / badge with room accent fill */}
                <rect
                  x="40"
                  y="40"
                  width="20"
                  height="20"
                  fill={theme.accentHex}
                  rx="3"
                  className="transition-all duration-300"
                />
                {/* Radio Icon / Emoji in center */}
                <text x="50" y="53" fontSize="10" textAnchor="middle" dominantBaseline="middle">
                  📻
                </text>

                {/* QR dot grids/clusters */}
                <rect x="35" y="5" width="4" height="8" fill="#18181B" />
                <rect x="45" y="5" width="8" height="4" fill="#18181B" />
                <rect x="60" y="5" width="4" height="4" fill="#18181B" />
                <rect x="35" y="15" width="8" height="4" fill="#18181B" />
                <rect x="50" y="15" width="4" height="8" fill="#18181B" />
                <rect x="65" y="15" width="4" height="4" fill="#18181B" />
                <rect x="60" y="21" width="8" height="4" fill="#18181B" />
                <rect x="75" y="35" width="4" height="8" fill="#18181B" />
                <rect x="85" y="35" width="8" height="4" fill="#18181B" />
                <rect x="75" y="48" width="8" height="4" fill="#18181B" />
                <rect x="88" y="48" width="4" height="8" fill="#18181B" />
                <rect x="80" y="60" width="12" height="4" fill="#18181B" />
                <rect x="35" y="75" width="4" height="8" fill="#18181B" />
                <rect x="45" y="75" width="8" height="4" fill="#18181B" />
                <rect x="60" y="75" width="4" height="4" fill="#18181B" />
                <rect x="35" y="87" width="8" height="4" fill="#18181B" />
                <rect x="50" y="87" width="4" height="8" fill="#18181B" />
                <rect x="65" y="87" width="4" height="4" fill="#18181B" />
                <rect x="60" y="93" width="8" height="4" fill="#18181B" />
                <rect x="5" y="35" width="8" height="4" fill="#18181B" />
                <rect x="18" y="35" width="4" height="8" fill="#18181B" />
                <rect x="5" y="48" width="4" height="8" fill="#18181B" />
                <rect x="15" y="48" width="8" height="4" fill="#18181B" />
                <rect x="10" y="60" width="12" height="4" fill="#18181B" />
                <rect x="30" y="30" width="4" height="4" fill="#18181B" />
                <rect x="66" y="30" width="4" height="4" fill="#18181B" />
                <rect x="30" y="66" width="4" height="4" fill="#18181B" />
                <rect x="66" y="66" width="4" height="4" fill="#18181B" />
              </svg>

              {/* UPI ID Info with room accent color */}
              <div className="text-center mt-1">
                <span className="block text-[10px] tracking-wider text-cream/40 uppercase font-semibold">
                  UPI ID
                </span>
                <span
                  className={`block font-mono text-sm select-all transition-colors duration-300 ${theme.accentText}`}
                >
                  support@upi
                </span>
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-cream/45 italic">
              *This is a mock QR code for presentation. Real payment integration will be enabled
              soon.
            </p>
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
