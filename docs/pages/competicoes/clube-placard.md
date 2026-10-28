# Placard eletrónico do clube (club stadium screen setup)

- **Route:** `/clubes/{club}/placard`
- **Tab:** Competições (under the club page)
- **Files:**
  - Route: `src/routes/clubes/[club=slug]/placard/`
  - Server: `src/lib/server/placard/club-setup.ts`, `src/lib/server/placard/theme.ts`
  - Shared rules: `src/lib/placard.ts` (ad limits, image sniffing, colours)

Where a club sets up how the [stadium screen](../conta/placard.md) looks at its home games, and the ads the controller can show there. The screen always uses the setup of the game's **home** club.

## What's on the page

- **Preview:** a 16:9 frame with a sample match (the club against "Visitante", 2–1, half-time) in the chosen look. Colours update as they're picked, before saving.
- **Cores:** text colour and background colour (`#rrggbb` pickers), "Guardar cores", and "Repor cores" to go back to the default look.
- **Imagem de fundo:** choose, save or remove.
- **Anúncios (n/5):**
  - Each ad has a thumbnail, its duration (a Select of 1–15 s that saves on change), up/down buttons for its place in the rotation, and delete (with a confirmation).
  - Under the list, a form adds an ad (image and duration) while there are fewer than 5.

## How it works

- **Who:** the club's admin (`clubs.admin_user_id`) or anyone with the `admin` permission. Guests go to sign in; anyone else gets a 403. The club page shows the link only to them.
- **Storage:**
  - One row per club in `club_placard_settings` (created on first save), and ads in `club_placard_ads` ordered by `position`.
  - Files go to object storage (`storeFile`, the profile-photo bucket) under `/storage/uploads/placard/`. A replaced or deleted file is removed.
- **Background image:**
  - The browser first cuts it to 16:9 around the centre (at most 1920 wide), so the preview matches.
  - The server cuts it again the same way to exactly 1920×1080 and stores it as a progressive JPEG (quality 80, `sharp`). That way a direct post can't store something else, and the TV downloads little.
  - On the screen it's drawn with `cover`.
- **Ads are stored as uploaded,** not re-encoded, so GIFs stay animated. That's why they're limited:
  - 1 MB at most (checked in the browser too);
  - PNG, JPEG, GIF or WebP, told by the file's first bytes (an SVG or a renamed file is refused);
  - readable by `sharp`.
- **Rotation:** the controller preselects the ad after the last one shown, in `position` order. Moving ads here changes the rotation for the next breaks. Deleting an ad that a screen had preselected falls back to the first ad (`placards.next_ad_id` is set null).
- **Limits** live in `src/lib/placard.ts`: `MAX_ADS` 5, durations 1–15 s, `AD_COOLDOWN_MS` 2 minutes, `AD_MAX_BYTES` 1 MB.

## Edge cases and pitfalls

- **Upload size in production:** adapter-node refuses request bodies over 512 KB by default. `ecosystem.config.cjs` sets `BODY_SIZE_LIMIT=4M`. Without it, adding an ad over about 500 KB fails before the action runs.
- Ads keep their own aspect ratio. Only a 16:9 ad fills a 16:9 screen; others get bands in the screen's background colour. The page says so.
- A club that plays at another club's ground still gets its own look and ads only when it's the home team of the game.
- Screens only refetch their state when its `version` changes, so every change here bumps the version of the screens showing one of the club's home games (`refreshClubScreens`). TVs pick up the new look, and controllers the new ad list, within a poll.
