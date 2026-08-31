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
      className="relative overflow-hidden bg-night px-5 py-20 sm:px-10 sm:py-28 lg:px-16 border-b border-cream/5"
    >
      {/* Decorative blurred background blobs for premium aesthetic */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 size-80 rounded-full bg-ember/8 blur-[130px] pointer-events-none" aria-hidden />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 size-96 rounded-full bg-terracotta/6 blur-[150px] pointer-events-none" aria-hidden />

      {/* Background logo watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <img
          src={logoSrc}
          alt=""
          className="size-[min(65vw,380px)] object-contain opacity-[0.03] transition-transform duration-1000 select-none"
          draggable={false}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-[1px] w-8 bg-ember/60" aria-hidden />
          <p className="text-[10px] font-bold tracking-[0.3em] text-ember uppercase sm:text-xs">
            About · {displayName}
          </p>
        </div>

        <h2 className="font-deva text-4xl leading-[1.1] font-bold text-cream sm:text-5xl lg:text-6xl tracking-tight">
          {about.title}
        </h2>
        <p className="mt-4 font-signage text-lg font-semibold text-cream/60 sm:text-xl lg:text-2xl italic leading-relaxed">
          {about.subtitle}
        </p>
        <span className="mt-6 block h-[3px] w-20 rounded-full bg-ember" aria-hidden />
        
        <div className="mt-8 space-y-5">
          {about.paragraphs.map((p, i) => (
            <p 
              key={i} 
              className="text-sm sm:text-base leading-relaxed text-cream/70 tracking-wide font-normal"
            >
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
