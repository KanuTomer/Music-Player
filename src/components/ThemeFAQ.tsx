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
      className="relative overflow-hidden bg-charcoal px-5 py-16 sm:px-10 sm:py-24 lg:px-16"
    >
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[10px] font-bold tracking-[0.28em] text-ember uppercase sm:text-xs">
          FAQ · {displayName}
        </p>
        <h2 className="font-deva text-3xl leading-[1.1] font-bold text-cream sm:text-4xl">
          Aksar puchhe jaane waale sawaal
        </h2>
        <p className="mt-2 text-sm text-cream/55 sm:text-base">
          Everything you wanted to know about {displayName}
        </p>
        <span className="mt-5 block h-[2px] w-16 rounded-full bg-ember/60" aria-hidden />

        <div className="mt-8 space-y-3">
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
      className={`rounded-xl border transition-colors duration-200 ${
        open ? "border-ember/30 bg-night/60" : "border-cream/10 bg-night/30 hover:border-cream/20"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-inset rounded-xl"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-cream sm:text-base">{question}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-cream/50 transition-transform duration-300 ${
            open ? "rotate-180 text-ember" : ""
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
          <p className="px-5 pb-4 text-sm leading-relaxed text-cream/65">{answer}</p>
        </div>
      </div>
    </div>
  );
}
