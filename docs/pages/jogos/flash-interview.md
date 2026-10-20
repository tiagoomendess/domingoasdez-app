# Flash interview

- **Route:** `/flash-interview/{uuid}` (optional `?pin=1234`)
- **Tab:** Jogos
- **Files:** `src/routes/flash-interview/[uuid]/`, `src/lib/server/flash-interview.ts`, `src/lib/flash-interview.ts`

After a game, each club gets a link (by email, sent by the legacy site) to leave a short comment about the game and name who scored its goals. This page is that form. Ports `GameCommentsController`.

Also reached from the game page: a logged-in user whose email matches the team's (or club's) contact email sees a "Flash interview" button there.

## What's on the page

- The competition, both emblems and the final score.
- An intro line naming the club and the game date.
- **Scorers** (only when the club scored): one row per goal with a searchable player Select and a minute field. The options are "Autogolo" (own goal by the opponent), "Jogador em falta" (missing player), then the team's squad with photos.
- **Comment**: a textarea, max 1000 characters, with a "tips" sheet.
- Save button and the deadline, or a "deadline passed" note, in which case everything is read-only.

## How it works

- Access needs the interview's 4-digit PIN:
  - `?pin=` in the URL is checked, saved in an `httpOnly` cookie scoped to this interview, and then **removed from the URL** with a redirect.
  - Without a valid cookie, the visitor is sent to the [PIN page](flash-interview-pin.md).
- The scorer values match the legacy form: `-1` own goal, `0` missing player, otherwise a player id.
- Saving updates or creates one goal row per goal the team scored, plus the comment. On success it redirects back with a "saved" toast.

## Edge cases and pitfalls

- **One deadline for everything.** The comment and the scorers share one deadline, checked before any write. No deadline, or one that can't be read, counts as **closed**, so old links can't edit anything. Saving after the deadline redirects back with a "deadline passed" toast.
- **Scorers must come from the team's squad.** The server only accepts own goal, missing player, or a player in the team's visible squad plus anyone already saved on those goals (they may have moved club since). A crafted request can't put any player id on a goal.
- Only the first N picks are saved and checked, where N is the number of goals the team scored.
- Minutes must be positive integers. Anything else is saved as no minute.
- The comment has its HTML tags stripped after it's cut to 1000 characters (Laravel `Str::limit` + `strip_tags`).
- Players under 18 are shown without a photo (initials only), the same rule as the rest of the public site.
- Emails and comment generation still happen on Laravel. This app only reads and writes the shared tables (`game_comments`, `goals`, `teams`, `clubs`).
- A wrong PIN in the URL goes to the PIN page with the attempted PIN in `?error=`, so the message can show it.
