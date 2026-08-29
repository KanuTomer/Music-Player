import newSalon from "@/assets/new_salon.webp";
import newCorporateMajdoor from "@/assets/new_corporatemajdoor.webp";
import newBus from "@/assets/new_bus.webp";
import newChaiKiTapri from "@/assets/new_chaiimage.webp";
import newRajMistri from "@/assets/new_rajmistri.webp";
import newSainikDhaba from "@/assets/sanik dhaba.webp";
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
  "raat-ki-bus",
  "chai-ki-tapri",
  "raj-mistri",
  "sainik-dhaba",
  "doordarshan-shaam",
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

  "raat-ki-bus": {
    slug: "raat-ki-bus",
    displayName: "Raat Ki Bus",
    logoSrc: newBus,
    about: {
      title: "Raat Ki Bus",
      subtitle: "The night bus that goes nowhere and everywhere",
      paragraphs: [
        "Board the overnight bus from one small town to another — the one with the curtained windows, the reclining seats that don't fully recline, and the driver who thinks he's in a Fast & Furious movie. This is Raat Ki Bus.",
        "The engine rumbles beneath you, the highway stretches endlessly ahead, and the small TV at the front plays old Hindi songs through crackling speakers. Fellow passengers drift in and out of sleep while you stare out at the passing darkness.",
        "There's something deeply peaceful about being in motion at night — the world outside is a blur of headlights and highway dhabas. Press play, put on your headphones, and let this bus take you somewhere familiar yet far away.",
      ],
    },
    faq: [
      {
        question: "What sounds will I hear?",
        answer:
          "The deep rumble of a bus engine, occasional horn blares, the whoosh of passing vehicles, and the gentle rattle of windows. It's a full night-bus soundscape layered under retro Hindi music.",
      },
      {
        question: "Is this good for sleeping?",
        answer:
          "Many listeners use Raat Ki Bus as a sleep aid. The steady engine drone and gentle motion sounds are deeply soothing. The music fades into the background, creating a lullaby-like experience.",
      },
      {
        question: "Does the lighting change?",
        answer:
          "Raat Ki Bus keeps its dark, nighttime atmosphere regardless of real-world time. It's always night on this bus — that's the whole point.",
      },
      {
        question: "Which route is this bus on?",
        answer:
          "It's every route and no route — the eternal highway between Patna and Ranchi, between Ahmedabad and Udaipur, between any two small towns connected by a rumbling Volvo. The destination is the journey itself.",
      },
    ],
  },

  "chai-ki-tapri": {
    slug: "chai-ki-tapri",
    displayName: "Chai Ki Tapri",
    logoSrc: newChaiKiTapri,
    about: {
      title: "Chai Ki Tapri",
      subtitle: "Where cutting chai cuts through everything",
      paragraphs: [
        "Pull up a plastic stool at the corner tapri — the one wedged between the paan shop and the photocopy centre. The chaiwala knows your order by heart: cutting chai, thoda zyada cheeni. This is Chai Ki Tapri.",
        "The clinking of glass cups, the hiss of milk hitting the pan, the loud conversations about politics, films, and neighbourhood gossip — it's the most democratic space in India. Billionaires and auto-wallahs share the same bench here.",
        "We've recreated that tapri magic — the ambient sounds, the soundtrack of the streets, and the Hindi songs that every tapri radio has been playing since forever. Grab your virtual cup and take a break.",
      ],
    },
    faq: [
      {
        question: "What makes this different from a café ambience?",
        answer:
          "A tapri is NOT a café. There's no latte art here, no jazz playlist. This is street-side chai with maximum flavour — both in the cup and in the soundscape. Think rattling cups, auto-rickshaw horns, and neighbourhood banter.",
      },
      {
        question: "Is the music street-friendly?",
        answer:
          "The playlist mirrors what you'd actually hear at a tapri — popular Hindi film songs, old and new, played at a volume that's perfect background for conversation. Nothing pretentious, everything catchy.",
      },
      {
        question: "Can I use this for studying?",
        answer:
          "Many students swear by tapri ambience for studying — the white noise of the street helps with concentration. It's like sitting at a chai stall near your college campus during exam season.",
      },
      {
        question: "How much is the chai?",
        answer:
          "₹10 for a cutting, ₹15 for a full. We accept UPI, cash, and the promise of paying tomorrow. But since this is virtual, it's on the house. Infinite refills.",
      },
    ],
  },

  "raj-mistri": {
    slug: "raj-mistri",
    displayName: "Raj Mistri",
    logoSrc: newRajMistri,
    about: {
      title: "Raj Mistri",
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

  "doordarshan-shaam": {
    slug: "doordarshan-shaam",
    displayName: "Door Darshan",
    logoSrc: newDoordarshan,
    about: {
      title: "Door Darshan",
      subtitle: "When TV was one channel and life was simple",
      paragraphs: [
        "Tune in to Doordarshan — India's original and only TV channel for decades. The one with the test card that haunted your mornings, the news reader who was more trusted than your family, and the ad breaks that were more entertaining than the shows.",
        "The gentle static hum of a CRT television, the familiar tune of the national anthem at sign-off, the crackling audio of a Chitrahaar episode — Door Darshan is a time machine to an India where the whole family gathered around one television set.",
        "This room recreates the warm, nostalgic glow of a Doordarshan evening — complete with the music that defined an entire generation's taste. No remote control fights here — just press play and let the broadcast begin.",
      ],
    },
    faq: [
      {
        question: "What's with the scanlines effect?",
        answer:
          "We've added CRT television scanlines to the visual experience — those horizontal lines you'd see on old TVs. It's a deliberate visual choice to make you feel like you're watching through a 1990s BPL television set.",
      },
      {
        question: "Is this actually Doordarshan content?",
        answer:
          "No — we're not affiliated with Doordarshan. This is an ambient room inspired by the experience of watching DD in the 80s and 90s. The music is curated to match that era's vibe — Chitrahaar, Rangoli, and film songs of the golden age.",
      },
      {
        question: "What time period does the music cover?",
        answer:
          "Primarily the 70s through the 90s — the golden era of Doordarshan. You'll hear the songs that played during Chitrahaar, the tunes from sponsored programs, and the classics that every Indian family hummed together.",
      },
      {
        question: "Why does this make me emotional?",
        answer:
          "Because Doordarshan wasn't just television — it was a shared national experience. Every Indian above a certain age has the same memories: watching the same shows, hearing the same songs, at the same time. This room taps into that collective nostalgia.",
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
