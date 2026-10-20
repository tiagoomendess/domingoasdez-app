# Demo pages

- **Routes:** `/demo`, `/demo/playwright`
- **Tab:** none
- **Files:** `src/routes/demo/+page.svelte`, `src/routes/demo/playwright/+page.svelte`, `src/routes/demo/playwright/page.svelte.e2e.ts`

Leftovers from the `sv create` scaffold. `/demo` is a single link to `/demo/playwright`, which is the page the example Playwright test (`page.svelte.e2e.ts`) checks.

## Edge cases and pitfalls

- They aren't part of the product but are still deployed and reachable, inside the normal app shell.
- Deleting them also removes the only e2e test, so replace it with a real one (for example, the home feed or `/jogos`) at the same time.
