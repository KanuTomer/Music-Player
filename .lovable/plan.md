# Sainik Dhaba — Milestone 1: Shell, Design System, Home, First Room

This spec is large enough that shipping it in one go would produce a shallow version of everything. The plan follows your own build order (§12) and delivers Step 1 fully polished first, then continues in later passes.

## What Milestone 1 delivers

1. **Design system** — warm sun-bleached palette (cream, mustard, terracotta, deep teal, ink, muted) as semantic tokens, paper-grain texture, soft shadows, signage-style display font + Devanagari support + Inter body, gentle Framer Motion, reduced-motion respected.
2. **App shell, strict single-viewport** — `100dvh`, no scroll, no rubber-band, no scrollbars. Top bar: wordmark, live listener count, IST clock, sign-in slot. Bottom mini-player when a room is playing.
3. **Home / Room selector** — fixed grid that fills exactly one viewport (mobile 2×3, desktop 3×3), category chips that swap the page, page arrows + dot indicators, swipe-snap paging. "✨ Generate your own room" pinned as first tile. Skeleton / empty / error states.
4. **One hand-built room** — Rail Yatra (रेल यात्रा): full-viewport illustrated scene with idle motion, hidden YouTube player driving a custom control cluster (play/pause, next, track chip with artist·year + Spotify/YT Music links), autoplay-blocked one-tap gate, auto-skip on blocked tracks, floating in-character one-liners, IST dayparting, radio-dial room switcher.
5. **Reactions (Taali)** — realtime floating 👏 ❤️ 🔥 with presence counts per room, haptics on mobile.

Scenes, tracks, one-liners and palettes are data-driven from the start, so later rooms and regions are content, not code.

## Backend

I'll enable Lovable Cloud (database, auth, realtime, storage, server functions) and create `scenes`, `tracks`, `oneliners`, `sound_stems`, `saved_rooms`, `generated_rooms`, `chat_messages`, `reactions`, `sponsors` with RLS and public-read policies for content tables. Milestone 1 seeds Rail Yatra plus 8 more scene cards (barbershop, night bus, government office, Doordarshan, chaya kada, para adda, Punjabi dhaba, Ganpati pandal) with real tracks and one-liners so Home is full immediately.

## Technical notes

- Routing is TanStack Router (this stack's fixed router), not React Router — same route structure: `/`, `/room/$slug`, `/generate`, `/my-dhaba`, `/blog`.
- Presence, reactions and chat use Cloud Realtime channels per room; reactions are fire-and-forget.
- Scene art is generated illustration assets in the project, warm halftone style, lazy-loaded.
- Room pages get per-route bilingual SEO metadata + OG tags from the start.

## Later milestones (unchanged from §12)

2. Ephemeral chat + AI moderation + in-character AI host
3. AI micro-space generator + permalinks + share cards
4. Accounts + My Dhaba + sound mixer + focus timer
5. Regional packs + Sounds of Home diaspora mixer
6. Sponsored rooms + analytics dashboard + embed widget + blog/SEO
7. Support surface

## Open question

Ambient stem loops (rain, fan, cooker whistle) and licensed music files can't be authored by me. Music playback uses YouTube IDs, which works. For stems in Milestone 4, you'll need to upload loop files — or I can synthesize simple loops with the Web Audio API as placeholders.
