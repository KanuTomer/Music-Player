import { getThemeInfo } from "@/lib/theme-data";

type ThemeAboutProps = {
  slug: string;
};

export function ThemeAbout({ slug }: ThemeAboutProps) {
  const info = getThemeInfo(slug);
  if (!info) return null;

  const { about, logoSrc, displayName } = info;

  return (
    <section
      id={`about-${slug}`}
      className="relative overflow-hidden bg-night px-5 py-16 sm:px-10 sm:py-24 lg:px-16"
    >
      {/* Background logo watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <img
          src={logoSrc}
          alt=""
          className="size-[min(70vw,420px)] object-contain opacity-[0.04]"
          draggable={false}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        <p className="mb-3 text-[10px] font-bold tracking-[0.28em] text-ember uppercase sm:text-xs">
          About · {displayName}
        </p>
        <h2 className="font-deva text-4xl leading-[1.05] font-bold text-cream sm:text-5xl">
          {about.title}
        </h2>
        <p className="mt-2 font-signage text-lg font-semibold text-cream/60 sm:text-xl">
          {about.subtitle}
        </p>
        <span className="mt-5 block h-[2px] w-16 rounded-full bg-ember/60" aria-hidden />
        <div className="mt-6 space-y-4">
          {about.paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-cream/70 sm:text-base"
            >
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
