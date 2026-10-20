# Design (style guide)

- **Route:** `/design`
- **Tab:** none (not linked from the app)
- **Files:** `src/routes/design/` (`+page.svelte`, `sections/`, `sample-data.ts`, `DesignSection.svelte`, `Specimen.svelte`)

A living style guide for [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md). It renders every token and component with sample data: colours, typography, shape and materials, motion, icons, buttons, selection controls, lists, feedback, navigation, the feed cards and the games components.

## Edge cases and pitfalls

- **It skips the AppShell.** `+layout.svelte` renders `/design` bare (no tab bar, no floating buttons from the shell), so the page can show the real chrome as specimens itself.
- It's `noindex` and has no link from the app, but it's still public to anyone who knows the URL.
- It uses `sample-data.ts`, not the database, so it works without a DB connection. That also means it can drift from what real data looks like.
- When you add or change a component, update its section here too. It's the quickest way to check both themes and all states side by side.
