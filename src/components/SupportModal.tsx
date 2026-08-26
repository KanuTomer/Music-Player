import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import supportQr from "@/assets/support-phonepe-qr.jpeg.asset.json";
import { usePlayer } from "@/lib/player";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FIFTEEN_MINUTES = 15 * 60;
const ELAPSED_KEY = "sainik-dhaba:listening-seconds";
const SHOWN_KEY = "sainik-dhaba:support-shown";

function readNumber(key: string) {
  const value = window.localStorage.getItem(key);
  const parsed = value ? Number(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function SupportModal() {
  const { isPlaying } = usePlayer();
  const [open, setOpen] = useState(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (window.localStorage.getItem(SHOWN_KEY) === "true") return;
    elapsedRef.current = readNumber(ELAPSED_KEY);
    if (elapsedRef.current >= FIFTEEN_MINUTES) setOpen(true);
  }, []);

  useEffect(() => {
    if (!isPlaying || open || window.localStorage.getItem(SHOWN_KEY) === "true") return;

    let lastTick = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      elapsedRef.current += Math.max(0, (now - lastTick) / 1000);
      lastTick = now;
      window.localStorage.setItem(ELAPSED_KEY, String(elapsedRef.current));

      if (elapsedRef.current >= FIFTEEN_MINUTES) {
        setOpen(true);
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPlaying, open]);

  const dismiss = () => {
    window.localStorage.setItem(SHOWN_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && dismiss()}>
      <DialogContent className="paper w-[calc(100%-1.5rem)] max-w-sm overflow-hidden rounded-md border-2 border-ink bg-cream p-4 text-ink shadow-lift sm:p-5">
        <DialogHeader className="relative z-10 items-center space-y-2 text-center">
          <span
            className="flex size-10 items-center justify-center rounded-full bg-terracotta text-primary-foreground"
            aria-hidden
          >
            <Heart className="size-5" />
          </span>
          <DialogTitle className="font-vintage-deva text-2xl leading-tight">
            सैनिक ढाबा को चलता रखें
          </DialogTitle>
          <DialogDescription className="max-w-xs text-center font-cinema-body text-sm leading-relaxed text-ink/75">
            इस प्लेटफ़ॉर्म को चलाने में काफ़ी सर्वर खर्च आता है। हम इसे बिना विज्ञापन के मुफ़्त रखना
            चाहते हैं। QR से सहयोग करके हमारा साथ दें।
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-10 mx-auto w-full max-w-[16rem] border-2 border-ink bg-background p-2 shadow-tile">
          <img
            src={supportQr.url}
            alt="PhonePe support payment QR code"
            width={792}
            height={768}
            className="aspect-square w-full object-contain"
          />
        </div>

        <p className="relative z-10 text-center font-vintage-deva text-sm text-ink/65">
          स्कैन करें और अपनी इच्छा से सहयोग दें
        </p>

        <DialogFooter className="relative z-10 sm:justify-center">
          <Button
            type="button"
            onClick={dismiss}
            className="h-11 w-full rounded-md bg-terracotta text-primary-foreground hover:bg-terracotta/90 sm:w-auto sm:min-w-36"
          >
            अभी नहीं
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
