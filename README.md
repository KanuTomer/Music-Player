# Sainik Dhaba

Build Prompt — Sainik Dhaba: India's Ambient Nostalgia Platform

Paste this into Lovable. It's a complete product + UX specification. Build in the order given in §14. Keep every user-facing surface simple and tactile — put the complexity in the engine, never in the UI.

1. Product vision

Build Sainik Dhaba, a browser-first ambient-nostalgia platform that recreates the sound and mood of hyper-specific Indian everyday spaces (a 90s barbershop, a night bus, a railway platform, a government office). A user picks a "room," presses play, and is instantly transported by a continuous themed soundtrack, illustrated scene, and in-character chatter — and can hang out there with other people via live chat. Beyond hand-built rooms, an AI generator lets anyone type any micro-space ("1998 Kanpur cyber cafe") and get a room built on the fly. The emotional core is recognition — "yeh toh bilkul sahi hai" — delivered in one tap and instantly screenshottable.

One-liner: An always-on radio for the places India grew up in — that you can share, remix, and sit in together.

2. Users & personas

Nostalgia scroller (primary): 18–35, arrives from a Reel, wants an instant hit and to screenshot/share. Must reach "sound + feeling" within 2 taps, no signup.

Background listener: leaves a room on for hours while working; wants a calm, non-intrusive player + focus timer.

Diaspora user: NRI, emotionally driven, willing to pay; wants "sounds of home" and region-specific depth.

Brand marketer (B2B): wants a co-branded room as a campaign; needs it brand-safe with analytics.

3. Tech stack (use these defaults)

Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui + lucide-react icons + Framer Motion for micro-interactions.

Backend / data: Supabase — Postgres (data), Auth (optional social + email magic link), Realtime (live presence + chat), Storage (scene art, audio stems, share-card images), Edge Functions (AI calls, moderation, share-card rendering).

Audio: YouTube IFrame Player API for music playback (hidden player driving a custom UI); Web Audio API / HTML5 <audio> for layerable ambient stems (loops hosted in Storage).

AI: LLM via a Supabase Edge Function (keys server-side only) for the room generator, the in-character AI host, and chat moderation.

State/data-fetching: React Query. Routing: React Router. PWA: installable, offline shell.

Mobile-first, fully responsive. Assume most traffic is mobile portrait.

4. Design system (spec precisely — the aesthetic is the product)

Mood: warm, sun-bleached, tactile 90s/2000s small-town India — hand-painted shop signage, enamel boards, cassette culture, worn paper. Cozy, not kitsch.

Color palette (CSS variables):

--bg-cream: #F4E9D6 (paper/off-white base)

--mustard: #E5A100 (primary accent — signboard yellow)

--terracotta: #C1440E (secondary accent / CTAs)

--teal-deep: #0E5E63 (cool contrast — enamel green-blue)

--ink: #2B2118 (near-black warm text)

--muted: #8A7A63 (secondary text)

Dark rooms (night bus, highway) invert to warm-dark: --bg-night: #1A1410 with mustard glow. Each scene overrides accents with its own 3-color sub-palette (see per-room specs).

Typography:

Display/headings: a warm, slightly condensed signage-style face (e.g., a bold slab/display Google Font) — evokes hand-painted boards. Support Devanagari (Noto Sans/Serif Devanagari) for bilingual labels; every room title shows both scripts (e.g., "रेल यात्रा / Rail Yatra").

Body/UI: clean, highly readable sans (Inter or similar).

Texture & depth: subtle paper-grain overlay on cream surfaces; soft halftone on illustrations; optional CRT scanline overlay for the Doordarshan room. Rounded, soft-shadow cards; nothing flat-corporate.

Motion (Framer Motion, gentle): idle scene animation (ceiling fan rotating, steam rising from chai, headlights passing); a physical radio-tuning dial on scene-switch; floating emoji on reactions; a soft "needle drop" transition on play. Respect prefers-reduced-motion.

Tone of voice: warm, playful, desi, affectionate — never mocking. Bilingual micro-copy.

Accessibility: WCAG AA contrast, keyboard-navigable player and chat, captions/labels on all controls, focus states, reduced-motion support.

5. Global layout / app shell

★ HARD RULE — strict single-viewport, ZERO scroll (consumer app). Every consumer screen fits within one viewport: no vertical scroll, no horizontal scroll, no scrollbars anywhere. It should feel like flipping TV channels / turning a radio dial, not browsing a page.

Technical: html, body, #root { height:100dvh; overflow:hidden; overscroll-behavior:none; }; use 100dvh/svh (not 100vh) so mobile browser chrome never causes overflow; disable pull-to-refresh and rubber-band bounce; lock touch-action where needed. Test on iOS Safari + Android Chrome specifically.

Overflow strategy (never a scrollbar): content that exceeds the screen is handled by pagination (arrow + dots), swappable panels/tabs, carousels, overlays/bottom-sheets, or fade-cycling — never by scrolling. Panels and drawers overlay the screen; they never push the layout taller.

Responsive rule: the layout re-flows to fit each breakpoint — it never grows past the viewport. On very small screens, reduce items-per-view rather than stacking into a scroll.

Two documented exceptions (see Features 10 & 13): the B2B analytics dashboard and the long-form blog are inherently long content. Keep them out of the no-scroll shell — the blog opens as a separate reading context, and the dashboard uses tabbed panels (or is the one place internal scroll is tolerated). The core app — rooms, generator, chat, library — is strictly no-scroll.

Top bar: Sainik Dhaba wordmark (left); live global listener count + IST clock (center/right); auth avatar or "Sign in" (right). Minimal.

Persistent mini-player (bottom, mobile) once a room is playing: room name, play/pause, and a chevron to expand the full room.

Primary nav: Home (rooms) · Generate · My Dhaba (saved) · About/Blog.

Empty/loading/error states required on every data surface (see §12).

6. Data model (Supabase — core tables)

scenes — id, slug, title_en, title_hi, description, region, category (tier1/regional/diaspora/sponsored), palette(json), art_url, is_live, sponsor_id(nullable), chat_mode(enum: reactions_only|open|hosted|moderated), dayparts(json).

tracks — id, scene_id, title, artist, year, youtube_id, spotify_url, ytmusic_url, daypart_tag, order.

oneliners — id, scene_id, text_en, text_hi, weight.

sound_stems — id, scene_id(nullable for mixer), name, loop_url, default_volume, category.

users — Supabase auth + profile (display_name, avatar, region_pref, lang_pref).

saved_rooms — id, user_id, scene_id or generated_room_id, custom_config(json).

generated_rooms — id, prompt, creator_user_id(nullable), palette, art_url, playlist(json), oneliners(json), permalink_slug, remix_of(nullable), created_at.

chat_messages — id, room_id, room_type, session_display_name, text, created_at, expires_at (ephemeral; TTL cleanup), is_ai_host(bool). (Ephemeral: purge on TTL; no long-term archive.)

reactions — id, room_id, emoji, created_at (fire-and-forget).

presence — handled via Supabase Realtime presence channels per room (not a table).

sponsors — id, name, logo_url, brand_palette, campaign_config, analytics settings.

sponsor_analytics — id, sponsor_id, metric, value, ts (or view over events).

7. FEATURE SPECS

Feature 1 — Home / Room Selector

User story: As a visitor, I want to see all available rooms at a glance so I can tap into a vibe in one action. Functional requirements: Grid of scene cards, grouped by category (Featured / Everyday / Regional / Sounds of Home / Brand). Each card = illustrated art thumbnail, bilingual title, one-line hook, live listeners-in-this-room badge, category tag. Tapping a card opens the Room and autoplays. UI & layout (no-scroll): a fixed grid that fills exactly one viewport — e.g. mobile 2×3 (6 rooms/page), desktop 3×3. Category chips sit as a fixed top row that swaps the grid's page, not a scroller. Excess rooms are reached via page arrows + dot indicators (or horizontal swipe between pages, snap-locked — not free horizontal scroll). Cards are large, image-forward, tactile (paper texture, soft shadow, slight tilt on hover). A prominent "✨ Generate your own room" card is pinned as the first tile. States: loading = skeleton cards filling the grid; empty (no rooms) = friendly illustration + copy; error = retry. Acceptance: From a cold load on mobile, a user can start audio in ≤2 taps; live per-room listener counts update in realtime.

Feature 2 — The Room (core experience)

User story: As a listener, I want an immersive, low-effort space where the sound and scene carry me, with the player out of the way. Functional requirements: Full-viewport illustrated scene with subtle idle animation. Continuous themed audio auto-plays (respecting browser autoplay rules — show a one-tap "Press play" gate if blocked). In-character one-liners surface periodically as floating captions. Dayparting: the active playlist/one-liner set switches by IST hour per the scene's dayparts. Optional sound gag button per scene (e.g., bus "horn"). Scene applies its own palette + textures. UI & layout: Scene art fills screen; a slim, translucent control cluster docks at bottom: play/pause, next, current-track chip (title · artist · year) that expands to show credits + Spotify/YT Music outbound links. Top-right: reactions/taali button, chat toggle, share button, room switcher (radio-dial). Everything else is quiet. States & interactions: autoplay-blocked gate; buffering indicator on track load; one-liners fade in/out non-blocking; switching rooms triggers the tuning-dial transition; "now playing" persists in mini-player if user navigates away. Acceptance: Audio runs continuously for hours without memory bloat; daypart switches correctly by IST; UI never obscures the scene for more than the control cluster.

Feature 3 — Audio Engine & Playback

User story: As a user, I want reliable, gapless-feeling background audio with the songs credited and linkable. Functional requirements: Hidden YouTube IFrame player driving a custom skin (no YouTube chrome). Shuffle within the active daypart; auto-advance; skip; play/pause; seek not required for MVP. Show track metadata + outbound Spotify/YT Music links (revenue-neutral, keeps it legal). Handle unavailable/region-blocked videos by auto-skipping. Acceptance: No dead air on a blocked/failed track; metadata always matches the audio; links open in a new tab.

Feature 4 — Live Chat / Shared Room ★

User story: As a listener, I want to feel I'm hanging out with others in this room, not alone. Build in 3 layers (ship simplest first):

Reactions ("Taali"): a tap sends a floating emoji (taali 👏, dil ❤️, fire 🔥) visible in realtime to everyone in the room. No text, no moderation. Haptic feedback on mobile.

Ephemeral chat: no signup required (auto-assign a fun desi display name, editable). Room-scoped realtime messages that auto-expire (TTL, e.g., 30–60 min) — no permanent history. Slide-up chat panel over the scene; unread badge on the chat toggle.

AI moderation + AI host (server-side): every message passes an LLM moderation Edge Function (block hate/spam/NSFW before broadcast). An in-character AI host (the barber / TT / babu, matched to the scene) periodically posts on-theme lines and responds to lulls so an empty room never feels dead. Config / brand-safety: each scene has chat_mode (reactions_only | open | hosted | moderated). Sponsored rooms default to hosted or moderated — never raw open chat. UI & layout (no-scroll): chat is an overlay (bottom sheet on mobile, right rail on desktop) that sits over the scene without resizing it. The message area is a fixed-height "ticker" showing only the last ~N messages — new ones slide in at the bottom while the oldest fade out at the top; there is no scrollback and no scrollbar (ephemeral chat means no history to browse, so this is fine). Messages compact, name-colored; AI-host messages visually tagged (subtle badge/avatar). Input pinned at the bottom of the overlay with send + emoji. States: empty chat shows AI-host welcome line, not a blank box; connection-lost banner with auto-reconnect; rate-limit gentle toast on spam. Acceptance: Reactions and messages appear for all present users in <1s; moderated content never broadcasts; ephemeral messages purge on TTL; presence count is accurate.

Feature 5 — AI Micro-Space Generator ★ (hero / moat)

User story: As a user, I want to type any Indian micro-space and instantly get a playable, shareable room. Functional requirements: Prompt input ("Describe a place… e.g., 1998 Kanpur cyber cafe"). On submit, an Edge Function returns: a fitting playlist (mapped to available tracks / era tags), a set of in-character one-liners, a palette, and scene art (generated image or composed from asset kit). Result opens as a real Room with a shareable permalink (/room/<slug>) and a "Remix this room" action (re-runs with tweaks; stores remix_of). UI & layout: a single clean prompt screen with example chips; a delightful generating animation (radio tuning + "building your dhaba…" desi loading lines); then transition straight into the generated Room. Generated rooms are saveable to My Dhaba. States: generating (progress + playful copy); low-confidence result → offer "regenerate" or nudge prompt; safety filter on prompts. Acceptance: Any reasonable prompt yields a coherent, on-tone playable room with a permalink that loads for anyone; remix produces a distinct variant.

Feature 6 — Custom Room Builder + Sound Mixer + Focus Timer

User story: As a background listener, I want to tune my own ambient mix and run a focus session. Functional requirements: Layerable sound stems (e.g., rain, fan, chatter, cooker whistle) each with a volume slider, over a chosen music bed; save as a custom room (requires light auth). Focus timer / Pomodoro overlay (set duration, gentle chime, session count) that keeps audio running. UI & layout: a "mixer" drawer with labeled slider rows + mute toggles; timer as a small, unobtrusive floating widget. Save → names the room, adds to My Dhaba. Acceptance: stems loop seamlessly and mix independently; saved config restores exactly; timer persists across navigation.

Feature 7 — Accounts & My Dhaba (saved library)

User story: As a returning user, I want my saved and remixed rooms in one place. Functional requirements: Optional auth (email magic link + one social provider). Profile: display name, avatar, region/language prefs. My Dhaba = a paginated grid (same fixed one-viewport grid + page arrows/dots as Home — no scroll) of saved scenes, generated rooms, and custom mixes. Everything works logged-out except saving. Acceptance: No feature is gated behind signup except saving; prefs (region/lang) apply across the app.

Feature 8 — Regional Depth Layer

User story: As a user from any Indian region, I want rooms that sound like my home, in my language. Functional requirements: Region selector + language toggle (affects UI labels, one-liners, and default scene set). Regional scene packs (Tamil barbershop, Bengali para adda, Punjabi dhaba, Malayali chaya kada, Marathi Ganpati pandal…) with native tracks, native-language one-liners, region-specific art. Content is data-driven so new regions are added without code. UI: region/language picker in nav and onboarding; regional rooms surfaced first when a region is set. Acceptance: Selecting a region re-orders Home and localizes labels + one-liners; adding a new region = data only.

Feature 9 — Bharat ki Subah / "Sounds of Home" (diaspora mixer)

User story: As an NRI, I want to recreate the exact sound of an Indian morning. Functional requirements: A specialized stem mixer (temple bell, azaan, pressure-cooker whistle, jhaadu, doodhwala, sabzi-wala, rain on tin roof) with sliders + save + share. Positioned as an emotional, premium-leaning surface. Acceptance: stems are high-quality loops; the saved/shared mix reproduces identically for the recipient.

Feature 10 — Brand-Sponsored Spaces + Analytics (B2B)

User story (brand): As a marketer, I want a co-branded, brand-safe room and to see its performance. Functional requirements: Sponsored scene type with brand palette, logo placement (tasteful, in-scene), product-integrated ambience/one-liners, sponsored playlist. chat_mode forced to hosted/moderated. A brand analytics dashboard (auth-gated, role=sponsor): visitors, avg session length, reactions, chat sentiment summary, shares, region breakdown, time series. UI: sponsored rooms look native to Sainik Dhaba, not like ads. The dashboard is one of the two no-scroll exceptions: keep it outside the consumer shell and organize it into tabbed panels (Overview / Engagement / Regions / Chat) so each tab fits a viewport; clean, chart-driven (use a chart lib), exportable. Acceptance: sponsored room is brand-safe by construction; dashboard reflects real events for that scene only.

Feature 11 — Auto-Generated Share Cards

User story: As a user, I want a beautiful, Reel-ready image/link when I share a room. Functional requirements: Every room/generated-room produces an OG image + share card (Edge Function renders scene art + room title + "Listening on Sainik Dhaba" + QR/permalink). Native share sheet on mobile; copy-link on desktop. Rich unfurls on WhatsApp/Instagram/Threads. Acceptance: shared links unfurl with a correct, on-brand preview image; the card names the specific room.

Feature 12 — Embeddable Widget / Format API (B2B surface)

User story: As a partner/blogger, I want to embed a Sainik Dhaba room on my site. Functional requirements: An <iframe>/script embed that renders a compact player for a chosen room; a minimal public API to list rooms and fetch a room's manifest. Config: room slug, size, theme. Acceptance: embed plays independently of the host page; API returns valid room manifests.

Feature 13 — Editorial / Blog + Programmatic SEO

User story: As a searcher, I want to land on Sainik Dhaba for nostalgia queries. Functional requirements: Lightweight CMS-backed blog (nostalgia essays, "story behind each room," focus-and-music pieces). This long-form reading content is the second no-scroll exception — it lives in a separate reading context (its own route/layout, outside the app shell) where normal vertical scroll is allowed; do not force articles into a single viewport. Programmatic SEO: every scene and generated room gets its own indexable page with proper meta/OG, bilingual titles, and structured data. Sitemap auto-updates. Acceptance: each room/blog page is server-renderable/prerendered with unique meta; sitemap includes generated rooms.

Feature 14 — Support / Donation (light)

User story: As a fan, I want to support the project. Functional requirements: A tasteful "support" surface with UPI/QR + a note; never blocks content, no ads. (Real revenue is sponsorship — this is goodwill only.) Acceptance: donation surface is dismissible and never interrupts playback.

Appendix — Satellite one-tap toys (SEPARATE mini-apps, not part of this build)

Build these as standalone single-page micro-sites (separate Lovable projects), each linking back to Sainik Dhaba:

Mummy ka Mood — one button → an AI-generated Indian-mom taana in-tone; screenshot/share.

Serial Break — one red button → saas-bahu "dhan-ta-ta-taann" dramatic zoom sting.

Good Morning Uncle — one tap → a boomer WhatsApp-forward card (flower + shayari + slightly-wrong "fact") to screenshot and send. Each: dead-simple, one screen, one action, instantly shareable, footer link to Sainik Dhaba. Do not merge into the main app — different mechanic.

8. Non-functional requirements

Layout: strict single-viewport, no scroll anywhere in the consumer app (see §5) — no scrollbars, no rubber-band bounce; use 100dvh/svh; verify on iOS Safari + Android Chrome. Only the blog and the B2B dashboard are exempt.

Performance: first meaningful paint fast on 3G mobile; audio memory-stable over multi-hour sessions; lazy-load scene art.

Realtime: presence + chat + reactions via Supabase Realtime; graceful reconnect.

Security: all AI + moderation keys in Edge Functions only; RLS on all tables; sponsor dashboard role-gated.

Privacy: ephemeral chat truly purges; no PII required to use core app.

i18n: bilingual (Latin + Devanagari) baseline; region packs extend languages via data.

Accessibility: WCAG AA; keyboard + screen-reader support on player and chat; reduced-motion.

SEO: SSR/prerender room + blog pages; OG/Twitter cards; sitemap.

PWA: installable, offline shell, "add to home screen" prompt.

9. Global states & error handling (apply everywhere)

Every data surface implements: loading (branded skeletons + playful desi copy), empty (illustration + guidance), error (clear message + retry), offline (banner + cached shell). Autoplay-blocked → one-tap gate. Rate-limits → gentle toasts, never hard walls.

10. Component inventory (for reuse)

SceneCard, RoomShell, ControlCluster, TrackChip, OneLinerCaption, ReactionButton + FloatingEmojiLayer, ChatPanel + MessageRow + AIHostBadge, PresenceCounter, ISTClock, RadioDialSwitcher, GeneratorPrompt + GeneratingAnimation, MixerDrawer + StemSlider, FocusTimer, RegionLangPicker, ShareSheet, SponsorBadge, AnalyticsDashboard, EmbedPlayer.

11. Acceptance criteria (product-level)

Cold visitor reaches sound + feeling in ≤2 taps, no signup.

Live presence, reactions, and chat work across multiple devices in the same room in realtime.

A typed prompt produces a coherent, shareable, playable generated room with a working permalink.

Sponsored rooms are brand-safe by construction (no raw open chat) and report analytics.

No scrollbar appears on any consumer screen at any supported breakpoint (mobile + desktop); overflow is handled by pagination/carousels/overlays/fade-cycling only. (Blog + dashboard exempt.)

The app is beautiful, warm, tactile, bilingual, and mobile-first — it feels like Sainik Dhaba, not a template.

12. Build order (scaffold in this sequence)

App shell + design system + Home/Room selector + one hand-built room (Feature 2/3) with reactions (Feature 4.1).

Ephemeral chat + presence + AI moderation + AI host (Feature 4.2–4.3).

AI Micro-Space Generator + permalinks + share cards (Features 5, 11).

Accounts + My Dhaba + Custom mixer + Focus timer (Features 6, 7).

Regional layer + Diaspora mixer (Features 8, 9).

Sponsored spaces + analytics + embed + blog/SEO (Features 10, 12, 13).

Support surface (Feature 14). Satellites = separate projects.

Keep it simple on the surface, rich in the engine. Make it feel like home. EOF

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/94293711-1dd4-40a0-bdf7-9fe849ff05d7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
