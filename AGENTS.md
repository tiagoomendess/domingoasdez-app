## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, sveltekit-adapter, drizzle, ai-tools

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Project Context

**Project rules**: @docs/PROJECT.md
**Design System**: @docs/DESIGN_SYSTEM.md

Before building a feature, check `docs/known-gaps.md` for legacy features and design-system items that aren't built yet. It isn't loaded automatically.

## Page Documentation

Every page of the app has a short doc in `docs/pages/<tab>/`: what it does, how it works, and its edge cases and pitfalls. `docs/README.md` is the index (route → doc file) and lists the rules every page shares. Redirects, JSON endpoints and legacy hand-offs are in `docs/routes-without-pages.md`.

These docs are not loaded automatically. Read them only when you need them:

- Before changing a route under `src/routes/`, or the server helpers it uses, read that page's doc. Find it in the index in `docs/README.md` (or by route in `docs/pages/`) instead of opening the whole folder.
- When your change alters what a doc describes (behaviour, rules, edge cases), update that doc in the same change.
- When you add a page, add its doc and a row in the `docs/README.md` index, following the template at the end of that file.
