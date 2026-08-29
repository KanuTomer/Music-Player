import { Heart } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-cream/10 bg-night px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
      <div className="mx-auto max-w-[1440px]">
        {/* Top area — branding + nav */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <span className="block font-deva text-2xl leading-none font-bold text-cream">
              सैनिक ढाबा
            </span>
            <span className="mt-1 block text-[10px] font-semibold tracking-[0.24em] text-cream/45 uppercase">
              Sainik Dhaba
            </span>
            <p className="mt-3 text-xs leading-relaxed text-cream/50">
              An always-on radio for the places India grew up in — barbershops, night buses,
              highway dhabas. Press play and sit there a while.
            </p>
          </div>

          {/* Navigation columns */}
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-ember uppercase">
                Jagahs
              </p>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "Deluxe Salon", slug: "nai-ki-dukaan" },
                  { label: "Corporate Majdoor", slug: "corporate-majdoor" },
                  { label: "Raat Ki Bus", slug: "raat-ki-bus" },
                  { label: "Chai Ki Tapri", slug: "chai-ki-tapri" },
                ].map((item) => (
                  <li key={item.slug}>
                    <a
                      href={`/room/${item.slug}`}
                      className="text-xs text-cream/55 transition-colors hover:text-cream"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-ember uppercase">
                &nbsp;
              </p>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "Raj Mistri", slug: "raj-mistri" },
                  { label: "Sainik Dhaba", slug: "sainik-dhaba" },
                  { label: "Door Darshan", slug: "doordarshan-shaam" },
                ].map((item) => (
                  <li key={item.slug}>
                    <a
                      href={`/room/${item.slug}`}
                      className="text-xs text-cream/55 transition-colors hover:text-cream"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 h-px bg-cream/8" aria-hidden />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[11px] text-cream/35">
            © {year} Sainik Dhaba. Made with{" "}
            <Heart className="inline size-3 text-ember" aria-label="love" /> in India.
          </p>

          <button
            type="button"
            onClick={() => {
              const container = document.getElementById("room-experience-top");
              if (container) {
                container.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-cream/45 hover:text-ember transition-colors cursor-pointer uppercase"
          >
            Upar chalo · Back to Top ↑
          </button>

          <p className="text-[11px] text-cream/30">
            An always-on ambient listening experience.
          </p>
        </div>
      </div>
    </footer>
  );
}
