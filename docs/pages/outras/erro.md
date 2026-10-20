# Error page

- **Route:** any URL that fails (`src/routes/+error.svelte`), plus the static fallback `src/error.html`
- **Tab:** whatever tab owns the URL that failed

Shown when a load function throws (`error(404)`, an exception, a 500…). It keeps the app shell, so the tab bar still works.

## What's on the page

- An icon, the status code, a title and a short text. There are three versions:
  - **404**: "page not found" copy with a compass icon;
  - **other 4xx**: the generic 400 copy;
  - **5xx**: the server-error copy, plus a "Tentar novamente" button that reloads the same URL.
- A button back to the home page.

## Edge cases and pitfalls

- Every 404 looks the same. The specific messages that load functions pass (`m.game_not_found()`, `m.club_not_found()`…) are **not** shown, because the page only reads `page.status`. They only end up in logs.
- The retry button uses `data-sveltekit-reload`, so it does a full page load, not a client navigation. That also clears any broken client state.
- The page is `noindex`.
- `src/error.html` is SvelteKit's last-resort page for errors that happen before the layout can render. It has none of the app's styling or translations.
