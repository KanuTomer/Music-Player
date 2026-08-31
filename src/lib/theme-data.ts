import newSalon from "@/assets/new_salon.webp";
import newCorporateMajdoor from "@/assets/new_corporatemajdoor.webp";
import newBus from "@/assets/newdrivernew.webp";
import newBartanTime from "@/assets/new_bartantime.webp";
import newRajMistri from "@/assets/new_rajmistri.webp";
import newSainikDhaba from "@/assets/newsanik.webp";
import newDoordarshan from "@/assets/new_doordarshan.webp";

export type ThemeFAQItem = {
  question: string;
  answer: string;
};

export type ThemeAboutData = {
  title: string;
  subtitle: string;
  paragraphs: string[];
};

export type ThemeInfo = {
  slug: string;
  displayName: string;
  logoSrc: string;
  about: ThemeAboutData;
  faq: ThemeFAQItem[];
};

/** The only 7 slugs we surface in the UI. */
export const ALLOWED_SLUGS = [
  "nai-ki-dukaan",
  "corporate-majdoor",
  "bus-driver",
  "bartan-time",
  "raj-mistri",
  "sainik-dhaba",
  "papa-ke-gaane",
] as const;

export type AllowedSlug = (typeof ALLOWED_SLUGS)[number];

export const themeMap: Record<AllowedSlug, ThemeInfo> = {
  "nai-ki-dukaan": {
    slug: "nai-ki-dukaan",
    displayName: "Deluxe Salon",
    logoSrc: newSalon,
    about: {
      title: "Welcome to Deluxe Salon",
      subtitle: "Where every haircut comes with a story",
      paragraphs: [
        "Step inside the neighbourhood Deluxe Salon — the one with the spinning barber pole, the cracked mirror, and the radio that never stops. This is where uncles debate cricket scores while getting their weekly trim, where Bollywood posters from the 90s still guard the walls.",
        "The buzz of the trimmer, the splash of aftershave, the creak of the revolving chair — every sound here is a memory. We've captured the soul of India's small-town barbershop, the place where everyone knows your name and your preferred parting.",
        "Sit back, relax, and let the old Hindi songs wash over you while the chai boy makes his rounds. No appointment needed — just press play.",
      ],
    },
    faq: [
      {
        question: "What kind of music plays in Deluxe Salon?",
        answer:
          "A curated mix of classic Bollywood from the 80s and 90s — the kind you'd hear on a dusty radio perched above the mirror. Think Kishore Kumar, Lata Mangeshkar, and the occasional Mohammad Rafi deep cut.",
      },
      {
        question: "Is there actual barber shop ambience?",
        answer:
          "Yes! You'll hear the gentle buzz of trimmers, the snip of scissors, and the background hum of a ceiling fan. It's designed to feel like you're sitting in that chair, waiting your turn.",
      },
      {
        question: "Can I listen while working?",
        answer:
          "Absolutely. The Deluxe Salon vibe is perfect for focus work — the ambient sounds create a warm, familiar cocoon without being distracting. Many listeners use it as their daily work companion.",
      },
      {
        question: "Why 'Deluxe' Salon?",
        answer:
          "Every small-town salon in India calls itself 'Deluxe' — it's aspirational, charming, and slightly exaggerated. That's exactly the energy we wanted to capture. Premium vibes, neighbourhood prices.",
      },
    ],
  },

  "corporate-majdoor": {
    slug: "corporate-majdoor",
    displayName: "Corporate Majdoor",
    logoSrc: newCorporateMajdoor,
    about: {
      title: "Corporate Majdoor",
      subtitle: "The daily grind, but make it aesthetic",
      paragraphs: [
        "Welcome to the cubicle jungle — where Excel sheets never end, chai breaks are sacred, and someone is always on a 'quick sync'. Corporate Majdoor is an ode to every office worker who has survived Monday morning meetings and Friday evening deadlines.",
        "The hum of the AC, the distant tapping of keyboards, the muffled ring of a desk phone — we've bottled the essence of the Indian corporate office. But instead of TPS reports, you get a killer soundtrack of Hindi songs that make the 9-to-6 bearable.",
        "Whether you're actually in office or working from your bedroom pretending to be, this room brings the familiar comfort of a shared workspace. Log in, plug in your headphones, and let's pretend that last email can wait.",
      ],
    },
    faq: [
      {
        question: "Is this actually music for working?",
        answer:
          "Yes — the playlist is curated for focused work. The ambient office sounds provide a steady, non-distracting backdrop, and the music is paced to keep you productive without making you want to dance on your desk. Usually.",
      },
      {
        question: "What's the vibe — serious or funny?",
        answer:
          "A bit of both. The music is genuinely good for working, but the in-character one-liners and chatter lean into the humour of corporate life in India. Think of it as your most relatable colleague sitting next to you.",
      },
      {
        question: "Can I share this with my team?",
        answer:
          "Please do. Hit the share button in the room and send the link to your team Slack. Misery loves company, and so does ambient office music.",
      },
      {
        question: "Why is it called 'Majdoor'?",
        answer:
          "Because every corporate employee secretly knows they're a labourer — just with an ID card and an air-conditioned sweatshop. It's an affectionate term that every Indian office-goer relates to.",
      },
    ],
  },

  "bus-driver": {
    slug: "bus-driver",
    displayName: "Bus Driver",
    logoSrc: newBus,
    about: {
      title: "Bus Driver",
      subtitle: "Long routes, open roads, and the dashboard radio",
      paragraphs: [
        "Take the driver's seat on a long intercity route, with the engine humming below and highway signs glowing beyond the windscreen.",
        "The dashboard radio keeps the cabin company through late-night tea stops, open roads, and the steady rhythm of another kilometre passing.",
        "This preview uses the existing bus footage while the final Bus Driver visual package is being prepared.",
      ],
    },
    faq: [
      {
        question: "What is the Bus Driver Jagah?",
        answer:
          "It is a music-first room inspired by long Indian bus routes, dashboard radios, and the quiet focus of driving through the night.",
      },
      {
        question: "Is this the final room artwork?",
        answer:
          "Not yet. The current bus imagery is a temporary preview and will be replaced when the final team assets arrive.",
      },
      {
        question: "How many songs are in the queue?",
        answer:
          "The launch queue contains 25 curated YouTube tracks in a fixed database-backed order with a random starting point.",
      },
      {
        question: "Can I switch Jagahs without stopping playback?",
        answer:
          "Yes. Open Jagah Explorer and choose another room; the player keeps the transition within the same listening session.",
      },
    ],
  },

  "bartan-time": {
    slug: "bartan-time",
    displayName: "Bartan Time",
    logoSrc: newBartanTime,
    about: {
      title: "Bartan Time",
      subtitle: "Steel ki khanak, running water, and the kitchen radio",
      paragraphs: [
        "Dinner is over, the sink is full, and the kitchen radio is still playing. Bartan Time turns the familiar rhythm of washing up into a listening room.",
        "Steel plates, running water, and songs between every scrub give this Jagah its everyday character.",
      ],
    },
    faq: [
      {
        question: "What is the Bartan Time Jagah?",
        answer:
          "It is a music-first room inspired by the late-night kitchen routine of washing steel plates while the radio keeps playing.",
      },
      {
        question: "Is this the final room artwork?",
        answer:
          "The background image has been updated to the final Bartan Time scene, while the background video preview is still being prepared.",
      },
      {
        question: "How many songs are in the queue?",
        answer: "The launch queue contains 25 curated YouTube tracks stored in Supabase.",
      },
      {
        question: "Does Ambience change the sound?",
        answer:
          "Ambience is still a preview control. Its level is remembered during the session but does not mix additional audio yet.",
      },
    ],
  },

  "raj-mistri": {
    slug: "raj-mistri",
    displayName: "Raju Mistri",
    logoSrc: newRajMistri,
    about: {
      title: "Raju Mistri",
      subtitle: "Building dreams, one brick at a time",
      paragraphs: [
        "Welcome to the construction site — where cement dust dances in the sunlight and the radio competes with the clang of hammers. Raj Mistri is the room dedicated to India's builders, the men who construct our cities while singing along to the radio.",
        "The rhythmic tapping of a mason's trowel, the distant whir of a concrete mixer, the shout of instructions across scaffolding — these are the sounds that build India. And through it all, the ever-present transistor radio keeps the spirits high.",
        "This room is for anyone who finds beauty in the raw, honest labour of construction — or who simply wants a gritty, energetic backdrop of Hindi songs and ambient work sounds. Put on your hard hat (optional) and press play.",
      ],
    },
    faq: [
      {
        question: "What's the ambience like?",
        answer:
          "Think open-air construction site — hammer strikes, brick scraping, the occasional thud of materials being moved, and a transistor radio playing full volume. It's rough, real, and oddly satisfying.",
      },
      {
        question: "Why would I want construction sounds?",
        answer:
          "There's a surprising category of listeners who find industrial and construction sounds deeply focusing. The rhythmic, repetitive nature of these sounds creates a productive flow state. Plus, the music slaps.",
      },
      {
        question: "What kind of music plays here?",
        answer:
          "High-energy Hindi songs — the kind that construction workers actually blast on site. Think 90s hits, Govinda numbers, and the occasional bhajan during the morning shift. The playlist has serious range.",
      },
      {
        question: "Who is Raj Mistri?",
        answer:
          "Raj Mistri isn't a name — it's a title. 'Raj' (mason) and 'Mistri' (master craftsman) — it's the Indian term for the head mason on a construction site. This room celebrates their craft and their soundtrack.",
      },
    ],
  },

  "sainik-dhaba": {
    slug: "sainik-dhaba",
    displayName: "Sainik Dhaba",
    logoSrc: newSainikDhaba,
    about: {
      title: "Sainik Dhaba",
      subtitle: "Highway soul food for the ears",
      paragraphs: [
        "Park your truck, stretch your legs, and walk into Sainik Dhaba — the highway pit stop with charpais under the neem tree, a tandoor glowing orange, and a radio that's been playing since 1987. This is where long-haul truckers, travelling families, and hungry souls converge.",
        "The sizzle of butter on a hot tawa, the clang of steel plates, the low murmur of fellow travellers sharing road stories — Sainik Dhaba is more than food. It's the heartbeat of the Indian highway, a place where strangers become temporary family.",
        "We've captured that magic — the ambient sounds of a bustling dhaba, the warmth of the tandoor, and the timeless Hindi songs that make every meal taste better. No menu card needed — just press play and let the music serve you.",
      ],
    },
    faq: [
      {
        question: "Why is it called 'Sainik' Dhaba?",
        answer:
          "Across Indian highways, countless dhabas are named 'Sainik' (soldier) — a mark of pride, patriotism, and the rough-and-ready spirit of the road. Our Sainik Dhaba honours that tradition and the millions of highway kitchens that fuel the nation.",
      },
      {
        question: "What does the music sound like?",
        answer:
          "Classic highway dhaba music — a mix of old Hindi film songs, Punjabi tracks, and the occasional devotional number that plays at dawn. It's the kind of music that sounds better with dal tadka in front of you.",
      },
      {
        question: "Is this the main theme of the app?",
        answer:
          "Sainik Dhaba is the flagship room and the namesake of the entire platform. It was the first room we built, and it represents the soul of what we're creating — familiar Indian spaces turned into ambient listening experiences.",
      },
      {
        question: "Can I eat actual food here?",
        answer:
          "Unfortunately, no. But we guarantee the ambience will make you hungry. We recommend pairing this room with actual chai and paratha for the full immersive experience. Butter extra.",
      },
    ],
  },

  "papa-ke-gaane": {
    slug: "papa-ke-gaane",
    displayName: "Papa Ke Gaane",
    logoSrc: newDoordarshan,
    about: {
      title: "Papa Ke Gaane",
      subtitle: "Sunday cleaning, an old cassette, and Papa's fixed playlist",
      paragraphs: [
        "A slow Sunday, folded newspapers, old speakers, and the songs Papa never skips. This Jagah is built around the family playlist that somehow became everyone's memory.",
        "The launch queue brings together familiar classics and 90s favourites in a single 25-song set.",
        "This preview borrows the current Doordarshan room imagery while the final Papa Ke Gaane visual package is being prepared.",
      ],
    },
    faq: [
      {
        question: "What is Papa Ke Gaane?",
        answer:
          "It is a nostalgia-led room for familiar family favourites, old cassettes, Sunday routines, and songs passed from one generation to another.",
      },
      {
        question: "Is this the final room artwork?",
        answer:
          "Not yet. The current television-room visual is a temporary preview and will be replaced by the final team assets.",
      },
      {
        question: "How many songs are in the queue?",
        answer:
          "The launch queue contains exactly 25 curated songs backed by canonical database metadata and verified YouTube sources.",
      },
      {
        question: "Will the queue survive a Jagah switch?",
        answer:
          "Each Jagah keeps a stable queue for its current browser session, and playback continues through the normal room-switch transition.",
      },
    ],
  },
};

/** Quick lookup: is this slug one of our 7 themes? */
export function isAllowedSlug(slug: string): slug is AllowedSlug {
  return (ALLOWED_SLUGS as readonly string[]).includes(slug);
}

/** Get theme info by slug, or null if not one of the 7. */
export function getThemeInfo(slug: string): ThemeInfo | null {
  if (!isAllowedSlug(slug)) return null;
  return themeMap[slug];
}

/** Get the background logo for a scene slug. */
export function getThemeLogo(slug: string): string | null {
  const info = getThemeInfo(slug);
  return info?.logoSrc ?? null;
}
