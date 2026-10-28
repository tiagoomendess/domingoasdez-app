# Placard (stadium screen, TV)

- **Route:** `/placard`
- **Tab:** none. The page is bare, with no AppShell (`bare` in `src/routes/+layout.svelte`).
- **Files:**
  - Route: `src/routes/placard/`
  - Components: `src/lib/components/placard/` (`PlacardFrame`, `scenes.ts`, `PairingScene`, `MatchScene`, `overlays.ts`, `AdOverlay`)
  - Client: `src/lib/placard-poll.svelte.ts`
  - Shared logic: `src/lib/placard.ts`
  - Server: `src/lib/server/placard/`
  - API: `src/routes/api/placard/estado/`

The screen a club puts on a TV at the stadium. It shows a QR code until a phone pairs it with a game, then it shows the emblems, names, clock and score. It replaces the standalone `react-scoreboard` / `scoreboard-api` projects, which kept everything in memory.

## What's on the page

- **Pairing scene:**
  - The QR code (drawn by the server as SVG with `uqr`, so nothing goes to a third party).
  - The 6-character code, and "or open …/placard/ligar and type the code".
- **Match scene:**
  - Both emblems and club names.
  - The clock (`MM:SS`, minutes uncapped, hidden until kick-off) and the score, which rolls when it changes.
  - "Intervalo" at half-time.
- A small "Sem ligação" dot after 3 failed polls. The last state stays on screen.
- A fullscreen button (top right). It hides, together with the cursor, after 3 s without mouse movement.

## How it works

- **Identity.** Each TV browser has one `placards` row for good:
  - The `dad_placard` cookie (httpOnly, 400 days) holds a random token, and the row stores its sha256.
  - The page load only _reads_ the cookie. The first poll of `GET /api/placard/estado` creates the row. Creating it on page load would give a row to every crawler.
  - New screens are limited to 10 per IP per hour.
- **Pairing code.**
  - Six characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, unique in the table, valid for 10 minutes.
  - The poll renews it 30 s before it expires, so a phone never scans a dying code. The row stays the same; only the code changes.
- **Polling.**
  - Every second, never overlapping, with `?v=<version>`.
  - While the version is unchanged the answer is just `{ version, serverNow, unchanged }`.
  - The full state (with the QR) is sent only when something changed.
- **Clock.**
  - Stored in server time: `clock_elapsed_ms`, plus the time since `clock_running_since` while it runs.
  - The page estimates the offset between its own clock and the server's from `serverNow` and half the round trip, and draws every frame in server time.
  - The old screen used the phone's clock against the TV's, so the two drifted, or froze when the TV was behind.
- **Scenes and overlays.** Two layers, each from a registry:
  - The **scene** is what the screen shows underneath: `pairing` or `match` (`placardScenes` in `scenes.ts`).
  - An **overlay** shows on top of the match for a while, then disappears on its own (`placardOverlays` in `overlays.ts`). The only one so far is `ad`.
  - The match keeps running underneath an overlay; the clock doesn't stop.
  - Overlays are stored on the screen row as `overlay_type`, `overlay_payload`, `overlay_started_at` and `overlay_ends_at`. The server stops sending an overlay once it has ended, and the TV hides it by its own clock, even between polls.
  - Substitutions or messages: add a member to `PlacardOverlay`, a case in `currentOverlay()` (`store.ts`), a component in `overlays.ts`, and a server action.
- **Ad break** (`AdOverlay`):
  - The image is drawn as large as fits (`object-fit: contain`), centred both ways, over the theme's background colour. An ad with the screen's shape fills it.
  - A thin bar in the accent colour at the bottom runs out until the ad ends.
- **Theme** (`PlacardFrame`): the home club's look from [its setup page](../competicoes/clube-placard.md).
  - Text colour, background colour, and a 16:9 background image drawn with `background-size: cover`, so it's upscaled if needed and never letterboxed.
  - Secondary text is the text colour faded; the accent is the text colour.
  - Over an image, text gets a soft shadow.
  - Without a game, or when the club has no setup, the default dark look is used.
- **Wake lock.** The page asks for a screen wake lock, again whenever the tab becomes visible, and again on the fullscreen tap (a user gesture).
- **Auto-release.** There's no cron, so each poll releases a screen back to pairing when:
  - its game is gone, or
  - nobody touched it for 6 h, or
  - its game is finished and nobody touched it for 1 h.

## Edge cases and pitfalls

- **Don't open `/placard` on the controller's phone.** That makes the phone a screen of its own. The controller has no "see the screen" link for this reason; its mini scoreboard shows the same thing.
- Layout is sized with container query units (`cqmin`, `cqw`, `cqh`) on a `container-type: size` root, so it fits 16:9, ultrawide and portrait. A portrait screen stacks the emblems above the score.
- Clearing the TV's cookies creates a new screen with a new code. The old row is deleted by the admin's `cleanup-placards` job after 30 days unseen.
- `last_seen_at` is written at most once a minute. The admin shows "online" for 2 minutes after it.
- The old `placard.domingoasdez.com` should 301 here. QR codes printed by the old screens (`/scoreboards/{code}/admin`) don't work any more.
