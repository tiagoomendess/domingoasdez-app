# Domingo às Dez — Design System

The visual and interaction language for the new public app, built to deliver what `MIGRATION_PLAN.md` asks for: modern and minimalist, based on Apple's Liquid Glass, light and dark, mobile first, no top or side navigation, and a floating bottom tab bar.

The tokens described here are implemented in `src/routes/layout.css` (Tailwind v4). Components are specified here and will live in `src/lib/components/`.

---

## 1. Principles

1. **Content is solid, chrome is glass.** Translucent "liquid glass" is reserved for the floating navigation layer (tab bar, the two floating buttons, sheets, toasts). Articles, games and lists sit on solid surfaces so they stay readable. Glass never sits on top of glass.
2. **Built for one thumb.** Primary navigation lives at the bottom. Every touch target is at least 44 × 44 px. On phones, important actions go in the lower half of the screen.
3. **Simple first, depth on demand.** Each tab root shows one clear thing. Everything else from the old site is one level deeper: list rows with a chevron, segmented controls inside detail pages, and contextual links (game → club → player).
4. **Live is the loudest thing on screen.** The only saturated, animated colour in the app is the red "live" signal. Everything else is calm: neutral surfaces, one brand blue, and gold used sparingly.
5. **Every string is translated, every surface is themed.** No hard-coded text and no hard-coded colours. Components only use semantic tokens, so light and dark mode come for free.

---

## 2. Foundations

### 2.1 Colour

The brand palette comes from the legacy site: blue `#107db7` / `#0573a6`, gold `#c89d68` / `#be935e`, pitch green `#3b814f`.

**Brand scales** (static, same in both themes): `brand-50…950` (600 = `#107db7`), `gold-300…700`, `pitch-400…600`. Use them only for illustrations, emblem plates or one-off brand moments. UI code should use the semantic tokens below.

**Semantic tokens** (these swap automatically between light and dark):

| Token (Tailwind name)  | Light        | Dark           | Use                                        |
| ---------------------- | ------------ | -------------- | ------------------------------------------ |
| `canvas`               | `#f2f4f7`    | `#08090b`      | Page background                            |
| `surface`              | `#ffffff`    | `#15171b`      | Cards, list groups                         |
| `surface-muted`        | `#eef1f5`    | `#1e2126`      | Inputs and wells inside a card             |
| `ink`                  | `#0b1220`    | `#f3f5f8`      | Primary text                               |
| `ink-secondary`        | `#4f5969`    | `#a8b0bd`      | Supporting text, losing team               |
| `ink-tertiary`         | `#6b7484`    | `#7f8896`      | Metadata, timestamps, placeholders         |
| `line` / `line-strong` | 8% / 14% ink | 8% / 14% white | Hairlines and separators                   |
| `fill` / `fill-strong` | 5% / 9% ink  | 6% / 10% white | Unselected chips, pressed rows             |
| `accent`               | `#107db7`    | `#107db7`      | Filled buttons, selected chips, active tab |
| `accent-fg`            | white        | white          | Text on `accent`                           |
| `accent-text`          | `#0573a6`    | `#5cb6ea`      | Links and tinted text on surfaces          |
| `accent-tint`          | 12% blue     | 16% blue       | Tinted buttons, selection backgrounds      |
| `live` / `live-tint`   | `#d42c2a`    | `#ff5c57`      | Live games only                            |
| `warmup`               | `#b45309`    | `#f59e0b`      | Warm-up state                              |
| `success`              | `#2f7a45`    | `#4fbf74`      | Confirmations (pitch green family)         |
| `warning`              | `#a16207`    | `#eab308`      | Postponed games, warnings                  |
| `danger`               | `#c62828`    | `#ff6b61`      | Errors, destructive actions                |
| `scrim`                | 32% black    | 50% black      | Behind modal sheets                        |

Rules:

- Text contrast targets WCAG AA: 4.5:1 for body text and 3:1 for large text and UI shapes. `ink-tertiary` is the lightest colour allowed for readable text.
- Gold fails contrast as text on white. Use it only as a fill or accent (for example, the leading bar of a poll result or a "featured" marker), never for text.
- Do not use blue to mean "finished". The legacy site did; here, finished games are neutral so that live games stand out.

### 2.2 Typography

Use the **system font stack** (`font-sans`): SF Pro on Apple devices, Segoe UI Variable on Windows, Roboto on Android. It loads instantly, is the most Apple-like option on the web, and already handles optical sizing.

Each style sets size, line height, tracking and weight together (`text-<name>` in Tailwind). Tracking gets tighter as the size grows.

| Style         | Size / leading | Weight | Tracking | Use                                               |
| ------------- | -------------- | ------ | -------- | ------------------------------------------------- |
| `large-title` | 34 / 1.2       | 700    | −0.022em | Page title on each tab root                       |
| `title-1`     | 28 / 1.2       | 700    | −0.02em  | Article and detail page titles                    |
| `title-2`     | 22 / 1.27      | 600    | −0.015em | Section titles                                    |
| `title-3`     | 20 / 1.25      | 600    | −0.01em  | Feed card titles                                  |
| `headline`    | 17 / 1.3       | 600    | −0.005em | Row titles, team names, competition group headers |
| `body`        | 17 / 1.47      | 400    | 0        | Body copy (the base size)                         |
| `callout`     | 16 / 1.4       | 400    | 0        | Excerpts, button labels                           |
| `subhead`     | 15 / 1.35      | 400    | 0        | Secondary row text                                |
| `footnote`    | 13 / 1.38      | 400    | +0.005em | Metadata, form labels                             |
| `caption`     | 12 / 1.33      | 500    | +0.01em  | Status pills, date-rail weekdays                  |
| `tab`         | 11 / 1.1       | 600    | +0.01em  | Tab bar labels only                               |
| `scoreboard`  | 48 / 1         | 700    | −0.03em  | Score on the game detail page                     |

- Scores, times, dates and table numbers always use `tabular-nums`, so digits don't shift when a live score changes.
- Use weight for emphasis, not size. In a finished game, the winning team's name and score are `ink` at weight 600; the loser is `ink-secondary` at weight 400.
- Spacing uses `rem`, so the layout grows with the user's text-size setting.
- **Form fields are never smaller than 16px.** iOS Safari zooms the whole page when you focus a field below 16px. Every text input, textarea, select and editable area uses the `body` size (17px), floored at 16px. `layout.css` enforces this outside Tailwind's layers, so a utility like `text-footnote` on an input has no effect. Don't try to shrink a field; if a compact field is ever needed, make it shorter (less padding), not smaller text.
- **Never stop zoom with the viewport meta.** No `maximum-scale=1` or `user-scalable=no`: on Android they block pinch-to-zoom, which fails WCAG 1.4.4 (resize text). Double-tap zoom is turned off with `touch-action: manipulation` on `<html>` instead, which keeps pinch-to-zoom working.

### 2.3 Spacing and layout

- Tailwind's default 4 px spacing scale. Common steps: 4, 8, 12, 16, 24, 32.
- **Page gutter**: 16 px on phones, 24 px from 768 px wide.
- **Reading width**: 640 px max for feeds and lists (`page-container` utility). Articles and CMS pages: 680 px.
- **Chrome clearance**: pages never hard-code the space under the floating buttons or above the tab bar. `page-container` applies `--content-top` and `--content-bottom`, which are derived from the safe areas and chrome size.

Breakpoints (mobile first):

| Width  | Behaviour                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| < 768  | Single column. Full-width cards.                                                                                                                       |
| ≥ 768  | Wider gutters. Competition and page lists can become 2-column card grids.                                                                              |
| ≥ 1024 | Games show competition groups in a 2-column masonry. The feed stays single column (it's for reading). The tab bar shows icons and labels side by side. |

### 2.4 Shape

Corners are **concentric**: a nested element's radius equals its parent's radius minus the parent's padding, which is the Liquid Glass look.

| Token           | Value   | Use                                                   |
| --------------- | ------- | ----------------------------------------------------- |
| `rounded-full`  | capsule | All chrome, buttons, chips, date pills, status pills  |
| `rounded-sheet` | 32 px   | Bottom sheets and dialogs                             |
| `rounded-card`  | 22 px   | Cards and list groups                                 |
| `rounded-field` | 14 px   | Text fields, segmented control                        |
| `rounded-inner` | 12 px   | Images inside cards (a 22 px card with 10 px padding) |
| `rounded-badge` | 8 px    | Small square badges, logo plates                      |

### 2.5 Materials and depth

Three levels:

1. **Flat**: `canvas`, then `surface` cards on top. In light mode, cards get a hairline `line` border and no shadow. In dark mode, the surface colour alone separates them.
2. **Floating** (`glass` utility): translucent background, 20 px blur with 180% saturation, a bright 1 px top edge (light catching the material), a hairline rim and a soft shadow. Used by the tab bar, the floating buttons, the pull-to-refresh indicator and toasts.
3. **Overlay** (`glass-thick` utility): a more opaque material with stronger blur for large surfaces such as sheets and dialogs. Modal overlays add a `scrim` behind them.

Rules:

- Never put glass on glass. Controls inside a glass surface use `fill` or `accent` backgrounds, not another glass layer.
- No 1 px divider under the floating chrome. Use the `scroll-edge-top` and `scroll-edge-bottom` gradients so content fades softly where it slides under the buttons and tab bar.
- Glass falls back to solid `surface` automatically when `backdrop-filter` is unsupported, when the user prefers reduced transparency, or when they prefer more contrast (which also strengthens the borders). This is already handled in the CSS.

### 2.6 Motion

Motion should feel physical: it responds instantly, can be interrupted, and uses springs for anything the user drags.

| Token         | Value                       | Use                                                                     |
| ------------- | --------------------------- | ----------------------------------------------------------------------- |
| `--dur-press` | 100 ms                      | Press feedback (the `pressable` utility scales to 0.97 on pointer-down) |
| `--dur-fast`  | 160 ms                      | Colour and opacity changes, icon swaps                                  |
| `--dur-base`  | 240 ms                      | Chrome appearing or disappearing, page cross-fades, theme change        |
| `--dur-slow`  | 380 ms                      | Sheets and larger surfaces                                              |
| `ease-fluid`  | `cubic-bezier(.32,.72,0,1)` | Sheets, page slides                                                     |
| `ease-snappy` | `cubic-bezier(.2,.9,.1,1)`  | Press, chips, small UI                                                  |
| `ease-exit`   | `cubic-bezier(.4,0,1,1)`    | Things leaving the screen                                               |

- **Springs** for gestures and anything that can be interrupted (pull-to-refresh, sheet drag, the tab bar selection indicator). Use Svelte's built-in `Spring` from `svelte/motion`, so no extra dependency is needed. Default to no bounce. Add a little bounce only after a flick.
- **Glass materialises.** It arrives with opacity 0→1, scale 0.9→1 and blur, rather than a plain fade.
- **Page transitions** use the View Transitions API through SvelteKit's `onNavigate`. Going deeper slides content in from the right; going back reverses it. Switching tabs cross-fades because tabs are peers. The tab bar and floating buttons have their own `view-transition-name`, so they stay still while pages change.
- **Live score change**: the old digit rolls up and out, the new one rolls in from below, and the row briefly flashes `live-tint` (600 ms).
- **Reduced motion** (`prefers-reduced-motion`): slides and springs become 150 ms cross-fades, there's no overshoot or shake, and the live dot stays solid instead of pulsing.

### 2.7 Iconography

- Use **Phosphor Icons** (`phosphor-svelte`). It has regular and fill weights of the same icon, which matches iOS tab bars (outline when inactive, filled when active) and suits the SF Symbols look. Installed (v3, Svelte 5). Import icons one by one (`phosphor-svelte/lib/HouseIcon`) for fast builds.
- Sizes: 24 px in the tab bar and floating buttons, 20 px inline, 16 px inside pills.
- Icon-only buttons always have a translated `aria-label`.

Tab icons: Home `House`, Games `SoccerBall`, Competitions `Trophy`, Pages `Files`, Account `UserCircle`. When the user is logged in, the Account tab shows their avatar instead.

---

## 3. App shell

```
┌──────────────────────────────────┐
│ (‹)                         (☀)  │  ← two floating glass buttons, no bar
│░░░░░ scroll-edge fade ░░░░░░░░░░░│
│                                  │
│  Large title                     │
│  content scrolls under chrome…   │
│                                  │
│░░░░░ scroll-edge fade ░░░░░░░░░░░│
│  ╭────────────────────────────╮  │
│  │ ⌂     ⚽     🏆     ▤     ◉ │  │  ← floating glass tab bar
│  ╰────────────────────────────╯  │
└──────────────────────────────────┘
```

### 3.1 Floating buttons (the only top-of-page chrome)

- **Back** (top left): 44 px glass circle with a left-chevron icon. Hidden on the five tab roots. It materialises in and out (240 ms) instead of jumping.
  - If the previous history entry is inside the app, it calls `history.back()`.
  - If the user arrived from outside (a shared link), it navigates to the route's **parent**, so it never takes them out of the app. For example, game → `/jogos`, article → `/`, club → `/competicoes`.
- **Theme toggle** (top right): 44 px glass circle. A tap switches light ↔ dark. The sun/moon icon swaps with a rotate and scale (240 ms), and the page cross-fades gently via a view transition so the brightness doesn't jump.
  - By default the app follows the system setting. Once toggled, the choice is saved in a `theme` cookie, which the script in `app.html` reads before paint, so there's no flash.
  - Account → Appearance has three options (Automatic / Light / Dark), so users can go back to following the system.
- Position: `top: safe-top + 12px`, `left/right: 12px`. Both buttons sit above the `scroll-edge-top` fade.

### 3.2 Bottom tab bar

- A floating glass capsule, `bottom: safe-bottom + 12px`, centred, width `min(100% − 24px, 480px)`, 64 px tall.
- Five items, each with an icon and a label: **Início, Jogos, Competições, Páginas, Conta**.
- The active item gets a filled icon in `accent-text`, plus a "droplet" pill in `accent-tint` behind it. The droplet slides between tabs (`ease-fluid`, retargeting from its current position if tapped mid-slide) rather than jumping.
- Tapping the active tab: on a sub-page, it returns to that tab's root; on the root, it scrolls to the top.
- At ≥ 1024 px, the icon and label sit side by side, and the bar grows to fit (it reads like a dock).
- Labels: always one line. French and Portuguese labels are long ("Compétitions", "Competições"), so below 360 px wide the bar uses short label keys (`nav.competitions_short`, e.g. "Provas"). Check all three languages at 320 px.
- Markup: `<nav aria-label>` with links, `aria-current="page"` on the active one.
- Optional, later: the bar compacts (labels hide, height 64→52) while scrolling down the feed and expands when scrolling up, as in iOS 26.

### 3.3 Navigation model

Each tab owns a stack of pages, like iOS. The **active tab is the one the user last tapped**, and it stays active as they go deeper. For example, opening a club from a game keeps "Jogos" highlighted. On a fresh page load (deep link), the tab and the back button's parent come from this URL map:

| Tab         | Root           | Also owns                                                                                                     |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| Início      | `/`            | `/noticias/**`, `/sondagens/**`                                                                               |
| Jogos       | `/jogos`       | Legacy `/hoje` and `/direto` (redirect here), game pages                                                      |
| Competições | `/competicoes` | Competition pages and stats, `/clubes/**`, `/jogadores/**`, `/tecnicos/**`, `/arbitros/**`, `/transferencias` |
| Páginas     | `/p`           | `/p/{slug}`, legal pages (privacy, terms, GDPR)                                                               |
| Conta       | `/conta`       | Login, register, profile editing, account deletion                                                            |

Game URLs live under `/competicoes/...` in the legacy site, so a deep link to a game highlights Competições. Once a user taps a tab, the "last tapped tab" rule takes over.

---

## 4. Components

Primitives are in `src/lib/components/ui/`, the shell in `.../shell/`, and domain components in `.../feed/` and `.../games/`. All of them use semantic tokens only.

### 4.1 Primitives

| Component               | Spec                                                                                                                                                                                                                                                                                                           | States                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**              | Capsule. Heights 44 (md) and 52 (lg). Label `callout` 600. Variants: `filled` (accent), `tinted` (accent-tint + accent-text), `outline` (surface + line-strong ring), `plain` (text only), `destructive` (danger).                                                                                           | Rest, pressed (scale 0.97), focus ring, disabled (40% opacity), loading (spinner replaces the label, width stays fixed)                                                     |
| **IconButton**          | 44 px circle. Variants: `glass` (chrome), `fill`, `plain`. Requires `aria-label`.                                                                                                                                                                                                                              | Same as Button                                                                                                                                                              |
| **Chip**                | Capsule, 36 px tall, `subhead` 500, optional 16 px leading icon. Unselected: `fill` + `ink`. Selected: `accent` + `accent-fg`.                                                                                                                                                                                 | Rest, pressed, selected, rejected (see ChipGroup)                                                                                                                           |
| **ChipGroup**           | One horizontal row only (`rail` utility): it swipes horizontally and never wraps. Multi-select toggles (`aria-pressed`) in a `role="group"`. Option `minSelected` (Home uses 1).                                                                                                                               | Deselecting the last selected chip is refused: the chip shakes 3 px (`animate-reject-shake`) with a 10 ms vibration where supported. Under reduced motion there's no shake. |
| **SegmentedControl**    | A `fill` track (`rounded-field`) with a `surface` thumb that slides with a spring. For 2–4 peer views inside a page.                                                                                                                                                                                           | Selected, pressed, disabled                                                                                                                                                 |
| **ListGroup / ListRow** | Inset grouped list (iOS Settings style) in a `surface` card. Row is at least 52 px: leading slot (icon or logo), title (`body`), optional subtitle (`footnote`, ink-secondary), trailing slot (chevron, value, switch, badge). Separators are inset to start after the leading slot.                           | Rest, pressed (`fill` background), disabled, destructive (danger title, no chevron)                                                                                         |
| **TextField**           | `surface-muted` fill, `rounded-field`, 52 px tall, label above (`footnote` 600), helper or error text below. Input text is always `body` (17px), so iOS never zooms on focus. No floating labels.                                                                                                              | Rest, focus (2 px accent ring), invalid (danger ring and message, checked as the user types after the first blur), disabled                                                 |
| **Switch**              | 51 × 31 iOS-style. On = `success`.                                                                                                                                                                                                                                                                             | On, off, disabled                                                                                                                                                           |
| **StatusPill**          | Capsule, `caption`. Variants: `live` (pulsing dot + live colour), `warmup`, `finished` (neutral), `postponed` (warning), `open`, `closed`.                                                                                                                                                                     | —                                                                                                                                                                           |
| **Emblem**              | Club or competition logo on a white plate (`rounded-badge`, or a circle for clubs) with a hairline ring. The image uses `object-contain`, and the plate stays white in both themes because many legacy logos are JPEGs with white backgrounds or dark marks. Sizes 24 / 32 / 40 / 72. Missing image: initials. | Loading (`fill` placeholder), error (initials)                                                                                                                              |
| **Avatar**              | Circular user photo, sizes 28 / 40 / 72, initials fallback.                                                                                                                                                                                                                                                    | —                                                                                                                                                                           |
| **Skeleton**            | `fill` blocks shaped like the content. A gentle opacity pulse with no shimmer, and static under reduced motion.                                                                                                                                                                                                | —                                                                                                                                                                           |
| **EmptyState**          | Centred 48 px icon in `ink-tertiary`, a `headline` title, `subhead` text, and an optional action.                                                                                                                                                                                                              | —                                                                                                                                                                           |
| **Sheet**               | Native `<dialog>` (focus trap and Esc for free). Phones: a bottom sheet with `glass-thick`, `rounded-sheet` top corners, a grab handle, drag-to-dismiss with velocity and a spring, and a `scrim`. ≥ 768 px: a centred dialog, max 440 px wide.                                                                | Opening, open, dragging, closing                                                                                                                                            |
| **Toast**               | A `glass` capsule just above the tab bar, `subhead` text, optional icon. Disappears after 3 s; swipe down to dismiss. Announced through an `aria-live="polite"` region.                                                                                                                                        | Info, success, error                                                                                                                                                        |

### 4.2 Shell

- **AppShell**: renders `{children}` inside `page-container`, the two scroll-edge fades, the floating buttons, the tab bar and the toast region. It also owns the view-transition wiring.
- **BackButton**, **ThemeToggle**, **TabBar**: as described in section 3.
- **PullToRefresh**: wraps a scrollable page (Home only for now).
  - It only engages when the page is already at the top and the user drags down.
  - The content follows the finger with rubber-band resistance. A 36 px glass circle with an arrow appears at the top centre, between the two floating buttons.
  - At 72 px of pull the arrow flips (with a tiny vibration where supported). Releasing past that point keeps the indicator spinning while `refreshAll()` runs, then springs back. Releasing before it springs back without refreshing.
  - Because `overscroll-behavior-y: none` is set on `<html>`, the browser's own pull-to-refresh won't fire at the same time.

### 4.3 Feed (Home)

The feed must be easy to extend, so item types are registered rather than hard-coded:

```ts
// src/lib/components/feed/registry.ts
type FeedItem = { type: string; id: number; date: string; data: unknown };

export const feedTypes = {
	article: { component: ArticleCard, labelKey: 'feed.articles', icon: Newspaper },
	poll: { component: PollCard, labelKey: 'feed.polls', icon: ChartBar }
	// future types: add a card component + one entry here; the chips come from this list
};
```

The chips on Home are generated from `feedTypes`, so a new content type gets a chip automatically.

- **ArticleCard**: a `surface` card with a 16:9 cover (`rounded-inner`), then the title (`title-3`, up to 3 lines), excerpt (`callout`, ink-secondary, 2 lines), and a meta line (`footnote`, ink-tertiary): relative date such as "há 2 h", plus category or competition if available. The whole card is one link to the article.
- **PollCard**: a card with a small "Sondagem" label and a StatusPill (open, "ends in 2 days" / closed), the question (`title-3`), and a preview:
  - Open poll: the first 3 answers as quiet rows, plus a "Votar" tinted button.
  - Results visible: up to 3 horizontal result bars. The leading answer's bar is gold, the others `fill-strong`. Percentages use `tabular-nums`.
  - Voted, results not yet public: "Resultados a partir de {date}", following the legacy rule.
  - The whole card links to the poll page, which shows voting or results based on the same legacy logic (closed, voted, show-results-after).

### 4.4 Games

- **DateRail**: a horizontal `rail` of date pills, each 52 × 60 px: weekday (`caption`, ink-tertiary) above the day number (`headline`). Today shows **"Hoje"** instead of a weekday. Selected = `accent` fill. On load, Today is centred. Previous dates are on the left and next dates on the right. More days load as the user nears either end (±14 days at a time).
  - A small dot under a date means it has games; a red dot means games are live now (if this is cheap to query).
  - A calendar pill pinned at the right end opens a **Sheet** with a month picker, to jump far (the legacy date picker).
  - Selecting a date updates `?date=YYYY-MM-DD` (the legacy parameter) with a client-side navigation and shows skeleton rows while it loads.
- **MatchGroup**: a `surface` card per competition. The header has an Emblem (32), the competition or group name (`headline`) and the season (`footnote`), plus a chevron linking to the competition. Below it are the MatchRows, separated by inset hairlines.
- **MatchRow** uses a stacked layout so long club names don't need the legacy 3-letter abbreviations:

```
┌───────┬──────────────────────────────────────┐
│ 15:00 │ (◉) Sporting Clube de Braga B     2  │
│       │ (◉) Vitória Sport Clube           1  │
└───────┴──────────────────────────────────────┘
```

- The status column is 52 px wide:
  - Scheduled: the kick-off time.
  - Warm-up: "Aquec." in `warmup`.
  - Live: a pulsing red dot and "Ao vivo".
  - Finished: "Fim".
  - Postponed: "Adiado" in `warning`.
- Each team line: Emblem (24), the club name (`body`, truncated with an ellipsis), and the score on the right (`headline`, `tabular-nums`). The winner is emphasised as described in section 2.2.
- Penalties: a `footnote` line under the teams, e.g. "4–3 g.p.".
- The whole row is one link to the game. It's at least 64 px tall.
- Times always display in `Europe/Lisbon`, matching the legacy site.
- **LiveSection**: only shown on Today when games are live. A section header "A decorrer" with a live dot and count, then MatchGroups by competition. Live games are excluded from the "Jogos do dia" groups below, as the plan requires. While the page is visible, it refreshes every 30 s.
- **Empty day**: an EmptyState ("Sem jogos neste dia"). When the legacy "closest game" exists, it offers an action button: "Próximo jogo: 12 out" → that date.

---

## 5. Page patterns

Every tab root starts with a `large-title` heading in the content (it scrolls away, since there's no navbar). The tab bar handles "where am I".

### Início `/`

Brand wordmark as the title → ChipGroup (Artigos, Sondagens; at least one selected; selection kept in `?tipos=`) → a feed of ArticleCards and PollCards ordered by date, 12 px apart → infinite scroll with a date cursor (load the next page about 800 px before the end; skeleton cards while loading) → PullToRefresh.

### Jogos `/jogos`

"Jogos" title → DateRail → (Today only, if any) LiveSection → "Jogos do dia" MatchGroups in competition priority order → empty state when there are no games.

### Competições `/competicoes`

"Competições" title → one ListGroup in priority order. Each row: Emblem (40) on the left, the competition name, the current season as subtitle, and a chevron. ≥ 768 px: a 2-column card grid.
Competition page: a header (Emblem 72, name, season), then a **SegmentedControl** for the deeper views from the old site: **Classificação · Jogos · Estatísticas**. Clubs, players, coaches and referees are reached by tapping into these (contextual navigation). Transfers is a ListRow at the bottom of the Competições root.

### Páginas `/p`

"Páginas" title → a ListGroup of visible CMS pages → a second group "Legal" (Privacy, Terms, GDPR). A page detail renders the CMS HTML in `prose rich-text` at 680 px width.

### Conta `/conta`

- **Logged out**: a centred hero (logo, "Entra na tua conta", one line about the benefits) → a filled "Entrar" button and a tinted "Criar conta" button → the social logins the legacy site supports, as outlined buttons → a Preferences group (Appearance, Language), so these work without an account. Login and register are their own pages (with a back button) so password managers and validation errors behave well.
- **Logged in**: a profile card (Avatar 72, name, email, "Editar foto") → ListGroups in Settings style, where each row pushes a small focused page instead of one long form like the old `/perfil/editar`:
  - **Perfil**: name and the other profile fields.
  - **Preferências**: Appearance, Language, Notifications.
  - **Conta e privacidade**: Change password, Download my data, Delete account (destructive; uses the legacy request/verify flow).
  - **Backoffice**: Dashboard, shown only with the `dashboard` permission. It opens the legacy backoffice.
  - **Terminar sessão**: a destructive row, with a confirmation sheet.

### Second-level patterns (how the rest of the old site stays reachable)

1. A **ListRow with a chevron** pushes a sub-page.
2. A **SegmentedControl** switches between peer views inside a detail page.
3. A **section header with "Ver tudo"** opens the full list.
4. **Contextual links**: game → club emblem → club → player.

---

## 6. Content and translations

- Languages: **pt-PT (default)**, en, fr. Use **Paraglide JS** (the official SvelteKit i18n add-on: `npx sv add paraglide`). It's type-safe, tree-shaken, and `<html lang>` follows the active locale.
- Every user-facing string is a message key, including `aria-label`s, empty states, status pills and toasts. Lint for raw strings in components.
- Dates, times, numbers and relative times use `Intl` with the active locale. Game times are always in `Europe/Lisbon`.
- Design for text that's about 30% longer (French). Truncate only club names and article titles, always with an ellipsis, and the full text should be available to screen readers.
- Voice: short, direct, second person singular ("Entra na tua conta"). Labels are specific ("Jogos do dia", not "Lista").

---

## 7. Accessibility checklist

- Contrast: AA for all text, 3:1 for UI shapes and focus rings. Check both themes.
- Visible focus on everything focusable (2 px `accent` outline, 2 px offset; it follows the corner radius).
- Touch targets at least 44 × 44 px. Chips are 36 px tall but get extra hit area so they still meet 44.
- No accidental zoom: form fields are at least 16px (enforced globally), double-tap zoom is off, and pinch-to-zoom always stays available.
- Semantics: tab bar = `nav` + `aria-current`, date rail = `nav` of links with `aria-current="date"`, chips = `aria-pressed`, sheets = `<dialog>`, live score changes are **not** announced (too noisy), and toasts are announced politely.
- Respect `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` and the user's text size. The CSS already handles the material fallbacks.
- Images: article covers use `alt=""` because the title is right below and is the link text; emblems use the club name as alt (or `alt=""` when the name is printed next to it).

---

## 8. Implementation plan

**Already done:**

- `src/routes/layout.css`: all tokens (colour for both themes, type scale, radii, easing, durations, chrome geometry), the `dark` variant, the `glass` / `glass-thick` materials with accessibility fallbacks, and the `scroll-edge-*`, `page-container`, `rail`, `pressable` and `rich-text` utilities, and the 16px floor on form fields that prevents iOS focus zoom.
- `src/app.html`: `lang="pt-PT"`, `viewport-fit=cover` for the safe areas, and the pre-paint theme script.
- `src/lib/components/ui/`: Button, IconButton, Chip, ChipGroup, SegmentedControl, Switch, TextField, ListGroup, ListRow, SectionHeader, StatusPill, Emblem, Avatar, Skeleton, EmptyState, Sheet, Toast.
- `src/lib/components/shell/`: TabBar, BackButton, ThemeToggle (the AppShell that wires them into `+layout.svelte` is not built yet).
- `src/lib/components/games/`: DateRail, MatchGroup, MatchRow. `src/lib/components/feed/`: ArticleCard, PollCard.
- `src/lib/theme.ts` (theme cookie and switching), `src/lib/format.ts` (dates and times, always in `Europe/Lisbon` for games), `src/lib/motion.ts` (materialise and score-roll transitions).
- `src/lib/messages.ts`: a pt-PT stand-in with Paraglide's `m.key()` call shape, so adding Paraglide only means swapping the import.
- **`/design`**: a living style guide that renders every token and component above with sample data, plus the real floating chrome. Not linked from the app and marked `noindex`.

**Still to build, in order:**

1. Shell: AppShell in `+layout.svelte` (route → tab map, last-tapped tab, back fallbacks), view transitions, Paraglide.
2. Home: feed registry, PullToRefresh, and real data.
3. Games: the month picker inside the date sheet, 30 s live refresh, and real data.
4. Competitions and Pages: the competition page with SegmentedControl, CMS page rendering.
5. Account: logged-out hero, auth pages, Settings-style management.
