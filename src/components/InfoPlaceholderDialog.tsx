import { useState } from "react";
import { Heart, Lightbulb, Copy, Check, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import himanshuQr from "@/assets/himanshusir_qr.jpeg";

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
  accentHex: "#E5A100", // Amber / Ember
  iconBg: "bg-ember",
  iconText: "text-charcoal",
  accentText: "text-ember",
  badgeBg: "bg-ember/15",
  glowColor: "border-ember/30",
};

const UPI_ID = "8090446627@upi";

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
}: InfoPlaceholderDialogProps) {
  const [copied, setCopied] = useState(false);
  const content = copy[kind];
  const Icon = kind === "support" ? Heart : Lightbulb;
  const theme = defaultTheme;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
              className={`flex flex-col items-center gap-3 rounded-2xl border bg-night/55 p-5 w-full transition-all duration-300 ${theme.glowColor}`}
            >
              <div className="relative overflow-hidden rounded-xl bg-white p-2.5 shadow-xl transition-transform duration-200 hover:scale-[1.02]">
                <img
                  src={himanshuQr}
                  alt="UPI QR Code for 8090446627@upi"
                  className="size-44 object-contain rounded-lg"
                  width={176}
                  height={176}
                />
              </div>

              {/* UPI ID Info with copy button */}
              <div className="flex flex-col items-center gap-1.5 w-full mt-1">
                <span className="text-[10px] tracking-wider text-cream/40 uppercase font-semibold">
                  UPI ID
                </span>
                <div className="flex items-center justify-center gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`group flex items-center justify-between gap-3 w-full px-3.5 py-2 rounded-xl bg-night/80 border border-cream/15 hover:border-cream/30 hover:bg-night transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember`}
                    title="Click to copy UPI ID"
                  >
                    <span
                      className={`font-mono text-sm font-medium select-all transition-colors duration-300 ${theme.accentText}`}
                    >
                      {UPI_ID}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md transition-all duration-200 ${
                        copied
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-cream/10 text-cream/70 group-hover:bg-cream/20 group-hover:text-cream"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* Direct UPI pay link for mobile users */}
              <a
                href={`upi://pay?pa=${UPI_ID}&pn=Sainik%20Dhaba&cu=INR`}
                className="flex sm:hidden items-center gap-1.5 text-xs text-cream/60 hover:text-cream underline underline-offset-4 mt-1 transition-colors"
              >
                <span>Open in UPI App</span>
                <ExternalLink className="size-3" />
              </a>
            </div>

            <p className="text-[11px] leading-relaxed text-cream/50">
              Scan with any UPI app (GPay, PhonePe, Paytm, BHIM) to contribute.
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
