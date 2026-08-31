import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getThemeInfo } from "@/lib/theme-data";

type ThemeFAQProps = {
  slug: string;
};

export function ThemeFAQ({ slug }: ThemeFAQProps) {
  const info = getThemeInfo(slug);
  if (!info) return null;

  const { faq, displayName } = info;

  return (
    <section
      id={`faq-${slug}`}
      className="relative overflow-hidden bg-charcoal px-5 py-20 sm:px-10 sm:py-28 lg:px-16"
    >
      {/* Background glowing blob for visual interest */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 size-80 rounded-full bg-mustard/4 blur-[130px] pointer-events-none" aria-hidden />

      <div className="mx-auto max-w-4xl relative z-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-[1px] w-8 bg-ember/60" aria-hidden />
          <p className="text-[10px] font-bold tracking-[0.3em] text-ember uppercase sm:text-xs">
            FAQ · {displayName}
          </p>
        </div>

        <h2 className="font-deva text-3.5xl leading-[1.15] font-bold text-cream sm:text-5xl lg:text-5xl tracking-tight">
          Aksar puchhe jaane waale sawaal
        </h2>
        <p className="mt-3 text-sm font-medium text-cream/60 sm:text-base lg:text-lg">
          Everything you wanted to know about {displayName}
        </p>
        <span className="mt-6 block h-[3px] w-20 rounded-full bg-ember" aria-hidden />

        <div className="mt-10 space-y-4">
          {faq.map((item, index) => (
            <FAQItem key={index} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 backdrop-blur-md overflow-hidden ${
        open 
          ? "border-ember/45 bg-[#200D02]/60 shadow-lg translate-y-[-2px] border-l-4 border-l-ember" 
          : "border-cream/10 bg-night/20 hover:border-cream/25 hover:bg-night/35 hover:translate-y-[-1px]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-inset rounded-2xl cursor-pointer"
        aria-expanded={open}
      >
        <span className={`text-sm font-bold sm:text-base transition-colors duration-250 ${open ? "text-amber-400" : "text-cream/90"}`}>
          {question}
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-cream/50 transition-transform duration-300 ${
            open ? "rotate-180 text-amber-400" : "group-hover:text-cream"
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-sm leading-relaxed text-cream/75 sm:text-base border-t border-cream/5 pt-3 mt-1">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
